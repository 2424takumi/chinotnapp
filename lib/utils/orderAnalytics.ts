/**
 * Order Analytics Utilities
 *
 * ## Purpose
 * Calculate statistics and prepare data for order visualization
 *
 * ## Features
 * - Time series analysis (daily, weekly, monthly)
 * - Status distribution calculation
 * - Customer ranking analysis
 * - Product popularity analysis
 */

import type { Database } from '@/lib/types/database';

type Order = Database['public']['Tables']['orders']['Row'];

interface OrderWithItems extends Order {
  order_items?: Array<{
    quantity: number;
    unit_price: number;
    product_variants_v2?: {
      display_name: string;
    } | null;
  }>;
}

// ========================================
// Type Definitions
// ========================================

export interface TimeSeriesData {
  date: string;
  count: number;
  amount: number;
}

export interface StatusDistribution {
  status: string;
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface CustomerRanking {
  customer_id: string | null;
  customer_name: string;
  order_count: number;
  total_amount: number;
}

export interface ProductRanking {
  product_name: string;
  quantity: number;
  order_count: number;
}

export interface OrderStatistics {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  pendingOrders: number;
  inProductionOrders: number;
  completedOrders: number;
}

// ========================================
// Time Series Analysis
// ========================================

/**
 * Group orders by date and calculate daily statistics
 */
export function getDailyTimeSeries(orders: Order[]): TimeSeriesData[] {
  const dailyMap = new Map<string, { count: number; amount: number }>();

  orders.forEach((order) => {
    const date = order.order_date;
    const existing = dailyMap.get(date) || { count: 0, amount: 0 };

    dailyMap.set(date, {
      count: existing.count + 1,
      amount: existing.amount + (order.total_amount || 0),
    });
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group orders by week and calculate weekly statistics
 */
export function getWeeklyTimeSeries(orders: Order[]): TimeSeriesData[] {
  const weeklyMap = new Map<string, { count: number; amount: number }>();

  orders.forEach((order) => {
    const date = new Date(order.order_date);
    // Get Monday of the week
    const monday = new Date(date);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const weekKey = monday.toISOString().split('T')[0];

    const existing = weeklyMap.get(weekKey) || { count: 0, amount: 0 };

    weeklyMap.set(weekKey, {
      count: existing.count + 1,
      amount: existing.amount + (order.total_amount || 0),
    });
  });

  return Array.from(weeklyMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group orders by month and calculate monthly statistics
 */
export function getMonthlyTimeSeries(orders: Order[]): TimeSeriesData[] {
  const monthlyMap = new Map<string, { count: number; amount: number }>();

  orders.forEach((order) => {
    const monthKey = order.order_date.substring(0, 7); // YYYY-MM

    const existing = monthlyMap.get(monthKey) || { count: 0, amount: 0 };

    monthlyMap.set(monthKey, {
      count: existing.count + 1,
      amount: existing.amount + (order.total_amount || 0),
    });
  });

  return Array.from(monthlyMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ========================================
// Status Distribution
// ========================================

const STATUS_CONFIG = {
  pending: { label: '受注', color: '#F59E0B' },
  in_production: { label: '製作中', color: '#3B82F6' },
  completed: { label: '納品完了', color: '#10B981' },
  cancelled: { label: 'キャンセル', color: '#EF4444' },
};

/**
 * Calculate order distribution by status
 */
export function getStatusDistribution(orders: Order[]): StatusDistribution[] {
  const statusMap = new Map<string, { count: number; amount: number }>();

  orders.forEach((order) => {
    const status = order.status || 'pending';
    const existing = statusMap.get(status) || { count: 0, amount: 0 };

    statusMap.set(status, {
      count: existing.count + 1,
      amount: existing.amount + (order.total_amount || 0),
    });
  });

  return Array.from(statusMap.entries()).map(([status, data]) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      color: '#6B7280',
    };

    return {
      status,
      label: config.label,
      count: data.count,
      amount: data.amount,
      color: config.color,
    };
  });
}

// ========================================
// Customer Analysis
// ========================================

/**
 * Calculate customer rankings by order count and total amount
 */
export function getCustomerRankings(orders: Order[], limit = 10): CustomerRanking[] {
  const customerMap = new Map<string, CustomerRanking>();

  orders.forEach((order) => {
    const key = order.customer_id || order.customer_name || 'unknown';
    const existing = customerMap.get(key) || {
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      order_count: 0,
      total_amount: 0,
    };

    customerMap.set(key, {
      ...existing,
      order_count: existing.order_count + 1,
      total_amount: existing.total_amount + (order.total_amount || 0),
    });
  });

  return Array.from(customerMap.values())
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit);
}

// ========================================
// Product Analysis
// ========================================

/**
 * Calculate product rankings by quantity ordered
 */
export function getProductRankings(
  ordersWithItems: OrderWithItems[],
  limit = 10
): ProductRanking[] {
  const productMap = new Map<string, { quantity: number; order_count: Set<string> }>();

  ordersWithItems.forEach((order) => {
    if (!order.order_items) return;

    order.order_items.forEach((item) => {
      const productName = item.product_variants_v2?.display_name || '不明な商品';
      const existing = productMap.get(productName) || {
        quantity: 0,
        order_count: new Set<string>(),
      };

      productMap.set(productName, {
        quantity: existing.quantity + item.quantity,
        order_count: existing.order_count.add(order.order_id),
      });
    });
  });

  return Array.from(productMap.entries())
    .map(([product_name, data]) => ({
      product_name,
      quantity: data.quantity,
      order_count: data.order_count.size,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

// ========================================
// Overall Statistics
// ========================================

/**
 * Calculate overall order statistics
 */
export function getOrderStatistics(orders: Order[]): OrderStatistics {
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const inProductionOrders = orders.filter((o) => o.status === 'in_production').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  return {
    totalOrders,
    totalAmount,
    averageOrderValue,
    pendingOrders,
    inProductionOrders,
    completedOrders,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(
  dateString: string,
  format: 'daily' | 'weekly' | 'monthly' = 'daily'
): string {
  const date = new Date(dateString);

  if (format === 'monthly') {
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short' }).format(date);
  }

  if (format === 'weekly') {
    return `${dateString} 週`;
  }

  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date);
}

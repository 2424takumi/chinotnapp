/**
 * Order Charts View with Filters
 *
 * Complete view for order analytics with filtering options
 */

'use client';

import { useState, useMemo } from 'react';
import type { Database } from '@/lib/types/database';
import OrderCharts from './OrderCharts';

type Order = Database['public']['Tables']['orders']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type ProductVariantV2 = Database['public']['Tables']['product_variants_v2']['Row'];

interface OrderWithItems extends Order {
  order_items?: Array<{
    quantity: number;
    unit_price: number;
    variant_id: string;
    product_variants_v2?: {
      display_name: string;
    } | null;
  }>;
}

interface OrderChartsViewProps {
  orders: OrderWithItems[];
  customers: Customer[];
  variants: ProductVariantV2[];
}

export default function OrderChartsView({ orders, customers, variants }: OrderChartsViewProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Filter orders based on all criteria
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    // Customer filter
    if (filterCustomer !== 'all') {
      filtered = filtered.filter((o) => o.customer_id === filterCustomer);
    }

    // Product filter
    if (filterProduct !== 'all') {
      filtered = filtered.filter((o) =>
        o.order_items?.some((item) => item.variant_id === filterProduct)
      );
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter((o) => o.order_date >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter((o) => o.order_date <= filterDateTo);
    }

    return filtered;
  }, [orders, filterStatus, filterCustomer, filterProduct, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">フィルター</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="daily">日別</option>
              <option value="weekly">週別</option>
              <option value="monthly">月別</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              <option value="pending">受注</option>
              <option value="in_production">製作中</option>
              <option value="completed">納品完了</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">顧客</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              {variants.map((variant) => (
                <option key={variant.variant_id} value={variant.variant_id}>
                  {variant.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">終了日</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Clear filters button */}
        {(filterStatus !== 'all' ||
          filterCustomer !== 'all' ||
          filterProduct !== 'all' ||
          filterDateFrom ||
          filterDateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterCustomer('all');
                setFilterProduct('all');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              フィルターをクリア
            </button>
          </div>
        )}
      </div>

      {/* Charts */}
      <OrderCharts orders={filteredOrders} timeRange={timeRange} />
    </div>
  );
}

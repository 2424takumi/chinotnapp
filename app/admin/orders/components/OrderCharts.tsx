/**
 * Order Charts Component
 *
 * Displays various charts and statistics for order analysis
 */

'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Database } from '@/lib/types/database';
import {
  getDailyTimeSeries,
  getWeeklyTimeSeries,
  getMonthlyTimeSeries,
  getStatusDistribution,
  getCustomerRankings,
  getProductRankings,
  getOrderStatistics,
  formatCurrency,
  formatDate,
} from '@/lib/utils/orderAnalytics';

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

interface OrderChartsProps {
  orders: OrderWithItems[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

export default function OrderCharts({ orders, timeRange }: OrderChartsProps) {
  // Calculate statistics
  const stats = useMemo(() => getOrderStatistics(orders), [orders]);

  const timeSeries = useMemo(() => {
    switch (timeRange) {
      case 'daily':
        return getDailyTimeSeries(orders);
      case 'weekly':
        return getWeeklyTimeSeries(orders);
      case 'monthly':
        return getMonthlyTimeSeries(orders);
    }
  }, [orders, timeRange]);

  const statusDistribution = useMemo(() => getStatusDistribution(orders), [orders]);

  const customerRankings = useMemo(() => getCustomerRankings(orders, 5), [orders]);

  const productRankings = useMemo(() => getProductRankings(orders, 5), [orders]);

  // Format time series data for display
  const formattedTimeSeries = useMemo(
    () =>
      timeSeries.map((item) => ({
        ...item,
        dateLabel: formatDate(item.date, timeRange),
      })),
    [timeSeries, timeRange]
  );

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-8 text-center">
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
          <div className="text-sm text-gray-600">総受注件数</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}件</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-green-200 p-4">
          <div className="text-sm text-gray-600">総受注金額</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
          <div className="text-sm text-gray-600">平均受注額</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.averageOrderValue)}
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-yellow-200 p-4">
          <div className="text-sm text-gray-600">製作中</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.inProductionOrders}件</div>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Count Chart */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">受注件数の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                strokeWidth={2}
                name="受注件数"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Amount Chart */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">受注金額の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="amount" fill="#10B981" name="受注金額" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status and Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">ステータス別受注分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.label}: ${entry.count}`}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">顧客別受注金額 TOP5</h3>
          <div className="space-y-2">
            {customerRankings.map((customer, index) => (
              <div
                key={customer.customer_id || index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-bold text-blue-600 mr-2">{index + 1}.</span>
                  <span className="text-sm">{customer.customer_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatCurrency(customer.total_amount)}</div>
                  <div className="text-xs text-gray-500">{customer.order_count}件</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <h3 className="text-lg font-bold mb-4">商品別受注数量 TOP5</h3>
          <div className="space-y-2">
            {productRankings.map((product, index) => (
              <div
                key={product.product_name}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-bold text-green-600 mr-2">{index + 1}.</span>
                  <span className="text-sm">{product.product_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{product.quantity}個</div>
                  <div className="text-xs text-gray-500">{product.order_count}件</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Order Analytics Page
 *
 * Dedicated page for order statistics and charts
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types/database';
import OrderChartsView from '../orders/components/OrderChartsView';
import Link from 'next/link';

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

export default function OrderAnalyticsPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<ProductVariantV2[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders with items
      const { data: ordersData } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            product_variants_v2(display_name)
          )
        `
        )
        .order('order_date', { ascending: false });

      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('active', true)
        .order('order_index');

      // Fetch variants
      const { data: variantsData } = await supabase
        .from('product_variants_v2')
        .select('*')
        .eq('active', true)
        .order('display_name');

      if (ordersData) setOrders(ordersData as OrderWithItems[]);
      if (customersData) setCustomers(customersData);
      if (variantsData) setVariants(variantsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">受注分析</h2>
          <p className="text-sm text-gray-600 mt-1">受注データの統計とグラフを表示します</p>
        </div>
        <Link
          href="/admin/orders"
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
        >
          ← 受注管理に戻る
        </Link>
      </div>

      <OrderChartsView orders={orders} customers={customers} variants={variants} />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, ProductVariantV2, Customer } from '@/lib/types/database';
import {
  consumeInventoryForOrder,
  restoreInventoryForOrder,
} from '@/lib/services/orderInventoryService';
import OrderChartsView from './components/OrderChartsView';
import Link from 'next/link';

interface OrderWithDetails extends Order {
  order_items: (OrderItem & {
    product_variants_v2: {
      display_name: string;
    };
  })[];
}

interface OrderFormData {
  customer_id: string;
  customer_name: string;
  order_number: string;
  order_date: string;
  delivery_deadline: string;
  status: string;
  note: string;
  items: {
    variant_id: string;
    quantity: number;
    unit_price: number;
  }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [variants, setVariants] = useState<ProductVariantV2[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Graph view state
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // フォーム状態
  const [formData, setFormData] = useState<OrderFormData>({
    customer_id: '',
    customer_name: '',
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_deadline: '',
    status: 'pending',
    note: '',
    items: [],
  });

  useEffect(() => {
    fetchOrders();
    fetchVariants();
    fetchCustomers();
    fetchPrices();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
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
    if (data) setOrders(data as OrderWithDetails[]);
  };

  const fetchVariants = async () => {
    const { data } = await supabase
      .from('product_variants_v2')
      .select('*')
      .eq('active', true)
      .order('display_name');
    if (data) setVariants(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('active', true)
      .order('order_index');
    if (data) setCustomers(data);
  };

  const fetchPrices = async () => {
    const { data } = await supabase
      .from('product_prices')
      .select('variant_id, price')
      .eq('active', true);
    if (data) {
      const priceMap: Record<string, number> = {};
      data.forEach((p: ProductVariantV2 & { price: number }) => {
        priceMap[p.variant_id] = p.price;
      });
      setPrices(priceMap);
    }
  };

  const handleNewOrder = () => {
    setEditingOrder(null);
    setFormData({
      customer_id: '',
      customer_name: '',
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      delivery_deadline: '',
      status: 'pending',
      note: '',
      items: [],
    });
    setShowModal(true);
  };

  const handleEditOrder = (order: OrderWithDetails) => {
    setEditingOrder(order);
    setFormData({
      customer_id: order.customer_id || '',
      customer_name: order.customer_name,
      order_number: order.order_number,
      order_date: order.order_date,
      delivery_deadline: order.delivery_deadline || '',
      status: order.status,
      note: order.note || '',
      items: order.order_items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
    setShowModal(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          variant_id: '',
          quantity: 1,
          unit_price: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderFormData['items'][0],
    value: string | number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // 商品選択時に価格を自動設定
    if (field === 'variant_id' && value) {
      newItems[index].unit_price = prices[value] || 0;
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + item.quantity * item.unit_price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalAmount = calculateTotal();

      if (editingOrder) {
        // 更新
        const updateData: Database['public']['Tables']['orders']['Update'] = {
          customer_id: formData.customer_id || null,
          customer_name: formData.customer_name,
          order_number: formData.order_number,
          order_date: formData.order_date,
          delivery_deadline: formData.delivery_deadline || null,
          status: formData.status,
          note: formData.note || null,
          total_amount: totalAmount,
        };

        // ステータスが納品完了の場合は納品日を設定
        if (formData.status === 'completed' && !editingOrder.delivery_date) {
          updateData.delivery_date = new Date().toISOString().split('T')[0];
        }

        const { error: orderError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('order_id', editingOrder.order_id);

        if (orderError) throw orderError;

        // 既存の明細を削除して再作成
        await supabase.from('order_items').delete().eq('order_id', editingOrder.order_id);

        const itemsToInsert = formData.items.map((item) => ({
          order_id: editingOrder.order_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

        if (itemsError) throw itemsError;
      } else {
        // 新規作成
        const insertData: Database['public']['Tables']['orders']['Insert'] = {
          customer_id: formData.customer_id || null,
          customer_name: formData.customer_name,
          order_number: formData.order_number,
          order_date: formData.order_date,
          delivery_deadline: formData.delivery_deadline || null,
          note: formData.note || null,
          total_amount: totalAmount,
          status: formData.status,
        };

        // ステータスが納品完了の場合は納品日を設定
        if (formData.status === 'completed') {
          insertData.delivery_date = new Date().toISOString().split('T')[0];
        }

        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert(insertData)
          .select()
          .single();

        if (orderError) throw orderError;

        const itemsToInsert = formData.items.map((item) => ({
          order_id: newOrder.order_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchOrders();
      setShowModal(false);
      toast.success(editingOrder ? '受注を更新しました' : '受注を登録しました');
    } catch (error: unknown) {
      console.error('保存エラー:', error);
      toast.error(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // 現在のステータスを取得
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('order_id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = currentOrder?.status;

      // 納品完了への変更の場合、在庫チェックと消費処理
      if (newStatus === 'completed' && currentStatus !== 'completed') {
        const { error: consumeError } = await consumeInventoryForOrder(orderId);
        if (consumeError) {
          throw consumeError;
        }
      }

      // 納品完了から他のステータスへの変更（取り消し）の場合、在庫復元
      if (currentStatus === 'completed' && newStatus !== 'completed') {
        const { error: restoreError } = await restoreInventoryForOrder(orderId);
        if (restoreError) {
          throw restoreError;
        }
      }

      const updateData: Database['public']['Tables']['orders']['Update'] = { status: newStatus };

      // 納品完了の場合は納品日を設定
      if (newStatus === 'completed') {
        updateData.delivery_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('orders').update(updateData).eq('order_id', orderId);

      if (error) throw error;
      await fetchOrders();
      toast.success('ステータスを更新しました');
    } catch (error: unknown) {
      console.error('ステータス更新エラー:', error);
      toast.error(`エラー: ${error.message}`);
    }
  };

  const handleDeleteOrder = async (order: OrderWithDetails) => {
    // 確認ダイアログ
    const confirmMessage = `受注番号「${order.order_number}」を削除してもよろしいですか？\n\n顧客: ${order.customer_name}\n金額: ¥${order.total_amount?.toLocaleString() || 0}\n\nこの操作は取り消せません。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // 納品完了している場合は在庫を復元
      if (order.status === 'completed') {
        const { error: restoreError } = await restoreInventoryForOrder(order.order_id);
        if (restoreError) {
          throw new Error('在庫復元に失敗しました: ' + restoreError.message);
        }
      }

      // 受注明細を削除（外部キー制約があるため先に削除）
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.order_id);

      if (itemsError) throw itemsError;

      // 受注を削除
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('order_id', order.order_id);

      if (orderError) throw orderError;

      await fetchOrders();
      toast.success('受注を削除しました');
    } catch (error: unknown) {
      console.error('削除エラー:', error);
      toast.error(`削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '受注', className: 'bg-yellow-100 text-yellow-800' },
      in_production: { label: '製作中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '納品完了', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'キャンセル', className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs ${config.className}`}>{config.label}</span>;
  };

  const filteredOrders = useMemo(
    () => (filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus)),
    [orders, filterStatus]
  );

  // Filter orders for chart view
  const chartFilteredOrders = useMemo(() => {
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
        o.order_items.some((item) => item.variant_id === filterProduct)
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-balance">受注管理</h2>
        <div className="flex gap-2">
          <Link
            href="/admin/orders-analytics"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            📊 分析・グラフ
          </Link>
          <button
            onClick={handleNewOrder}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            新規受注
          </button>
        </div>
      </div>

      {/* フィルタ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="all">すべて</option>
          <option value="pending">受注</option>
          <option value="in_production">製作中</option>
          <option value="completed">納品完了</option>
          <option value="cancelled">キャンセル</option>
        </select>
      </div>

      {/* 受注一覧 */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                受注番号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                顧客名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                受注日
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                納期
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                受注個数
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                合計金額
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ステータス
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map((order) => (
              <tr key={order.order_id}>
                <td className="px-4 py-3">{order.order_number}</td>
                <td className="px-4 py-3">{order.customer_name}</td>
                <td className="px-4 py-3">{order.order_date}</td>
                <td className="px-4 py-3">{order.delivery_deadline || '—'}</td>
                <td className="px-4 py-3 tabular-nums">
                  {order.order_items.reduce((sum, item) => sum + item.quantity, 0)}個
                </td>
                <td className="px-4 py-3 tabular-nums">
                  ¥{order.total_amount?.toLocaleString() || 0}
                </td>
                <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button
                    onClick={() => handleEditOrder(order)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(order.order_id, 'in_production')}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      製作開始
                    </button>
                  )}
                  {order.status === 'in_production' && (
                    <button
                      onClick={() => handleStatusChange(order.order_id, 'completed')}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      納品完了
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteOrder(order)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-balance">
              {editingOrder ? '受注を編集' : '新規受注'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    顧客名 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(
                        (c) => c.customer_id === e.target.value
                      );
                      setFormData({
                        ...formData,
                        customer_id: e.target.value,
                        customer_name: selectedCustomer?.customer_name || '',
                      });
                    }}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">顧客を選択</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    受注番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="例: ORD-2026-0001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    受注日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">納期</label>
                  <input
                    type="date"
                    value={formData.delivery_deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_deadline: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">受注</option>
                    <option value="in_production">製作中</option>
                    <option value="completed">納品完了</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 明細 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">受注明細</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    明細を追加
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <select
                          value={item.variant_id}
                          onChange={(e) => handleItemChange(index, 'variant_id', e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="">商品を選択</option>
                          {variants.map((v) => (
                            <option key={v.variant_id} value={v.variant_id}>
                              {v.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', parseInt(e.target.value))
                          }
                          required
                          min="1"
                          placeholder="数量"
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(index, 'unit_price', parseFloat(e.target.value))
                          }
                          required
                          min="0"
                          step="0.01"
                          placeholder="単価"
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                      <div className="col-span-2 text-sm tabular-nums">
                        ¥{(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-right">
                  <span className="text-lg font-semibold tabular-nums">
                    合計: ¥{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? '保存中...' : editingOrder ? '更新' : '登録'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

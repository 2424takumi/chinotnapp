'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type {
  Part,
  Operation,
  VariantAttribute,
  VariantAttributeValue,
  Worker,
} from '@/lib/types/database';

interface ManualEntryFormProps {
  workerId?: string;
  onSubmit: (params: {
    workerId: string;
    partId: string;
    operationId: string;
    durationMinutes: number;
    items: Array<{
      attributeValueIds: string[];
      quantity: number;
      lossQuantity: number;
    }>;
    note: string;
  }) => Promise<void>;
  loading: boolean;
}

interface WorkItem {
  id: string;
  attributeValueIds: Record<string, string>;
  quantity: string;
  lossQuantity: string;
}

export function ManualEntryForm({ workerId, onSubmit, loading }: ManualEntryFormProps) {
  const supabase = createClient();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, VariantAttributeValue[]>>(
    {}
  );

  const [selectedWorkerId, setSelectedWorkerId] = useState(workerId || '');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedOperationId, setSelectedOperationId] = useState('');

  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [note, setNote] = useState('');

  const [items, setItems] = useState<WorkItem[]>([
    {
      id: crypto.randomUUID(),
      attributeValueIds: {},
      quantity: '',
      lossQuantity: '0',
    },
  ]);

  useEffect(() => {
    fetchWorkers();
    fetchParts();
  }, []);

  useEffect(() => {
    if (selectedPartId) {
      fetchOperations(selectedPartId);
    } else {
      setOperations([]);
      setSelectedOperationId('');
    }
  }, [selectedPartId]);

  useEffect(() => {
    if (selectedOperationId) {
      fetchAttributesAndValues(selectedOperationId);
    } else {
      setAttributes([]);
      setAttributeValues({});
      // 種類をリセット
      setItems([
        {
          id: crypto.randomUUID(),
          attributeValueIds: {},
          quantity: '',
          lossQuantity: '0',
        },
      ]);
    }
  }, [selectedOperationId]);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('active', true)
      .order('order_index');
    if (error) {
      console.error('作業者取得エラー:', error);
      toast.error(`作業者の取得に失敗しました: ${error.message}`);
    }
    if (data) setWorkers(data);
  };

  const fetchParts = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('active', true)
      .order('order_index');
    if (error) {
      console.error('部品取得エラー:', error);
      toast.error(`部品の取得に失敗しました: ${error.message}`);
    }
    if (data) setParts(data);
  };

  const fetchOperations = async (partId: string) => {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .eq('part_id', partId)
      .eq('active', true)
      .order('order_index');
    if (error) {
      console.error('工程取得エラー:', error);
      toast.error(`工程の取得に失敗しました: ${error.message}`);
    }
    if (data) setOperations(data);
  };

  const fetchAttributesAndValues = async (operationId: string) => {
    const { data: operationAttrs } = await supabase
      .from('operation_variant_attributes')
      .select('attribute_id')
      .eq('operation_id', operationId);

    if (!operationAttrs || operationAttrs.length === 0) {
      setAttributes([]);
      setAttributeValues({});
      return;
    }

    const attributeIds = operationAttrs.map((a) => a.attribute_id);

    const { data: attrs } = await supabase
      .from('variant_attributes')
      .select('*')
      .in('attribute_id', attributeIds)
      .eq('active', true)
      .order('order_index');

    if (attrs) {
      setAttributes(attrs);

      const valuesMap: Record<string, VariantAttributeValue[]> = {};
      for (const attr of attrs) {
        const { data: values } = await supabase
          .from('variant_attribute_values')
          .select('*')
          .eq('attribute_id', attr.attribute_id)
          .eq('active', true)
          .order('order_index');

        if (values) {
          valuesMap[attr.attribute_id] = values;
        }
      }
      setAttributeValues(valuesMap);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        attributeValueIds: {},
        quantity: '',
        lossQuantity: '0',
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('最低1つの種類が必要です');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof WorkItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const updateItemAttribute = (itemId: string, attributeId: string, valueId: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              attributeValueIds: {
                ...item.attributeValueIds,
                [attributeId]: valueId,
              },
            }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWorkerId) {
      toast.error('作業者を選択してください');
      return;
    }

    if (!selectedPartId || !selectedOperationId) {
      toast.error('部品と工程を選択してください');
      return;
    }

    const parsedHours = parseInt(hours) || 0;
    const parsedMinutes = parseInt(minutes) || 0;
    const durationMinutes = parsedHours * 60 + parsedMinutes;
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast.error('作業時間を正しく入力してください（時間または分に有効な値を入力）');
      return;
    }

    // バリデーション
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 属性値チェック
      const missingAttrs = attributes.filter((attr) => !item.attributeValueIds[attr.attribute_id]);
      if (missingAttrs.length > 0) {
        toast.error(
          `種類${i + 1}: 以下の属性を選択してください: ${missingAttrs.map((a) => a.name).join(', ')}`
        );
        return;
      }

      // 数量チェック
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`種類${i + 1}: 完成数量を正しく入力してください`);
        return;
      }

      // 不良数チェック
      const lossQty = parseInt(item.lossQuantity);
      if (isNaN(lossQty) || lossQty < 0) {
        toast.error(`種類${i + 1}: 不良数を正しく入力してください`);
        return;
      }
    }

    // 送信データを作成
    const submitItems = items.map((item) => ({
      attributeValueIds: Object.values(item.attributeValueIds),
      quantity: parseInt(item.quantity),
      lossQuantity: parseInt(item.lossQuantity),
    }));

    try {
      await onSubmit({
        workerId: selectedWorkerId,
        partId: selectedPartId,
        operationId: selectedOperationId,
        durationMinutes,
        items: submitItems,
        note: note.trim(),
      });

      // 成功時のみフォームをリセット
      setSelectedWorkerId(workerId || '');
      setSelectedPartId('');
      setSelectedOperationId('');
      setHours('0');
      setMinutes('0');
      setNote('');
      setItems([
        {
          id: crypto.randomUUID(),
          attributeValueIds: {},
          quantity: '',
          lossQuantity: '0',
        },
      ]);
    } catch (error) {
      // エラー時はフォームをリセットしない（入力内容を保持）
      console.error('手動登録エラー:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {/* 作業者選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業者 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {workers.map((worker) => (
              <option key={worker.worker_id} value={worker.worker_id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>

        {/* 部品選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            部品 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPartId}
            onChange={(e) => setSelectedPartId(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {parts.map((part) => (
              <option key={part.part_id} value={part.part_id}>
                {part.name}
              </option>
            ))}
          </select>
        </div>

        {/* 工程選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工程 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedOperationId}
            onChange={(e) => setSelectedOperationId(e.target.value)}
            required
            disabled={!selectedPartId || loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {operations.map((operation) => (
              <option key={operation.operation_id} value={operation.operation_id}>
                {operation.name}
              </option>
            ))}
          </select>
        </div>

        {/* 作業時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業時間（合計） <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min="0"
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="時間"
              />
              <span className="text-xs text-gray-500 mt-1 block">時間</span>
            </div>
            <div>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min="0"
                max="59"
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="分"
              />
              <span className="text-xs text-gray-500 mt-1 block">分</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">※ 各種類に数量比で按分されます</p>
        </div>

        {/* 複数種類の入力 */}
        {selectedOperationId && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-900">作業した種類と数量</h3>
              <button
                type="button"
                onClick={addItem}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                + 種類を追加
              </button>
            </div>

            {items.map((item, index) => (
              <div
                key={item.id}
                className="border border-gray-300 rounded-lg p-4 space-y-3 bg-white"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900 text-sm">種類 {index + 1}</h4>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={loading}
                      className="text-red-600 text-sm hover:text-red-800 disabled:opacity-50"
                    >
                      削除
                    </button>
                  )}
                </div>

                {/* 属性選択 */}
                {attributes.map((attribute) => (
                  <div key={attribute.attribute_id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {attribute.name} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.attributeValueIds[attribute.attribute_id] || ''}
                      onChange={(e) =>
                        updateItemAttribute(item.id, attribute.attribute_id, e.target.value)
                      }
                      required
                      disabled={loading}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="">選択してください</option>
                      {attributeValues[attribute.attribute_id]?.map((value) => (
                        <option key={value.value_id} value={value.value_id}>
                          {value.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* 完成数量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    完成数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    required
                    min="1"
                    disabled={loading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="例: 10"
                  />
                </div>

                {/* 不良数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">不良数</label>
                  <input
                    type="number"
                    value={item.lossQuantity}
                    onChange={(e) => updateItem(item.id, 'lossQuantity', e.target.value)}
                    min="0"
                    disabled={loading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="例: 0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            placeholder="備考があれば入力してください"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !selectedWorkerId || !selectedPartId || !selectedOperationId}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '登録中...' : '作業を登録'}
      </button>
    </form>
  );
}

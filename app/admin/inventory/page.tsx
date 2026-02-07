'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation, ProductVariant, InventoryAdjustment } from '@/lib/types/database';
import { createInventoryCalculator } from '@/lib/utils/inventoryCalculator';
import type { PartInventory, VariantInventory, OperationInventory } from '@/lib/utils/inventoryCalculator';
import CategoryInventoryGroup from './components/CategoryInventoryGroup';

interface WorkLog {
  log_id: string;
  worker_id: string;
  part_id: string;
  operation_id: string;
  duration_minutes: number;
  quantity: number;
  loss_quantity: number;
  note: string | null;
  is_deleted: boolean;
  variant_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [logs, setLogs] = useState<any[]>([]); // work_log_attributes を含むため any
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [inventory, setInventory] = useState<PartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [operationAttributes, setOperationAttributes] = useState<any[]>([]);
  const [variantAttributes, setVariantAttributes] = useState<any[]>([]);
  const [variantAttributeValues, setVariantAttributeValues] = useState<any[]>([]);
  const [processConsumptions, setProcessConsumptions] = useState<any[]>([]);
  const [orderConsumptions, setOrderConsumptions] = useState<any[]>([]);

  // バリエーション調整用の状態管理
  const [variantAdjustQty, setVariantAdjustQty] = useState<Record<string, string>>({});
  const [variantMoveQty, setVariantMoveQty] = useState<Record<string, string>>({});
  const [adjusting, setAdjusting] = useState<Record<string, boolean>>({});
  const [moving, setMoving] = useState<Record<string, boolean>>({});

  // モーダル関連のstate
  const [showModal, setShowModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedAdjustmentAttributeValues, setSelectedAdjustmentAttributeValues] = useState<Record<string, string>>({});

  // 在庫詳細モーダル関連のstate
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInventoryDetail, setSelectedInventoryDetail] = useState<{
    partId: string;
    partName: string;
    operationId: string;
    operationName: string;
    inventory: number;
    variants?: VariantInventory[];
  } | null>(null);
  const [inventoryLogs, setInventoryLogs] = useState<WorkLog[]>([]);
  const [inventoryAdjustmentLogs, setInventoryAdjustmentLogs] = useState<InventoryAdjustment[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    quantity: number;
    loss_quantity: number;
    note: string;
  }>({ quantity: 0, loss_quantity: 0, note: '' });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const [bomConsumptions, setBomConsumptions] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // データ取得にタイムアウト保護を追加（30秒）
      const fetchPromise = Promise.all([
        supabase.from('parts').select('*').eq('active', true).order('order_index'),
        supabase.from('operations').select('*').eq('active', true).order('order_index'),
        supabase.from('work_logs').select(`
          *,
          work_log_attributes (
            value_id,
            variant_attribute_values (
              value_id,
              name,
              attribute_id,
              variant_attributes (
                attribute_id,
                name
              )
            )
          )
        `).eq('is_deleted', false),
        supabase.from('workers').select('*').eq('active', true),
        supabase.from('bom_consumption').select('*'),
        supabase.from('bom').select('*'),
        supabase.from('product_variants').select('*').eq('active', true),
        supabase.from('inventory_adjustments').select(`
          *,
          inventory_adjustment_attributes (
            value_id,
            variant_attribute_values (
              value_id,
              name,
              attribute_id,
              variant_attributes (
                attribute_id,
                name
              )
            )
          )
        `),
        supabase.from('operation_variant_attributes').select('*'),
        supabase.from('variant_attributes').select('*').eq('active', true),
        supabase.from('variant_attribute_values').select('*').eq('active', true),
        supabase.from('process_consumption').select('*'),
        supabase.from('order_inventory_consumption').select('*').eq('is_deleted', false),
      ]);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('データ取得がタイムアウトしました（30秒）')), 30000)
      );

      const [partsRes, operationsRes, logsRes, workersRes, consumptionsRes, bomRes, variantsRes, adjustmentsRes, opAttrsRes, vAttrsRes, vAttrValsRes, processConsRes, orderConsRes] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      if (partsRes.data) setParts(partsRes.data);
      if (operationsRes.data) setOperations(operationsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (workersRes.data) setWorkers(workersRes.data);
      if (consumptionsRes.data) setBomConsumptions(consumptionsRes.data);
      if (bomRes.data) setBomData(bomRes.data);
      if (variantsRes.data) setVariants(variantsRes.data);
      if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data);
      if (opAttrsRes.data) setOperationAttributes(opAttrsRes.data);
      if (vAttrsRes.data) setVariantAttributes(vAttrsRes.data);
      if (vAttrValsRes.data) setVariantAttributeValues(vAttrValsRes.data);
      if (processConsRes.data) setProcessConsumptions(processConsRes.data);
      if (orderConsRes.data) setOrderConsumptions(orderConsRes.data);
    } catch (error) {
      console.error('データ取得エラー:', error);
      toast.error('データの取得に失敗しました。ページを再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (parts.length > 0 && operations.length > 0 && logs.length > 0 && isMounted) {
      calculateInventory();
    }

    return () => {
      isMounted = false;
    };
  }, [parts, operations, logs, adjustments, processConsumptions, orderConsumptions, calculateInventory]);

  /**
   * Optimized inventory calculation using InventoryCalculator
   *
   * ## Performance Improvement
   * - Complexity: O(n³) → O(n)
   * - Uses Map-based indexing for constant-time lookups
   *
   * @see /lib/utils/inventoryCalculator.ts
   */
  const calculateInventory = useCallback(() => {
    const calculator = createInventoryCalculator(
      logs,
      adjustments,
      bomConsumptions,
      processConsumptions,
      orderConsumptions,
      operations,
      variants,
      operationAttributes
    );

    const inventoryData = calculator.calculate(parts);
    setInventory(inventoryData);
  }, [logs, adjustments, bomConsumptions, processConsumptions, orderConsumptions, operations, variants, operationAttributes, parts]);

  const openModal = useCallback((partId: string) => {
    setSelectedPartId(partId);
    setSelectedOperationId(null);
    setAdjustmentQuantity('');
    setAdjustmentNote('');
    setSelectedAdjustmentAttributeValues({});
    setShowModal(true);
    setMessage(null);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedPartId(null);
    setSelectedOperationId(null);
    setAdjustmentQuantity('');
    setAdjustmentNote('');
    setSelectedAdjustmentAttributeValues({});
  }, []);

  const handleSaveAdjustment = async () => {
    setMessage(null);

    if (!selectedPartId || !selectedOperationId) {
      setMessage({ type: 'error', text: '工程を選択してください' });
      return;
    }

    const qty = parseInt(adjustmentQuantity);
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: '数量は1以上で入力してください' });
      return;
    }

    // この工程に属性が設定されているか確認
    const opAttrs = operationAttributes.filter(oa => oa.operation_id === selectedOperationId);

    // 属性が設定されている場合、必須チェック
    if (opAttrs.length > 0) {
      const missingAttributes = opAttrs.filter(
        oa => !selectedAdjustmentAttributeValues[oa.attribute_id]
      );

      if (missingAttributes.length > 0) {
        const attrNames = missingAttributes
          .map(oa => variantAttributes.find(va => va.attribute_id === oa.attribute_id)?.name || '不明')
          .join(', ');
        setMessage({ type: 'error', text: `以下の属性を選択してください: ${attrNames}` });
        return;
      }
    }

    // システム作業者を取得
    const systemWorker = workers.find((w) => w.name === 'システム');
    if (!systemWorker) {
      setMessage({ type: 'error', text: 'システム作業者が見つかりません。データベースにシステム作業者を追加してください。' });
      return;
    }

    setSaving(true);
    try {
      const noteText = adjustmentNote ? adjustmentNote : '';

      // inventory_adjustments テーブルに保存
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert({
          part_id: selectedPartId,
          operation_id: selectedOperationId,
          adjustment_quantity: qty,
          note: noteText,
          created_by: systemWorker.worker_id,
        })
        .select()
        .single();

      if (adjustmentError) {
        console.error('Supabase error details:', adjustmentError);
        throw adjustmentError;
      }

      // 属性値が選択されている場合、inventory_adjustment_attributes に保存
      const attributeValueIds = Object.values(selectedAdjustmentAttributeValues).filter(Boolean);
      if (attributeValueIds.length > 0 && adjustment) {
        const attributeInserts = attributeValueIds.map(valueId => ({
          adjustment_id: adjustment.adjustment_id,
          value_id: valueId,
        }));

        const { error: attrError } = await supabase
          .from('inventory_adjustment_attributes')
          .insert(attributeInserts);

        if (attrError) {
          console.error('属性値保存エラー:', attrError);
          // 属性値の保存に失敗しても在庫調整は成功しているので続行
        }
      }

      setMessage({ type: 'success', text: '在庫調整を保存しました' });

      // データを再取得
      await fetchData();

      // 2秒後にモーダルを閉じる
      setTimeout(() => {
        closeModal();
      }, 2000);
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const getPartOperations = useCallback((partId: string) => {
    return operations.filter((op) => op.part_id === partId).sort((a, b) => a.order_index - b.order_index);
  }, [operations]);

  const getPartName = useCallback((partId: string) => {
    return parts.find((p) => p.part_id === partId)?.name || '';
  }, [parts]);

  // 在庫詳細モーダルを開く
  const openDetailModal = useCallback(async (partId: string, partName: string, operationId: string, operationName: string, inventory: number, variants?: VariantInventory[]) => {
    setSelectedInventoryDetail({
      partId,
      partName,
      operationId,
      operationName,
      inventory,
      variants,
    });

    // その工程の作業履歴を取得
    const operationLogs = logs.filter(log =>
      log.operation_id === operationId &&
      log.is_deleted === false
    );
    setInventoryLogs(operationLogs);

    // その工程の在庫調整履歴を取得
    const operationAdjustments = adjustments.filter(adj =>
      adj.operation_id === operationId
    );
    setInventoryAdjustmentLogs(operationAdjustments);

    setShowDetailModal(true);
  }, [logs, adjustments]);

  // 在庫詳細モーダルを閉じる
  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedInventoryDetail(null);
    setInventoryLogs([]);
    setInventoryAdjustmentLogs([]);
    setEditingLogId(null);
    setEditFormData({ quantity: 0, loss_quantity: 0, note: '' });
  }, []);

  // 作業履歴の編集開始
  const startEditLog = useCallback((log: WorkLog) => {
    setEditingLogId(log.log_id);
    setEditFormData({
      quantity: log.quantity,
      loss_quantity: log.loss_quantity,
      note: log.note || '',
    });
  }, []);

  // 作業履歴の編集をキャンセル
  const cancelEditLog = useCallback(() => {
    setEditingLogId(null);
    setEditFormData({ quantity: 0, loss_quantity: 0, note: '' });
  }, []);

  // 作業履歴の更新を保存
  const saveEditLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('work_logs')
        .update({
          quantity: editFormData.quantity,
          loss_quantity: editFormData.loss_quantity,
          note: editFormData.note,
          updated_at: new Date().toISOString(),
        })
        .eq('log_id', logId);

      if (error) throw error;

      // データを再取得
      await fetchData();

      // 編集モードを終了
      cancelEditLog();

      toast.success('更新しました');
    } catch (error) {
      console.error('更新エラー:', error);
      toast.error('更新に失敗しました');
    }
  };

  // 作業履歴の削除（論理削除）
  const deleteLog = async (logId: string) => {
    if (!confirm('この作業履歴を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('log_id', logId);

      if (error) throw error;

      // データを再取得
      await fetchData();

      // モーダルを閉じる
      closeDetailModal();

      toast.success('削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除に失敗しました');
    }
  };

  // バリエーション在庫調整
  const handleVariantAdjustment = async (
    partId: string,
    operationId: string,
    variantId: string,
    adjustmentQty: number,
    note: string = ''
  ) => {
    const systemWorker = workers.find((w) => w.name === 'システム');
    if (!systemWorker) {
      toast.error('システム作業者が見つかりません');
      return;
    }

    try {
      // inventory_adjustments に保存
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert({
          part_id: partId,
          operation_id: operationId,
          adjustment_quantity: adjustmentQty,
          note: note || `在庫調整 ${adjustmentQty > 0 ? '+' : ''}${adjustmentQty}個`,
          created_by: systemWorker.worker_id,
        })
        .select()
        .single();

      if (adjustmentError) throw adjustmentError;

      // variant_idから属性値を取得して保存
      if (adjustment && variantId !== 'uncategorized') {
        const valueIds = variantId.split('|');
        const attributeInserts = valueIds.map(valueId => ({
          adjustment_id: adjustment.adjustment_id,
          value_id: valueId,
        }));

        const { error: attrError } = await supabase
          .from('inventory_adjustment_attributes')
          .insert(attributeInserts);

        if (attrError) {
          console.error('属性値保存エラー:', attrError);
          toast.warning('在庫調整は保存されましたが、バリエーション情報の保存に失敗しました');
        }
      }

      await fetchData();
      toast.success(`在庫を${adjustmentQty > 0 ? '+' : ''}${adjustmentQty}個調整しました`);
    } catch (error) {
      console.error('在庫調整エラー:', error);
      toast.error('在庫調整に失敗しました');
    }
  };

  // 次工程への移動
  const handleMoveToNextOperation = async (
    partId: string,
    currentOperationId: string,
    variantId: string,
    quantity: number
  ) => {
    const systemWorker = workers.find((w) => w.name === 'システム');
    if (!systemWorker) {
      toast.error('システム作業者が見つかりません');
      return;
    }

    // 次の工程を取得
    const partOperations = operations
      .filter((op) => op.part_id === partId)
      .sort((a, b) => a.order_index - b.order_index);

    const currentOpIndex = partOperations.findIndex((op) => op.operation_id === currentOperationId);
    const nextOperation = partOperations[currentOpIndex + 1];

    if (!nextOperation) {
      toast.error('次の工程がありません');
      return;
    }

    try {
      // work_logsに次工程の作業を記録
      const { data: workLog, error: logError } = await supabase
        .from('work_logs')
        .insert({
          worker_id: systemWorker.worker_id,
          part_id: partId,
          operation_id: nextOperation.operation_id,
          duration_minutes: 1, // システムによる自動移動（最小値）
          quantity: quantity,
          loss_quantity: 0,
          note: '前工程からの移動',
        })
        .select()
        .single();

      if (logError) throw logError;

      // variant_idから属性値を取得して保存
      if (workLog && variantId !== 'uncategorized') {
        const valueIds = variantId.split('|');
        const attributeInserts = valueIds.map(valueId => ({
          work_log_id: workLog.log_id,
          value_id: valueId,
        }));

        const { error: attrError } = await supabase
          .from('work_log_attributes')
          .insert(attributeInserts);

        if (attrError) {
          console.error('属性値保存エラー:', attrError);
          toast.warning('次工程への移動は記録されましたが、バリエーション情報の保存に失敗しました');
        }
      }

      // 現在の工程から在庫を減らす（process_consumptionに記録）
      const { error: consumptionError } = await supabase
        .from('process_consumption')
        .insert({
          work_log_id: workLog.log_id,
          consumed_operation_id: currentOperationId,
          consumed_quantity: quantity,
          consumed_attribute_values: variantId !== 'uncategorized'
            ? Object.fromEntries(variantId.split('|').map((id, idx) => [`attr_${idx}`, id]))
            : {},
        });

      if (consumptionError) throw consumptionError;

      await fetchData();
      toast.success(`${quantity}個を次工程「${nextOperation.name}」に移動しました`);
    } catch (error) {
      console.error('次工程移動エラー:', error);
      toast.error('次工程への移動に失敗しました');
    }
  };

  // 完成品（三味線）を作るのに必要な部品の個数を取得
  const getShamisen組Count = useCallback((partId: string, inventory: number) => {
    // まず完成品（三味線）で直接使われるか確認
    const shamisenPart = parts.find((p) => p.name === '完成品（三味線）');
    if (shamisenPart) {
      const assemblyOp = operations.find(
        (op) => op.part_id === shamisenPart.part_id && op.name === '最終組み立て'
      );
      if (assemblyOp) {
        const bom = bomData.find(
          (b) => b.operation_id === assemblyOp.operation_id && b.consumed_part_id === partId
        );
        if (bom) {
          // 1個で1台分なら表示しない
          if (bom.quantity_per_unit === 1) return null;

          const count = Math.floor(inventory / bom.quantity_per_unit);
          const remainder = inventory % bom.quantity_per_unit;
          return { count, remainder, unit: '三味線', unitCount: bom.quantity_per_unit };
        }
      }
    }

    // 胴の組み立てで使われるか確認（胴-短手、胴-長手）
    const bodyPart = parts.find((p) => p.name === '胴');
    if (bodyPart) {
      const bodyAssemblyOp = operations.find(
        (op) => op.part_id === bodyPart.part_id && op.name === '組み立て'
      );
      if (bodyAssemblyOp) {
        const bom = bomData.find(
          (b) => b.operation_id === bodyAssemblyOp.operation_id && b.consumed_part_id === partId
        );
        if (bom) {
          // 1個で1個分なら表示しない
          if (bom.quantity_per_unit === 1) return null;

          const count = Math.floor(inventory / bom.quantity_per_unit);
          const remainder = inventory % bom.quantity_per_unit;
          return { count, remainder, unit: '胴', unitCount: bom.quantity_per_unit };
        }
      }
    }

    return null;
  }, [parts, operations, bomData]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-0 md:p-8">
      <div className="mb-4 md:mb-6 px-4 md:px-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-balance">工程別在庫状況</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2 text-pretty">
          各部品の工程ごとの在庫数を表示しています（在庫0の工程は非表示）
        </p>
      </div>

      <div className="space-y-6">
        {/* 胴グループ */}
        {inventory.some(p => p.part_name.startsWith('胴')) && (
          <div className="bg-gray-100 rounded-lg p-3 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 text-balance">【胴】</h2>

            {inventory.filter(p => p.part_name.startsWith('胴')).map((partData) => (
              <div key={partData.part_id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-700 text-balance">
                    {partData.part_name}
                  </h3>
                  <button
                    onClick={() => openModal(partData.part_id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    + 在庫追加
                  </button>
                </div>

                {partData.operations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                    {partData.operations.map((op) => {
                      const shamisenInfo = getShamisen組Count(partData.part_id, op.inventory);
                      return (
                        <div
                          key={op.operation_id}
                          onClick={() => openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory, op.variants)}
                          className="bg-white rounded-lg border-2 border-gray-300 p-2 md:p-3 shadow hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                        >
                          <div className="text-xs text-gray-600 mb-1">
                            {op.operation_name}
                          </div>
                          {/* バリアントがある場合は全体の個数を小さく表示 */}
                          {op.variants && op.variants.length > 0 ? (
                            <>
                              <div className="text-xs text-gray-400 mb-2 tabular-nums">
                                合計: {op.inventory}個
                              </div>
                              <div className="space-y-2">
                                {op.variants.map(v => {
                                  const tags: { text: string; color: string }[] = [];
                                  const attributePairs = v.variant_name.split(',').map(pair => pair.trim());
                                  attributePairs.forEach(pair => {
                                    const [attrName, valueName] = pair.split(':').map(s => s.trim());
                                    if (valueName) {
                                      let color = 'bg-gray-100 text-gray-700';
                                      if (valueName.includes('島村')) {
                                        color = 'bg-blue-100 text-blue-700';
                                      } else if (valueName.includes('通常')) {
                                        color = 'bg-emerald-100 text-emerald-700';
                                      } else if (valueName.includes('赤富士')) {
                                        color = 'bg-rose-100 text-rose-700';
                                      } else if (valueName.includes('花柄')) {
                                        color = 'bg-pink-100 text-pink-700';
                                      } else if (valueName.includes('唐草')) {
                                        color = 'bg-purple-100 text-purple-700';
                                      } else if (valueName.includes('無地')) {
                                        color = 'bg-slate-100 text-slate-700';
                                      }
                                      tags.push({ text: valueName, color });
                                    }
                                  });

                                  return (
                                    <div
                                      key={v.variant_id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory, op.variants);
                                      }}
                                      className="bg-white border-2 border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                                    >
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {tags.map((tag, idx) => (
                                          <span key={idx} className={`${tag.color} text-sm font-medium px-2.5 py-0.5 rounded-full`}>
                                            {tag.text}
                                          </span>
                                        ))}
                                      </div>
                                      <div className="text-2xl font-bold text-gray-800 tabular-nums">
                                        {v.inventory}
                                        <span className="text-sm text-gray-600 ml-1">個</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xl md:text-2xl font-bold text-blue-600 tabular-nums">
                                {op.inventory}
                                <span className="text-xs md:text-sm text-gray-600 ml-1">個</span>
                              </div>
                              {/* 糸巻き、胴-短手、胴-長手の場合、ちんとん換算を表示 */}
                              {(partData.part_name === '糸巻き' || partData.part_name === '胴-短手' || partData.part_name === '胴-長手') && (
                                <div className="text-xs text-gray-500 mt-1 tabular-nums">
                                  ちんとん{Math.floor(op.inventory / 3)}個分
                                  {op.inventory % 3 > 0 && ` +${op.inventory % 3}個`}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-3 text-sm text-pretty">
                    在庫なし（「+ 在庫追加」から登録できます）
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* その他の部品 */}
        {inventory.filter(p => !p.part_name.startsWith('胴')).map((partData) => (
            <div
              key={partData.part_id}
              className="bg-gray-100 rounded-lg p-3 md:p-6 shadow-sm"
            >
              {/* 部品名ヘッダーと在庫追加ボタン */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 text-balance">
                  【{partData.part_name}】
                </h2>
                <button
                  onClick={() => openModal(partData.part_id)}
                  className="bg-blue-600 text-white px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + 在庫追加
                </button>
              </div>

              {/* 工程カード群 */}
              {partData.operations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                  {partData.operations.map((op) => {
                    const shamisenInfo = getShamisen組Count(partData.part_id, op.inventory);
                    return (
                      <div
                        key={op.operation_id}
                        onClick={() => openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory, op.variants)}
                        className="bg-white rounded-lg border-2 border-gray-300 p-2 md:p-4 shadow hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                      >
                        <div className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                          {op.operation_name}
                        </div>
                        {/* バリアントがある場合は全体の個数を小さく表示 */}
                        {op.variants && op.variants.length > 0 ? (
                          <>
                            <div className="text-xs text-gray-400 mb-2 tabular-nums">
                              合計: {op.inventory}個
                            </div>
                            <div className="space-y-2">
                              {op.variants.map(v => {
                                const tags: { text: string; color: string }[] = [];
                                const attributePairs = v.variant_name.split(',').map(pair => pair.trim());
                                attributePairs.forEach(pair => {
                                  const [attrName, valueName] = pair.split(':').map(s => s.trim());
                                  if (valueName) {
                                    let color = 'bg-gray-100 text-gray-700';
                                    if (valueName.includes('島村')) {
                                      color = 'bg-blue-100 text-blue-700';
                                    } else if (valueName.includes('通常')) {
                                      color = 'bg-emerald-100 text-emerald-700';
                                    } else if (valueName.includes('赤富士')) {
                                      color = 'bg-rose-100 text-rose-700';
                                    } else if (valueName.includes('花柄')) {
                                      color = 'bg-pink-100 text-pink-700';
                                    } else if (valueName.includes('唐草')) {
                                      color = 'bg-purple-100 text-purple-700';
                                    } else if (valueName.includes('無地')) {
                                      color = 'bg-slate-100 text-slate-700';
                                    }
                                    tags.push({ text: valueName, color });
                                  }
                                });

                                return (
                                  <div
                                    key={v.variant_id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory, op.variants);
                                    }}
                                    className="bg-white border-2 border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                                  >
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {tags.map((tag, idx) => (
                                        <span key={idx} className={`${tag.color} text-sm font-medium px-2.5 py-0.5 rounded-full`}>
                                          {tag.text}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-3xl font-bold text-gray-800 tabular-nums">
                                      {v.inventory}
                                      <span className="text-base text-gray-600 ml-1">個</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl md:text-3xl font-bold text-blue-600 tabular-nums">
                              {op.inventory}
                              <span className="text-sm md:text-lg text-gray-600 ml-1">個</span>
                            </div>
                            {/* 糸巻き、胴-短手、胴-長手の場合、ちんとん換算を表示 */}
                            {(partData.part_name === '糸巻き' || partData.part_name === '胴-短手' || partData.part_name === '胴-長手') && (
                              <div className="text-xs text-gray-500 mt-1 tabular-nums">
                                ちんとん{Math.floor(op.inventory / 3)}個分
                                {op.inventory % 3 > 0 && ` +${op.inventory % 3}個`}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-pretty">
                  在庫なし（「+ 在庫追加」から登録できます）
                </div>
              )}
            </div>
          ))}
      </div>

      {/* 在庫調整モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-balance">
              在庫追加：{getPartName(selectedPartId!)}
            </h3>

            {/* メッセージ */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* 工程選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                工程 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getPartOperations(selectedPartId!).map((op) => (
                  <button
                    key={op.operation_id}
                    type="button"
                    onClick={() => setSelectedOperationId(op.operation_id)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedOperationId === op.operation_id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 属性値選択 */}
            {selectedOperationId && (() => {
              const opAttrs = operationAttributes.filter(oa => oa.operation_id === selectedOperationId);
              if (opAttrs.length === 0) return null;

              return (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    属性 <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {opAttrs.map((opAttr) => {
                      const attribute = variantAttributes.find(va => va.attribute_id === opAttr.attribute_id);
                      if (!attribute) return null;

                      const values = variantAttributeValues.filter(vav => vav.attribute_id === attribute.attribute_id);

                      return (
                        <div key={attribute.attribute_id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-2">{attribute.name}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {values.map((value) => (
                              <button
                                key={value.value_id}
                                type="button"
                                onClick={() => {
                                  setSelectedAdjustmentAttributeValues({
                                    ...selectedAdjustmentAttributeValues,
                                    [attribute.attribute_id]: value.value_id
                                  });
                                }}
                                className={`p-2 rounded-lg border-2 text-sm transition-colors ${
                                  selectedAdjustmentAttributeValues[attribute.attribute_id] === value.value_id
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                              >
                                {value.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 数量入力 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
                placeholder="追加する在庫数を入力"
              />
            </div>

            {/* 備考入力 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備考（任意）
              </label>
              <input
                type="text"
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
                placeholder="例: 初期在庫、棚卸調整"
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 在庫詳細モーダル */}
      {showDetailModal && selectedInventoryDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 my-8">
            {/* ヘッダー */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 text-balance">
                  {selectedInventoryDetail.partName} - {selectedInventoryDetail.operationName}
                </h3>
                <p className="text-sm text-gray-600 mt-1 text-pretty">
                  現在の在庫: <span className="text-2xl font-bold text-blue-600 tabular-nums">{selectedInventoryDetail.inventory}</span> 個
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            {/* バリエーション別在庫調整 */}
            {selectedInventoryDetail.variants && selectedInventoryDetail.variants.length > 0 ? (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">バリエーション別在庫</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedInventoryDetail.variants.map(v => {
                    const tags: { text: string; color: string }[] = [];
                    const attributePairs = v.variant_name.split(',').map(pair => pair.trim());
                    attributePairs.forEach(pair => {
                      const [attrName, valueName] = pair.split(':').map(s => s.trim());
                      if (valueName) {
                        let color = 'bg-gray-100 text-gray-700';
                        if (valueName.includes('島村')) {
                          color = 'bg-blue-100 text-blue-700';
                        } else if (valueName.includes('通常')) {
                          color = 'bg-emerald-100 text-emerald-700';
                        } else if (valueName.includes('赤富士')) {
                          color = 'bg-rose-100 text-rose-700';
                        } else if (valueName.includes('花柄')) {
                          color = 'bg-pink-100 text-pink-700';
                        } else if (valueName.includes('唐草')) {
                          color = 'bg-purple-100 text-purple-700';
                        } else if (valueName.includes('無地')) {
                          color = 'bg-slate-100 text-slate-700';
                        }
                        tags.push({ text: valueName, color });
                      }
                    });

                    const cardKey = `${selectedInventoryDetail.operationId}-${v.variant_id}`;
                    const adjustQty = variantAdjustQty[cardKey] || 0;
                    const moveQty = variantMoveQty[cardKey] || 0;

                    return (
                      <div key={v.variant_id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-2.5">
                        {/* タグ */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tags.map((tag, idx) => (
                            <span key={idx} className={`${tag.color} text-xs font-medium px-2 py-0.5 rounded-full`}>
                              {tag.text}
                            </span>
                          ))}
                        </div>

                        {/* 現在の在庫 */}
                        <div className="mb-2 text-center">
                          <div className="text-xs text-gray-600 mb-0.5">現在の在庫</div>
                          <div className="text-2xl font-bold text-gray-800 tabular-nums">
                            {v.inventory}
                            <span className="text-sm text-gray-600 ml-1">個</span>
                          </div>
                        </div>

                        {/* 在庫調整 */}
                        <div className="mb-2 border-t pt-2">
                          <div className="text-xs font-semibold text-gray-700 mb-1">在庫調整</div>
                          <div className="text-xs text-gray-500 mb-1.5">+で増加、-で減少</div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <input
                              type="text"
                              value={adjustQty || ''}
                              onChange={(e) => {
                                setVariantAdjustQty({ ...variantAdjustQty, [cardKey]: e.target.value });
                              }}
                              className="flex-1 px-2 py-1.5 border-2 border-gray-300 rounded text-center text-sm font-semibold tabular-nums"
                              placeholder="±数量"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const input = adjustQty || '';
                              const adjustQtyNum = parseInt(input);

                              if (input === '' || isNaN(adjustQtyNum) || adjustQtyNum === 0 || adjusting[cardKey]) return;

                              // 在庫がマイナスにならないかチェック
                              const finalInventory = v.inventory + adjustQtyNum;
                              if (finalInventory < 0) {
                                toast.error(`在庫が不足しています。現在の在庫: ${v.inventory}個（最大で-${v.inventory}個まで調整可能）`);
                                return;
                              }

                              setAdjusting({ ...adjusting, [cardKey]: true });
                              try {
                                await handleVariantAdjustment(
                                  selectedInventoryDetail.partId,
                                  selectedInventoryDetail.operationId,
                                  v.variant_id,
                                  adjustQtyNum
                                );
                                setVariantAdjustQty({ ...variantAdjustQty, [cardKey]: '' });
                              } finally {
                                setAdjusting({ ...adjusting, [cardKey]: false });
                              }
                            }}
                            disabled={!adjustQty || adjusting[cardKey]}
                            className="w-full bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {adjusting[cardKey] ? '保存中...' : '調整を保存'}
                          </button>
                        </div>

                        {/* 次工程へ移動 */}
                        <div className="border-t pt-2">
                          <div className="text-xs font-semibold text-gray-700 mb-1.5">次工程へ移動</div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <input
                              type="text"
                              value={moveQty || ''}
                              onChange={(e) => {
                                setVariantMoveQty({ ...variantMoveQty, [cardKey]: e.target.value });
                              }}
                              className="flex-1 px-2 py-1.5 border-2 border-gray-300 rounded text-center text-sm font-semibold tabular-nums"
                              placeholder="数量"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const input = moveQty || '';
                              const moveQtyNum = parseInt(input);

                              if (input === '' || isNaN(moveQtyNum) || moveQtyNum <= 0 || moveQtyNum > v.inventory || moving[cardKey]) {
                                if (input !== '' && (!isNaN(moveQtyNum) && (moveQtyNum <= 0 || moveQtyNum > v.inventory))) {
                                  toast.error('数量を正しく入力してください');
                                }
                                return;
                              }

                              setMoving({ ...moving, [cardKey]: true });
                              try {
                                await handleMoveToNextOperation(
                                  selectedInventoryDetail.partId,
                                  selectedInventoryDetail.operationId,
                                  v.variant_id,
                                  moveQtyNum
                                );
                                setVariantMoveQty({ ...variantMoveQty, [cardKey]: '' });
                              } finally {
                                setMoving({ ...moving, [cardKey]: false });
                              }
                            }}
                            disabled={!moveQty || moving[cardKey]}
                            className="w-full bg-purple-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {moving[cardKey] ? '移動中...' : '次工程へ移動'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-2 text-balance">在庫調整</h4>
                <p className="text-sm text-gray-600 mb-3">+で増加、-で減少</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(e.target.value)}
                    className="flex-1 p-3 border-2 border-gray-300 rounded-lg"
                    placeholder="±数量"
                  />
                  <button
                    onClick={async () => {
                      const qty = parseInt(adjustmentQuantity);
                      if (!qty || qty === 0) {
                        toast.error('数量を入力してください');
                        return;
                      }

                      // 在庫がマイナスにならないかチェック
                      const finalInventory = selectedInventoryDetail.inventory + qty;
                      if (finalInventory < 0) {
                        toast.error(`在庫が不足しています。現在の在庫: ${selectedInventoryDetail.inventory}個（最大で-${selectedInventoryDetail.inventory}個まで調整可能）`);
                        return;
                      }

                      const systemWorker = workers.find((w) => w.name === 'システム');
                      if (!systemWorker) {
                        toast.error('システム作業者が見つかりません');
                        return;
                      }

                      try {
                        const noteText = `${qty > 0 ? '+' : ''}${qty}個`;
                        const { error } = await supabase.from('inventory_adjustments').insert({
                          part_id: selectedInventoryDetail.partId,
                          operation_id: selectedInventoryDetail.operationId,
                          adjustment_quantity: qty,
                          note: noteText,
                          created_by: systemWorker.worker_id,
                        });

                        if (error) throw error;

                        await fetchData();
                        setAdjustmentQuantity('');
                        closeDetailModal();
                        toast.success('在庫調整を保存しました');
                      } catch (error) {
                        console.error('保存エラー:', error);
                        toast.error('保存に失敗しました');
                      }
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    調整
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-pretty">
                  ※ プラス値で在庫追加、マイナス値で在庫減少します
                </p>
              </div>
            )}

            {/* 在庫調整履歴一覧 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 text-balance">在庫調整履歴</h4>
              {inventoryAdjustmentLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-pretty">在庫調整履歴がありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">日時</th>
                        <th className="p-2 text-right">調整数</th>
                        <th className="p-2 text-left">備考</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryAdjustmentLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((adj) => (
                        <tr key={adj.adjustment_id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            {new Date(adj.created_at).toLocaleDateString('ja-JP', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className={`p-2 text-right font-semibold tabular-nums ${adj.adjustment_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.adjustment_quantity > 0 ? '+' : ''}{adj.adjustment_quantity}
                          </td>
                          <td className="p-2">{adj.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 作業履歴一覧 */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3 text-balance">作業履歴</h4>
              {inventoryLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-pretty">作業履歴がありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">日時</th>
                        <th className="p-2 text-left">作業者</th>
                        <th className="p-2 text-right">数量</th>
                        <th className="p-2 text-right">ロス</th>
                        <th className="p-2 text-left">備考</th>
                        <th className="p-2 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log) => {
                        const worker = workers.find((w) => w.worker_id === log.worker_id);
                        const isEditing = editingLogId === log.log_id;

                        return (
                          <tr key={log.log_id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              {new Date(log.created_at).toLocaleDateString('ja-JP', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-2">{worker?.name || '不明'}</td>
                            <td className="p-2 text-right tabular-nums">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.quantity}
                                  onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                                  className="w-20 p-1 border rounded text-right tabular-nums"
                                />
                              ) : (
                                log.quantity
                              )}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.loss_quantity}
                                  onChange={(e) => setEditFormData({ ...editFormData, loss_quantity: parseInt(e.target.value) || 0 })}
                                  className="w-20 p-1 border rounded text-right tabular-nums"
                                />
                              ) : (
                                log.loss_quantity
                              )}
                            </td>
                            <td className="p-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.note}
                                  onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                                  className="w-full p-1 border rounded"
                                />
                              ) : (
                                log.note || '-'
                              )}
                            </td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => saveEditLog(log.log_id)}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={cancelEditLog}
                                    className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => startEditLog(log)}
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                  >
                                    編集
                                  </button>
                                  <button
                                    onClick={() => deleteLog(log.log_id)}
                                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  >
                                    削除
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 閉じるボタン */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

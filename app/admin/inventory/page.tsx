'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation, ProductVariant, InventoryAdjustment } from '@/lib/types/database';

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

interface VariantInventory {
  variant_id: string;
  variant_name: string;
  inventory: number;
}

interface OperationInventory {
  operation_id: string;
  operation_name: string;
  order_index: number;
  inventory: number;
  variants?: VariantInventory[];
}

interface PartInventory {
  part_id: string;
  part_name: string;
  operations: OperationInventory[];
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
    fetchData();
  }, []);

  const [bomConsumptions, setBomConsumptions] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partsRes, operationsRes, logsRes, workersRes, consumptionsRes, bomRes, variantsRes, adjustmentsRes, opAttrsRes, vAttrsRes, vAttrValsRes, processConsRes, orderConsRes] = await Promise.all([
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parts.length > 0 && operations.length > 0 && logs.length > 0) {
      calculateInventory();
    }
  }, [parts, operations, logs, adjustments, processConsumptions, orderConsumptions]);

  const calculateInventory = () => {
    const inventoryData: PartInventory[] = [];

    parts.forEach((part) => {
      const partOperations = operations.filter((op) => op.part_id === part.part_id);

      // 各工程の累計生産数を計算（良品数と総数の両方）
      const operationTotals = partOperations.map((op) => {
        const goodTotal = logs
          .filter((log) => log.operation_id === op.operation_id)
          .reduce((sum, log) => sum + (log.quantity - log.loss_quantity), 0);
        const totalQuantity = logs
          .filter((log) => log.operation_id === op.operation_id)
          .reduce((sum, log) => sum + log.quantity, 0);
        return {
          operation_id: op.operation_id,
          operation_name: op.name,
          order_index: op.order_index,
          goodTotal,
          totalQuantity,
        };
      });

      // order_indexでソート
      operationTotals.sort((a, b) => a.order_index - b.order_index);

      // 各工程の在庫を計算（前工程の良品数 - 自工程の総数 - BOM消費数 + 在庫調整）
      const operationInventories: OperationInventory[] = operationTotals.map((op, index) => {
        const nextOp = operationTotals[index + 1];
        // 前工程の良品数 - 次工程の総数（ロス含む） = 基本在庫
        let inventory = nextOp ? op.goodTotal - nextOp.totalQuantity : op.goodTotal;

        // BOM消費数を引く：この部品が他の工程で消費された数
        const consumed = bomConsumptions
          .filter((c) => c.consumed_part_id === part.part_id)
          .reduce((sum, c) => sum + c.consumed_quantity, 0);

        // 最終工程の在庫からのみBOM消費を引く
        if (!nextOp) {
          inventory -= consumed;
        }

        // 在庫調整を反映
        const adjustmentTotal = adjustments
          .filter((adj) => adj.operation_id === op.operation_id)
          .reduce((sum, adj) => sum + adj.adjustment_quantity, 0);
        inventory += adjustmentTotal;

        // 受注消費を反映（納品完了時に最終工程から減る在庫）
        const orderConsumedTotal = orderConsumptions
          .filter((cons) => cons.operation_id === op.operation_id)
          .reduce((sum, cons) => sum + cons.consumed_quantity, 0);
        inventory -= orderConsumedTotal;

        // 属性値別在庫を計算
        let variantInventories: VariantInventory[] = [];

        // この工程に設定されている属性を確認
        const opAttrs = operationAttributes.filter(oa => oa.operation_id === op.operation_id);

        if (opAttrs.length > 0) {
          // 属性が設定されている場合、属性値の組み合わせごとに在庫を計算
          const attributeIds = opAttrs.map(oa => oa.attribute_id);

          // この工程のログを取得
          const opLogs = logs.filter(log => log.operation_id === op.operation_id);

          // 属性値の組み合わせごとにグループ化
          const combinationMap = new Map<string, { valueIds: string[]; valueName: string; inventory: number }>();

          // 作業ログから集計
          opLogs.forEach(log => {
            if (!log.work_log_attributes || log.work_log_attributes.length === 0) {
              // 属性値が記録されていないログは「未分類」として扱う
              const key = 'uncategorized';
              const existing = combinationMap.get(key) || { valueIds: [], valueName: '未分類', inventory: 0 };
              existing.inventory += (log.quantity - log.loss_quantity);
              combinationMap.set(key, existing);
            } else {
              // 属性値の組み合わせをキーとして使う
              const logValueIds = log.work_log_attributes
                .map((attr: any) => attr.value_id)
                .filter((id: string) => id)
                .sort();

              const key = logValueIds.join('|');

              if (!combinationMap.has(key)) {
                // 属性値名を作成
                const valueNames = log.work_log_attributes
                  .filter((attr: any) => attr.variant_attribute_values)
                  .map((attr: any) => {
                    const attrData = attr.variant_attribute_values;
                    return `${attrData.variant_attributes?.name || ''}:${attrData.name || ''}`;
                  })
                  .join(', ');

                combinationMap.set(key, {
                  valueIds: logValueIds,
                  valueName: valueNames || '不明',
                  inventory: 0
                });
              }

              const existing = combinationMap.get(key)!;
              existing.inventory += (log.quantity - log.loss_quantity);
            }
          });

          // 在庫調整も属性値ごとに反映
          const opAdjustments = adjustments.filter(adj => adj.operation_id === op.operation_id);
          opAdjustments.forEach((adj: any) => {
            if (!adj.inventory_adjustment_attributes || adj.inventory_adjustment_attributes.length === 0) {
              // 属性値が記録されていない在庫調整は「未分類」として扱う
              const key = 'uncategorized';
              const existing = combinationMap.get(key) || { valueIds: [], valueName: '未分類', inventory: 0 };
              existing.inventory += adj.adjustment_quantity;
              combinationMap.set(key, existing);
            } else {
              // 属性値の組み合わせをキーとして使う
              const adjValueIds = adj.inventory_adjustment_attributes
                .map((attr: any) => attr.value_id)
                .filter((id: string) => id)
                .sort();

              const key = adjValueIds.join('|');

              if (!combinationMap.has(key)) {
                // 属性値名を作成
                const valueNames = adj.inventory_adjustment_attributes
                  .filter((attr: any) => attr.variant_attribute_values)
                  .map((attr: any) => {
                    const attrData = attr.variant_attribute_values;
                    return `${attrData.variant_attributes?.name || ''}:${attrData.name || ''}`;
                  })
                  .join(', ');

                combinationMap.set(key, {
                  valueIds: adjValueIds,
                  valueName: valueNames || '不明',
                  inventory: 0
                });
              }

              const existing = combinationMap.get(key)!;
              existing.inventory += adj.adjustment_quantity;
            }
          });

          // 工程間消費も属性値ごとに反映（この工程で消費された分を引く）
          const opConsumptions = processConsumptions.filter(pc => pc.consumed_operation_id === op.operation_id);
          opConsumptions.forEach((cons: any) => {
            if (!cons.consumed_attribute_values || Object.keys(cons.consumed_attribute_values).length === 0) {
              // 属性値が記録されていない消費は「未分類」から引く
              const key = 'uncategorized';
              const existing = combinationMap.get(key);
              if (existing) {
                existing.inventory -= cons.consumed_quantity;
              }
            } else {
              // 属性値の組み合わせをキーとして使う
              const consValueIds = Object.values(cons.consumed_attribute_values as Record<string, string>)
                .filter((id: any) => id)
                .sort();

              const key = consValueIds.join('|');
              const existing = combinationMap.get(key);
              if (existing) {
                existing.inventory -= cons.consumed_quantity;
              }
            }
          });

          // 受注消費も属性値ごとに反映（納品完了時に消費された分を引く）
          const opOrderConsumptions = orderConsumptions.filter(oc => oc.operation_id === op.operation_id);
          opOrderConsumptions.forEach((cons: any) => {
            if (!cons.consumed_attribute_values || Object.keys(cons.consumed_attribute_values).length === 0) {
              // 属性値が記録されていない消費は「未分類」から引く
              const key = 'uncategorized';
              const existing = combinationMap.get(key);
              if (existing) {
                existing.inventory -= cons.consumed_quantity;
              }
            } else {
              // 属性値の組み合わせをキーとして使う
              const consValueIds = Object.values(cons.consumed_attribute_values as Record<string, string>)
                .filter((id: any) => id)
                .sort();

              const key = consValueIds.join('|');
              const existing = combinationMap.get(key);
              if (existing) {
                existing.inventory -= cons.consumed_quantity;
              }
            }
          });

          // Map を配列に変換
          variantInventories = Array.from(combinationMap.entries())
            .filter(([_, data]) => data.inventory > 0)
            .map(([key, data]) => ({
              variant_id: key,
              variant_name: data.valueName,
              inventory: data.inventory,
            }));
        } else {
          // 属性が設定されていない場合は、旧システムのバリエーションを使用
          const partVariants = variants.filter(v => v.base_part_id === part.part_id);
          variantInventories = partVariants.map(variant => {
            const variantLogs = logs.filter(log =>
              log.operation_id === op.operation_id &&
              log.variant_id === variant.variant_id
            );
            const variantGood = variantLogs.reduce((sum, log) => sum + (log.quantity - log.loss_quantity), 0);

            return {
              variant_id: variant.variant_id,
              variant_name: variant.display_name,
              inventory: variantGood,
            };
          }).filter(v => v.inventory > 0);
        }

        return {
          operation_id: op.operation_id,
          operation_name: op.operation_name,
          order_index: op.order_index,
          inventory,
          variants: variantInventories.length > 0 ? variantInventories : undefined,
        };
      });

      // 在庫が1個以上ある工程のみフィルタ、工程順にソート
      const inventoryOperations = operationInventories
        .filter((op) => op.inventory > 0)
        .sort((a, b) => a.order_index - b.order_index); // 工程順

      // 在庫の有無に関わらず、全ての部品を表示
      inventoryData.push({
        part_id: part.part_id,
        part_name: part.name,
        operations: inventoryOperations, // 空配列でもOK
      });
    });

    setInventory(inventoryData);
  };

  const openModal = (partId: string) => {
    setSelectedPartId(partId);
    setSelectedOperationId(null);
    setAdjustmentQuantity('');
    setAdjustmentNote('');
    setSelectedAdjustmentAttributeValues({});
    setShowModal(true);
    setMessage(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPartId(null);
    setSelectedOperationId(null);
    setAdjustmentQuantity('');
    setAdjustmentNote('');
    setSelectedAdjustmentAttributeValues({});
  };

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

  const getPartOperations = (partId: string) => {
    return operations.filter((op) => op.part_id === partId).sort((a, b) => a.order_index - b.order_index);
  };

  const getPartName = (partId: string) => {
    return parts.find((p) => p.part_id === partId)?.name || '';
  };

  // 在庫詳細モーダルを開く
  const openDetailModal = async (partId: string, partName: string, operationId: string, operationName: string, inventory: number) => {
    setSelectedInventoryDetail({
      partId,
      partName,
      operationId,
      operationName,
      inventory,
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
  };

  // 在庫詳細モーダルを閉じる
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedInventoryDetail(null);
    setInventoryLogs([]);
    setInventoryAdjustmentLogs([]);
    setEditingLogId(null);
    setEditFormData({ quantity: 0, loss_quantity: 0, note: '' });
  };

  // 作業履歴の編集開始
  const startEditLog = (log: WorkLog) => {
    setEditingLogId(log.log_id);
    setEditFormData({
      quantity: log.quantity,
      loss_quantity: log.loss_quantity,
      note: log.note || '',
    });
  };

  // 作業履歴の編集をキャンセル
  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditFormData({ quantity: 0, loss_quantity: 0, note: '' });
  };

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

      alert('更新しました');
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
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

      alert('削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 完成品（三味線）を作るのに必要な部品の個数を取得
  const getShamisen組Count = (partId: string, inventory: number) => {
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
  };

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
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">工程別在庫状況</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">
          各部品の工程ごとの在庫数を表示しています（在庫0の工程は非表示）
        </p>
      </div>

      <div className="space-y-6">
        {/* 胴グループ */}
        {inventory.some(p => p.part_name.startsWith('胴')) && (
          <div className="bg-gray-100 rounded-lg p-3 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">【胴】</h2>

            {inventory.filter(p => p.part_name.startsWith('胴')).map((partData) => (
              <div key={partData.part_id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-700">
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
                          onClick={() => openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory)}
                          className="bg-white rounded-lg border-2 border-gray-300 p-2 md:p-3 shadow hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                        >
                          <div className="text-xs text-gray-600 mb-1">
                            {op.operation_name}
                          </div>
                          <div className="text-xl md:text-2xl font-bold text-blue-600">
                            {op.inventory}
                            <span className="text-xs md:text-sm text-gray-600 ml-1">個</span>
                          </div>
                          {op.variants && op.variants.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {op.variants.map(v => (
                                <div key={v.variant_id} className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                  <span className="text-orange-800 font-medium">{v.variant_name}</span>
                                  <span className="text-orange-600 ml-1">× {v.inventory}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {shamisenInfo && (
                            <div className="text-xs text-gray-500 mt-1">
                              ({shamisenInfo.unit}{shamisenInfo.count}{shamisenInfo.unit === '三味線' ? '台' : '個'}分
                              {shamisenInfo.remainder > 0 && ` +余り${shamisenInfo.remainder}個`})
                              <div className="text-xs text-gray-400 mt-0.5">
                                ※{shamisenInfo.unit}1{shamisenInfo.unit === '三味線' ? '台' : '個'}あたり{shamisenInfo.unitCount}個
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-3 text-sm">
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
                <h2 className="text-lg md:text-xl font-bold text-gray-800">
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
                        onClick={() => openDetailModal(partData.part_id, partData.part_name, op.operation_id, op.operation_name, op.inventory)}
                        className="bg-white rounded-lg border-2 border-gray-300 p-2 md:p-4 shadow hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                      >
                        <div className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                          {op.operation_name}
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-blue-600">
                          {op.inventory}
                          <span className="text-sm md:text-lg text-gray-600 ml-1">個</span>
                        </div>
                        {op.variants && op.variants.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {op.variants.map(v => (
                              <div key={v.variant_id} className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                <span className="text-orange-800 font-medium">{v.variant_name}</span>
                                <span className="text-orange-600 ml-1">× {v.inventory}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {shamisenInfo && (
                          <div className="text-xs text-gray-500 mt-1">
                            ({shamisenInfo.unit}{shamisenInfo.count}{shamisenInfo.unit === '三味線' ? '台' : '個'}分
                            {shamisenInfo.remainder > 0 && ` +余り${shamisenInfo.remainder}個`})
                            <div className="text-xs text-gray-400 mt-0.5">
                              ※{shamisenInfo.unit}1{shamisenInfo.unit === '三味線' ? '台' : '個'}あたり{shamisenInfo.unitCount}個
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
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
            <h3 className="text-xl font-bold text-gray-800 mb-4">
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
                type="number"
                min="1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8">
            {/* ヘッダー */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedInventoryDetail.partName} - {selectedInventoryDetail.operationName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  現在の在庫: <span className="text-2xl font-bold text-blue-600">{selectedInventoryDetail.inventory}</span> 個
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* 在庫調整セクション */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">在庫調整</h4>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  className="flex-1 p-3 border-2 border-gray-300 rounded-lg"
                  placeholder="調整する数量を入力（マイナス可）"
                />
                <button
                  onClick={async () => {
                    const qty = parseInt(adjustmentQuantity);
                    if (!qty || qty === 0) {
                      alert('数量を入力してください');
                      return;
                    }

                    const systemWorker = workers.find((w) => w.name === 'システム');
                    if (!systemWorker) {
                      alert('システム作業者が見つかりません');
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
                      alert('在庫調整を保存しました');
                    } catch (error) {
                      console.error('保存エラー:', error);
                      alert('保存に失敗しました');
                    }
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  調整
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                ※ プラス値で在庫追加、マイナス値で在庫減少します
              </p>
            </div>

            {/* 在庫調整履歴一覧 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">在庫調整履歴</h4>
              {inventoryAdjustmentLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">在庫調整履歴がありません</p>
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
                          <td className={`p-2 text-right font-semibold ${adj.adjustment_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
              <h4 className="text-lg font-semibold text-gray-800 mb-3">作業履歴</h4>
              {inventoryLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">作業履歴がありません</p>
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
                            <td className="p-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.quantity}
                                  onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                                  className="w-20 p-1 border rounded text-right"
                                />
                              ) : (
                                log.quantity
                              )}
                            </td>
                            <td className="p-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.loss_quantity}
                                  onChange={(e) => setEditFormData({ ...editFormData, loss_quantity: parseInt(e.target.value) || 0 })}
                                  className="w-20 p-1 border rounded text-right"
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

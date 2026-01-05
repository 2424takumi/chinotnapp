'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation } from '@/lib/types/database';

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
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface OperationInventory {
  operation_id: string;
  operation_name: string;
  order_index: number;
  inventory: number;
}

interface PartInventory {
  part_id: string;
  part_name: string;
  operations: OperationInventory[];
}

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [inventory, setInventory] = useState<PartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);

  // モーダル関連のstate
  const [showModal, setShowModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const [bomConsumptions, setBomConsumptions] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partsRes, operationsRes, logsRes, workersRes, consumptionsRes, bomRes] = await Promise.all([
        supabase.from('parts').select('*').eq('active', true).order('order_index'),
        supabase.from('operations').select('*').eq('active', true).order('order_index'),
        supabase.from('work_logs').select('*').eq('is_deleted', false),
        supabase.from('workers').select('*').eq('active', true),
        supabase.from('bom_consumption').select('*'),
        supabase.from('bom').select('*'),
      ]);

      if (partsRes.data) setParts(partsRes.data);
      if (operationsRes.data) setOperations(operationsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (workersRes.data) setWorkers(workersRes.data);
      if (consumptionsRes.data) setBomConsumptions(consumptionsRes.data);
      if (bomRes.data) setBomData(bomRes.data);
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
  }, [parts, operations, logs]);

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

      // 各工程の在庫を計算（前工程の良品数 - 自工程の総数 - BOM消費数）
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

        return {
          operation_id: op.operation_id,
          operation_name: op.operation_name,
          order_index: op.order_index,
          inventory,
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
    setShowModal(true);
    setMessage(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPartId(null);
    setSelectedOperationId(null);
    setAdjustmentQuantity('');
    setAdjustmentNote('');
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

    // システム作業者を取得
    const systemWorker = workers.find((w) => w.name === 'システム');
    if (!systemWorker) {
      setMessage({ type: 'error', text: 'システム作業者が見つかりません。データベースにシステム作業者を追加してください。' });
      return;
    }

    setSaving(true);
    try {
      const noteText = adjustmentNote ? `[在庫調整] ${adjustmentNote}` : '[在庫調整]';

      // @ts-ignore
      const { error } = await supabase.from('work_logs').insert({
        worker_id: systemWorker.worker_id,
        part_id: selectedPartId,
        operation_id: selectedOperationId,
        duration_minutes: 1, // 在庫調整は1分として記録（0は制約違反のため）
        quantity: qty,
        loss_quantity: 0,
        note: noteText,
      });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">工程別在庫状況</h1>
        <p className="text-sm text-gray-600 mt-2">
          各部品の工程ごとの在庫数を表示しています（在庫0の工程は非表示）
        </p>
      </div>

      <div className="space-y-6">
        {/* 胴グループ */}
        {inventory.some(p => p.part_name.startsWith('胴')) && (
          <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">【胴】</h2>

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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {partData.operations.map((op) => {
                      const shamisenInfo = getShamisen組Count(partData.part_id, op.inventory);
                      return (
                        <div
                          key={op.operation_id}
                          className="bg-white rounded-lg border-2 border-gray-300 p-3 shadow hover:shadow-md transition-shadow"
                        >
                          <div className="text-xs text-gray-600 mb-1">
                            {op.operation_name}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {op.inventory}
                            <span className="text-sm text-gray-600 ml-1">個</span>
                          </div>
                          {shamisenInfo && (
                            <div className="text-xs text-gray-500 mt-1">
                              ({shamisenInfo.unit}{shamisenInfo.count}{shamisenInfo.unit === '三味線' ? '台' : '個'}分
                              {shamisenInfo.remainder > 0 && ` +余り${shamisenInfo.remainder}個`})
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
              className="bg-gray-100 rounded-lg p-6 shadow-sm"
            >
              {/* 部品名ヘッダーと在庫追加ボタン */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  【{partData.part_name}】
                </h2>
                <button
                  onClick={() => openModal(partData.part_id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + 在庫追加
                </button>
              </div>

              {/* 工程カード群 */}
              {partData.operations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {partData.operations.map((op) => {
                    const shamisenInfo = getShamisen組Count(partData.part_id, op.inventory);
                    return (
                      <div
                        key={op.operation_id}
                        className="bg-white rounded-lg border-2 border-gray-300 p-4 shadow hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm text-gray-600 mb-2">
                          {op.operation_name}
                        </div>
                        <div className="text-3xl font-bold text-blue-600">
                          {op.inventory}
                          <span className="text-lg text-gray-600 ml-1">個</span>
                        </div>
                        {shamisenInfo && (
                          <div className="text-xs text-gray-500 mt-1">
                            ({shamisenInfo.unit}{shamisenInfo.count}{shamisenInfo.unit === '三味線' ? '台' : '個'}分
                            {shamisenInfo.remainder > 0 && ` +余り${shamisenInfo.remainder}個`})
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
    </div>
  );
}

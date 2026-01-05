'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation } from '@/lib/types/database';

export default function Home() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);

  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('0');
  const [quantity, setQuantity] = useState<string>('');
  const [lossQuantity, setLossQuantity] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [workDate, setWorkDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  ); // デフォルトは今日

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // マスタデータ取得
  useEffect(() => {
    fetchMasterData();
  }, []);

  // 部品選択時に工程を絞り込み
  useEffect(() => {
    if (selectedPart) {
      fetchOperations(selectedPart);
      setSelectedOperation(null); // 工程リセット
    }
  }, [selectedPart]);

  const fetchMasterData = async () => {
    try {
      const [workersRes, partsRes] = await Promise.all([
        supabase.from('workers').select('*').eq('active', true).order('order_index'),
        supabase.from('parts').select('*').eq('active', true).order('order_index'),
      ]);

      if (workersRes.data) setWorkers(workersRes.data);
      if (partsRes.data) setParts(partsRes.data);
    } catch (error) {
      console.error('マスタ取得エラー:', error);
    }
  };

  const fetchOperations = async (partId: string) => {
    try {
      const { data } = await supabase
        .from('operations')
        .select('*')
        .eq('part_id', partId)
        .eq('active', true)
        .order('order_index');

      if (data) setOperations(data);
    } catch (error) {
      console.error('工程取得エラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // バリデーション
    if (!selectedWorker || !selectedPart || !selectedOperation) {
      setMessage({ type: 'error', text: '作業者・部品・工程を選択してください' });
      return;
    }

    const durationMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const qty = parseInt(quantity);
    const loss = parseInt(lossQuantity);

    if (durationMinutes <= 0) {
      setMessage({ type: 'error', text: '作業時間を入力してください' });
      return;
    }

    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: '数量を入力してください' });
      return;
    }

    if (loss < 0) {
      setMessage({ type: 'error', text: 'ロス数は0以上で入力してください' });
      return;
    }

    if (loss > qty) {
      setMessage({ type: 'error', text: 'ロス数は数量以下で入力してください' });
      return;
    }

    // 保存
    setLoading(true);
    try {
      // 1. BOMをチェック：この工程で消費する部品があるか確認
      const { data: bomData } = await supabase
        .from('bom')
        .select('*, consumed_part:parts!consumed_part_id(name)')
        .eq('operation_id', selectedOperation);

      // 2. work_logを保存
      // @ts-ignore
      const { data: workLogData, error: workLogError } = await supabase
        .from('work_logs')
        .insert({
          worker_id: selectedWorker,
          part_id: selectedPart,
          operation_id: selectedOperation,
          duration_minutes: durationMinutes,
          quantity: qty,
          loss_quantity: loss,
          note: note || null,
          work_date: workDate,
        })
        .select('log_id')
        .single();

      if (workLogError) throw workLogError;

      // 3. BOMがある場合、消費記録を作成
      if (bomData && bomData.length > 0 && workLogData) {
        const consumptions = bomData.map((bom) => ({
          work_log_id: workLogData.log_id,
          consumed_part_id: bom.consumed_part_id,
          consumed_quantity: bom.quantity_per_unit * qty,
        }));

        // @ts-ignore
        const { error: consumptionError } = await supabase
          .from('bom_consumption')
          .insert(consumptions);

        if (consumptionError) throw consumptionError;
      }

      setMessage({ type: 'success', text: '保存しました' });

      // フォームを完全にリセット
      setSelectedWorker(null);
      setSelectedPart(null);
      setSelectedOperation(null);
      setOperations([]);
      setHours('0');
      setMinutes('0');
      setQuantity('');
      setLossQuantity('0');
      setNote('');
      setWorkDate(new Date().toISOString().split('T')[0]); // 今日にリセット

      // 成功メッセージを3秒後に消す
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedWorkerName = () => workers.find(w => w.worker_id === selectedWorker)?.name || '';
  const getSelectedPartName = () => parts.find(p => p.part_id === selectedPart)?.name || '';

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">小じゃみチントン 作業記録</h1>
            {selectedWorker && (
              <p className="text-sm mt-1">作業者: {getSelectedWorkerName()}</p>
            )}
          </div>
          <a
            href="/admin"
            className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            管理画面
          </a>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* メッセージ */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 作業者選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">作業者</label>
            <div className="grid grid-cols-2 gap-2">
              {workers.map((worker) => (
                <button
                  key={worker.worker_id}
                  type="button"
                  onClick={() => setSelectedWorker(worker.worker_id)}
                  className={`p-4 rounded-lg border-2 font-medium transition-colors ${
                    selectedWorker === worker.worker_id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {worker.name}
                </button>
              ))}
            </div>
          </div>

          {/* 部品選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">部品</label>

            {/* 胴グループ */}
            {parts.some(p => p.name.startsWith('胴')) && (
              <div className="mb-4">
                <div className="text-xs text-gray-600 mb-2">▼ 胴</div>
                <div className="grid grid-cols-2 gap-2 ml-2">
                  {parts.filter(p => p.name.startsWith('胴')).map((part) => (
                    <button
                      key={part.part_id}
                      type="button"
                      onClick={() => setSelectedPart(part.part_id)}
                      className={`p-4 rounded-lg border-2 font-medium transition-colors ${
                        selectedPart === part.part_id
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {part.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* その他の部品 */}
            <div className="grid grid-cols-2 gap-2">
              {parts.filter(p => !p.name.startsWith('胴')).map((part) => (
                <button
                  key={part.part_id}
                  type="button"
                  onClick={() => setSelectedPart(part.part_id)}
                  className={`p-4 rounded-lg border-2 font-medium transition-colors ${
                    selectedPart === part.part_id
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {part.name}
                </button>
              ))}
            </div>
          </div>

          {/* 工程選択 */}
          {selectedPart && (
            <div>
              <label className="block text-sm font-medium mb-2">
                工程（{getSelectedPartName()}）
              </label>
              <div className="grid grid-cols-2 gap-2">
                {operations.map((operation) => (
                  <button
                    key={operation.operation_id}
                    type="button"
                    onClick={() => setSelectedOperation(operation.operation_id)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedOperation === operation.operation_id
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {operation.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 作業日 */}
          <div>
            <label className="block text-sm font-medium mb-2">作業日</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg"
            />
          </div>

          {/* 作業時間 */}
          <div>
            <label className="block text-sm font-medium mb-2">作業時間</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-20 p-3 border-2 border-gray-300 rounded-lg text-center"
              />
              <span className="text-sm">時間</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-20 p-3 border-2 border-gray-300 rounded-lg text-center"
              />
              <span className="text-sm">分</span>
            </div>
          </div>

          {/* 数量 */}
          <div>
            <label className="block text-sm font-medium mb-2">数量</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg"
              placeholder="生産数量を入力"
            />
          </div>

          {/* ロス数 */}
          <div>
            <label className="block text-sm font-medium mb-2">ロス数（不良品数）</label>
            <input
              type="number"
              min="0"
              value={lossQuantity}
              onChange={(e) => setLossQuantity(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium mb-2">備考（任意）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg"
              rows={3}
              placeholder="メモがあれば記入"
            />
          </div>

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </form>

        {/* 管理画面リンク */}
        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-blue-600 hover:underline text-sm"
          >
            管理画面へ
          </a>
        </div>
      </div>
    </main>
  );
}

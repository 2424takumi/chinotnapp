'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation } from '@/lib/types/database';

interface WorkLogDetail {
  log_id: string;
  worker_id: string;
  worker_name: string;
  part_id: string;
  part_name: string;
  operation_id: string;
  operation_name: string;
  duration_minutes: number;
  quantity: number;
  loss_quantity: number;
  note: string | null;
  work_date: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<WorkLogDetail[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  const [filterWorker, setFilterWorker] = useState<string>('');
  const [filterPart, setFilterPart] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLogDetail | null>(null);

  useEffect(() => {
    fetchMasterData();
    fetchLogs();
  }, []);

  const fetchMasterData = async () => {
    const [workersRes, partsRes, operationsRes] = await Promise.all([
      supabase.from('workers').select('*').order('order_index'),
      supabase.from('parts').select('*').order('order_index'),
      supabase.from('operations').select('*').order('order_index'),
    ]);

    if (workersRes.data) setWorkers(workersRes.data);
    if (partsRes.data) setParts(partsRes.data);
    if (operationsRes.data) setOperations(operationsRes.data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          workers(name),
          parts(name),
          operations(name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (filterWorker) query = query.eq('worker_id', filterWorker);
      if (filterPart) query = query.eq('part_id', filterPart);
      if (filterOperation) query = query.eq('operation_id', filterOperation);
      if (filterDateFrom) query = query.gte('created_at', `${filterDateFrom}T00:00:00`);
      if (filterDateTo) query = query.lte('created_at', `${filterDateTo}T23:59:59`);

      const { data, error } = await query;

      if (error) throw error;

      const formattedLogs: WorkLogDetail[] = (data || []).map((log: any) => ({
        log_id: log.log_id,
        worker_id: log.worker_id,
        worker_name: log.workers?.name || '不明',
        part_id: log.part_id,
        part_name: log.parts?.name || '不明',
        operation_id: log.operation_id,
        operation_name: log.operations?.name || '不明',
        duration_minutes: log.duration_minutes,
        quantity: log.quantity,
        loss_quantity: log.loss_quantity,
        note: log.note,
        work_date: log.work_date,
        created_at: log.created_at,
        updated_at: log.updated_at,
        updated_by: log.updated_by,
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('ログ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('このログを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .update({ is_deleted: true, updated_by: 'admin', updated_at: new Date().toISOString() })
        .eq('log_id', logId);

      if (error) throw error;

      alert('削除しました');
      fetchLogs();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      '作業日',
      '記録日時',
      '作業者',
      '部品',
      '工程',
      '作業時間(分)',
      '数量',
      'ロス数',
      '良品数',
      '分/個',
      '分/良品',
      '備考',
    ];

    const rows = logs.map((log) => {
      const goodQty = log.quantity - log.loss_quantity;
      const minPerPiece = (log.duration_minutes / log.quantity).toFixed(2);
      const minPerGood = goodQty > 0 ? (log.duration_minutes / goodQty).toFixed(2) : '—';

      return [
        log.work_date,
        new Date(log.created_at).toLocaleString('ja-JP'),
        log.worker_name,
        log.part_name,
        log.operation_name,
        log.duration_minutes,
        log.quantity,
        log.loss_quantity,
        goodQty,
        minPerPiece,
        minPerGood,
        log.note || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold">実績一覧</h2>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-3 py-2 md:px-4 text-sm md:text-base rounded hover:bg-green-700"
        >
          CSV出力
        </button>
      </div>

      {/* フィルタ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-3">フィルタ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm mb-1">作業者</label>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">すべて</option>
              {workers.map((w) => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">部品</label>
            <select
              value={filterPart}
              onChange={(e) => setFilterPart(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">すべて</option>
              {parts.map((p) => (
                <option key={p.part_id} value={p.part_id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">工程</label>
            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">すべて</option>
              {operations.map((o) => (
                <option key={o.operation_id} value={o.operation_id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">開始日</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">終了日</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={fetchLogs}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            検索
          </button>
        </div>
      </div>

      {/* ログ一覧 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">読み込み中...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">データがありません</div>
      ) : (
        <>
          {/* スマホ表示：カード形式 */}
          <div className="md:hidden space-y-4">
            {logs.map((log) => {
              const goodQty = log.quantity - log.loss_quantity;
              const minPerPiece = (log.duration_minutes / log.quantity).toFixed(2);
              const minPerGood = goodQty > 0 ? (log.duration_minutes / goodQty).toFixed(2) : '—';

              return (
                <div key={log.log_id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg text-blue-600">{log.part_name}</div>
                      <div className="text-sm text-gray-600">{log.operation_name}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(log.log_id)}
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-600 rounded"
                    >
                      削除
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-gray-600">作業日:</span> {log.work_date}
                    </div>
                    <div>
                      <span className="text-gray-600">作業者:</span> {log.worker_name}
                    </div>
                    <div>
                      <span className="text-gray-600">作業時間:</span> {log.duration_minutes}分
                    </div>
                    <div>
                      <span className="text-gray-600">数量:</span> {log.quantity}個
                    </div>
                    <div>
                      <span className="text-gray-600">ロス数:</span> {log.loss_quantity}個
                    </div>
                    <div>
                      <span className="text-gray-600">良品数:</span> {goodQty}個
                    </div>
                    <div>
                      <span className="text-gray-600">分/個:</span> {minPerPiece}
                    </div>
                    <div>
                      <span className="text-gray-600">分/良品:</span> {minPerGood}
                    </div>
                  </div>

                  {log.note && (
                    <div className="text-sm text-gray-600 mt-2 pt-2 border-t">
                      <span className="font-medium">備考:</span> {log.note}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    記録: {new Date(log.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PC表示：テーブル形式 */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">作業日</th>
                    <th className="px-4 py-3 text-left">記録日時</th>
                    <th className="px-4 py-3 text-left">作業者</th>
                    <th className="px-4 py-3 text-left">部品</th>
                    <th className="px-4 py-3 text-left">工程</th>
                    <th className="px-4 py-3 text-right">作業時間(分)</th>
                    <th className="px-4 py-3 text-right">数量</th>
                    <th className="px-4 py-3 text-right">ロス数</th>
                    <th className="px-4 py-3 text-right">良品数</th>
                    <th className="px-4 py-3 text-right">分/個</th>
                    <th className="px-4 py-3 text-right">分/良品</th>
                    <th className="px-4 py-3 text-left">備考</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => {
                    const goodQty = log.quantity - log.loss_quantity;
                    const minPerPiece = (log.duration_minutes / log.quantity).toFixed(2);
                    const minPerGood = goodQty > 0 ? (log.duration_minutes / goodQty).toFixed(2) : '—';

                    return (
                      <tr key={log.log_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.work_date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">{log.worker_name}</td>
                        <td className="px-4 py-3">{log.part_name}</td>
                        <td className="px-4 py-3">{log.operation_name}</td>
                        <td className="px-4 py-3 text-right">{log.duration_minutes}</td>
                        <td className="px-4 py-3 text-right">{log.quantity}</td>
                        <td className="px-4 py-3 text-right">{log.loss_quantity}</td>
                        <td className="px-4 py-3 text-right">{goodQty}</td>
                        <td className="px-4 py-3 text-right">{minPerPiece}</td>
                        <td className="px-4 py-3 text-right">{minPerGood}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.note || '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(log.log_id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="text-sm text-gray-600">
        全{logs.length}件
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface WorkLog {
  worker_id: string;
  worker_name: string;
  part_id: string;
  part_name: string;
  operation_id: string;
  operation_name: string;
  duration_minutes: number;
  quantity: number;
  loss_quantity: number;
  created_at: string;
}

export default function ChartsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterWorker, setFilterWorker] = useState<string>('');
  const [filterPart, setFilterPart] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);

  useEffect(() => {
    // デフォルトで過去7日間
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    setDateFrom(weekAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);

    fetchMasterData();
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchLogs();
    }
  }, [dateFrom, dateTo, filterWorker, filterPart]);

  const fetchMasterData = async () => {
    const [workersRes, partsRes] = await Promise.all([
      supabase.from('workers').select('*').order('order_index'),
      supabase.from('parts').select('*').order('order_index'),
    ]);

    if (workersRes.data) setWorkers(workersRes.data);
    if (partsRes.data) setParts(partsRes.data);
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
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);

      if (filterWorker) query = query.eq('worker_id', filterWorker);
      if (filterPart) query = query.eq('part_id', filterPart);

      const { data } = await query;

      if (data) {
        const formattedLogs: WorkLog[] = data.map((log: any) => ({
          worker_id: log.worker_id,
          worker_name: log.workers?.name || '不明',
          part_id: log.part_id,
          part_name: log.parts?.name || '不明',
          operation_id: log.operation_id,
          operation_name: log.operations?.name || '不明',
          duration_minutes: log.duration_minutes,
          quantity: log.quantity,
          loss_quantity: log.loss_quantity,
          created_at: log.created_at,
        }));
        setLogs(formattedLogs);
      }
    } catch (error) {
      console.error('ログ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 最新日サマリー: 工程別×作業者別の生産数
  const getLatestDaySummary = () => {
    if (logs.length === 0) {
      return { chartData: [], totalTime: 0, totalQty: 0, totalGood: 0, date: '', workers: [] };
    }

    // 最新の日付を取得
    const allDates = logs.map((log) => new Date(log.created_at).toISOString().split('T')[0]);
    const latestDate = allDates.sort().reverse()[0];

    const latestLogs = logs.filter((log) => {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      return logDate === latestDate;
    });

    if (latestLogs.length === 0) {
      return { chartData: [], totalTime: 0, totalQty: 0, totalGood: 0, date: latestDate, workers: [] };
    }

    // 工程別×作業者別の集計
    const operationWorkerMap = new Map<string, Map<string, number>>();
    let totalTime = 0;
    let totalQty = 0;
    let totalLoss = 0;

    latestLogs.forEach((log) => {
      const key = log.operation_name;
      if (!operationWorkerMap.has(key)) {
        operationWorkerMap.set(key, new Map());
      }
      const workerMap = operationWorkerMap.get(key)!;
      const current = workerMap.get(log.worker_name) || 0;
      workerMap.set(log.worker_name, current + log.quantity);

      totalTime += log.duration_minutes;
      totalQty += log.quantity;
      totalLoss += log.loss_quantity;
    });

    const allWorkers = Array.from(new Set(latestLogs.map((l) => l.worker_name)));
    const chartData = Array.from(operationWorkerMap.entries()).map(([operation, workerMap]) => {
      const row: any = { operation };
      allWorkers.forEach((worker) => {
        row[worker] = workerMap.get(worker) || 0;
      });
      return row;
    });

    return {
      chartData,
      totalTime,
      totalQty,
      totalGood: totalQty - totalLoss,
      date: latestDate,
      workers: allWorkers,
    };
  };

  // グラフ1: 工程ごとの日別生産数
  const getDailyProductionByOperation = () => {
    const dateMap = new Map<string, Map<string, number>>();

    logs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, new Map());
      }
      const operationMap = dateMap.get(date)!;
      const current = operationMap.get(log.operation_name) || 0;
      operationMap.set(log.operation_name, current + log.quantity);
    });

    // すべての工程名を取得
    const allOperations = Array.from(new Set(logs.map((l) => l.operation_name)));

    const chartData = Array.from(dateMap.entries())
      .map(([date, operationMap]) => {
        const row: any = { date };
        allOperations.forEach((op) => {
          row[op] = operationMap.get(op) || 0;
        });
        return row;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return { chartData, operations: allOperations };
  };

  // グラフ2: 人別×工程別の生産性（分/良品）
  const getProductivityMatrix = () => {
    const matrix = new Map<string, Map<string, { minutes: number; good: number }>>();

    logs.forEach((log) => {
      const key = `${log.worker_name}|${log.operation_name}`;
      if (!matrix.has(key)) {
        matrix.set(key, new Map());
      }
      const stats = matrix.get(key)!;
      const current = stats.get('total') || { minutes: 0, good: 0 };
      current.minutes += log.duration_minutes;
      current.good += log.quantity - log.loss_quantity;
      stats.set('total', current);
    });

    const allWorkers = Array.from(new Set(logs.map((l) => l.worker_name)));
    const allOperations = Array.from(new Set(logs.map((l) => l.operation_name)));

    const tableData: any[] = [];
    allOperations.forEach((op) => {
      const row: any = { operation: op };
      allWorkers.forEach((worker) => {
        const key = `${worker}|${op}`;
        const stats = matrix.get(key)?.get('total');
        if (stats && stats.good > 0) {
          row[worker] = (stats.minutes / stats.good).toFixed(1);
        } else {
          row[worker] = '—';
        }
      });
      tableData.push(row);
    });

    return { tableData, workers: allWorkers };
  };

  // グラフ3: 工程別の平均作業時間
  const getAverageTimeByOperation = () => {
    const operationStats = new Map<
      string,
      { total: { minutes: number; qty: number }; byWorker: Map<string, { minutes: number; qty: number }> }
    >();

    logs.forEach((log) => {
      if (!operationStats.has(log.operation_name)) {
        operationStats.set(log.operation_name, {
          total: { minutes: 0, qty: 0 },
          byWorker: new Map(),
        });
      }

      const stats = operationStats.get(log.operation_name)!;
      stats.total.minutes += log.duration_minutes;
      stats.total.qty += log.quantity;

      if (!stats.byWorker.has(log.worker_name)) {
        stats.byWorker.set(log.worker_name, { minutes: 0, qty: 0 });
      }
      const workerStats = stats.byWorker.get(log.worker_name)!;
      workerStats.minutes += log.duration_minutes;
      workerStats.qty += log.quantity;
    });

    const chartData = Array.from(operationStats.entries()).map(([operation, stats]) => {
      const row: any = { operation };
      row['全体平均'] = stats.total.qty > 0 ? (stats.total.minutes / stats.total.qty).toFixed(1) : 0;

      stats.byWorker.forEach((workerStats, workerName) => {
        row[workerName] = workerStats.qty > 0 ? (workerStats.minutes / workerStats.qty).toFixed(1) : 0;
      });

      return row;
    });

    const allWorkers = Array.from(new Set(logs.map((l) => l.worker_name)));
    return { chartData, workers: ['全体平均', ...allWorkers] };
  };

  // グラフ4: 工程別のロス率
  const getLossRateByOperation = () => {
    const operationStats = new Map<string, { quantity: number; loss: number }>();

    logs.forEach((log) => {
      if (!operationStats.has(log.operation_name)) {
        operationStats.set(log.operation_name, { quantity: 0, loss: 0 });
      }
      const stats = operationStats.get(log.operation_name)!;
      stats.quantity += log.quantity;
      stats.loss += log.loss_quantity;
    });

    const chartData = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        lossRate: stats.quantity > 0 ? ((stats.loss / stats.quantity) * 100).toFixed(1) : 0,
        lossRateNum: stats.quantity > 0 ? (stats.loss / stats.quantity) * 100 : 0,
      }))
      .sort((a, b) => b.lossRateNum - a.lossRateNum);

    return chartData;
  };

  const latestDaySummary = getLatestDaySummary();
  const dailyProduction = getDailyProductionByOperation();
  const productivityMatrix = getProductivityMatrix();
  const averageTime = getAverageTimeByOperation();
  const lossRate = getLossRateByOperation();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  // 色をロス率に応じて変更
  const getLossRateColor = (rate: number) => {
    if (rate < 5) return '#10b981'; // 緑
    if (rate < 10) return '#f59e0b'; // 黄
    return '#ef4444'; // 赤
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">生産分析グラフ</h2>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800">選択した期間・条件にデータがありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 最新日の生産実績サマリー */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 md:p-6 rounded-lg shadow-lg">
            <h3 className="text-lg md:text-2xl font-bold mb-4">📊 最新の生産実績 ({latestDaySummary.date})</h3>

            {latestDaySummary.chartData.length === 0 ? (
              <p className="text-blue-100">データがありません</p>
            ) : (
              <>
                {/* 工程別×作業者別の表 */}
                <div className="bg-white rounded-lg p-3 md:p-4 overflow-x-auto">
                  <h4 className="text-gray-800 font-bold mb-3 text-sm md:text-base">
                    工程別の生産数（作業者別） -
                    総作業時間: {formatTime(latestDaySummary.totalTime)} /
                    良品率: {latestDaySummary.totalQty > 0
                      ? ((latestDaySummary.totalGood / latestDaySummary.totalQty) * 100).toFixed(1)
                      : 0}%
                  </h4>
                  <table className="w-full text-xs md:text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold text-gray-700">
                          工程
                        </th>
                        {latestDaySummary.workers.map((worker, idx) => (
                          <th
                            key={worker}
                            className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold"
                            style={{ color: COLORS[idx % COLORS.length] }}
                          >
                            {worker}
                          </th>
                        ))}
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold text-gray-700 bg-gray-50">
                          合計
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestDaySummary.chartData.map((row, idx) => {
                        const total = latestDaySummary.workers.reduce(
                          (sum, worker) => sum + (parseInt(String(row[worker] || 0))),
                          0
                        );
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-medium text-gray-800">
                              {row.operation}
                            </td>
                            {latestDaySummary.workers.map((worker) => {
                              const value = row[worker] || 0;
                              return (
                                <td
                                  key={worker}
                                  className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-sm md:text-lg font-semibold text-gray-800"
                                >
                                  {value}個
                                </td>
                              );
                            })}
                            <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-sm md:text-lg font-bold bg-gray-50 text-gray-800">
                              {total}個
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* フィルタ */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3 text-gray-800">期間・条件で絞り込み</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">開始日</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了日</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">作業者</label>
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
                <label className="block text-sm font-medium mb-1">部品</label>
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
            </div>
          </div>

          {/* グラフ1: 工程ごとの日別生産数 */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-base md:text-lg font-bold mb-2">工程ごとの日別生産数</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">
              各工程の日々の進捗を確認。ボトルネック工程の特定に活用
            </p>
            {dailyProduction.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyProduction.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {dailyProduction.operations.map((op, idx) => (
                    <Line
                      key={op}
                      type="monotone"
                      dataKey={op}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>

          {/* グラフ2: 人別×工程別の生産性 */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-base md:text-lg font-bold mb-2">人別×工程別の生産性（分/良品）</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">
              誰がどの工程が得意か。数値が小さいほど生産性が高い
            </p>
            {productivityMatrix.tableData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-2 md:px-4 py-2 text-left">工程</th>
                      {productivityMatrix.workers.map((worker) => (
                        <th key={worker} className="border px-2 md:px-4 py-2 text-center">
                          {worker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productivityMatrix.tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border px-2 md:px-4 py-2 font-medium">{row.operation}</td>
                        {productivityMatrix.workers.map((worker) => {
                          const value = row[worker];
                          const isNumeric = value !== '—';
                          let bgColor = 'bg-white';
                          if (isNumeric) {
                            const num = parseFloat(value);
                            if (num < 5) bgColor = 'bg-green-100';
                            else if (num < 10) bgColor = 'bg-yellow-100';
                            else bgColor = 'bg-red-100';
                          }
                          return (
                            <td
                              key={worker}
                              className={`border px-2 md:px-4 py-2 text-center ${bgColor}`}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>

          {/* グラフ3: 工程別の平均作業時間 */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-base md:text-lg font-bold mb-2">工程別の平均作業時間（分/個）</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">
              全体平均と人別の比較。納期予測・工数見積もりに活用
            </p>
            {averageTime.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={averageTime.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operation" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {averageTime.workers.map((worker, idx) => (
                    <Bar key={worker} dataKey={worker} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>

          {/* グラフ4: 工程別のロス率 */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-base md:text-lg font-bold mb-2">工程別のロス率（%）</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">
              どの工程でロスが多いか。品質改善の優先順位決定に活用
            </p>
            {lossRate.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={lossRate} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="operation" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="lossRate" name="ロス率（%）">
                    {lossRate.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getLossRateColor(entry.lossRateNum)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>

          {/* サマリー */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>期間：</strong> {dateFrom} 〜 {dateTo} ／{' '}
              <strong>データ件数：</strong> {logs.length}件
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

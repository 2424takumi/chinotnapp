'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getWorkerColorByName } from '@/lib/utils/colors';
import { getPartColorByName } from '@/lib/utils/partColors';
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
  part_order_index: number;
  operation_id: string;
  operation_name: string;
  operation_order_index: number;
  duration_minutes: number;
  quantity: number;
  loss_quantity: number;
  work_date: string;
  created_at: string;
}

// デフォルト日付を計算するユーティリティ
function getDefaultDateRange() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);
  return {
    from: monthAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  };
}

export default function ChartsPage() {
  // 初期値を直接設定してuseEffectの分離問題を回避
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [filterWorker, setFilterWorker] = useState<string>('');
  const [filterPart, setFilterPart] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);

  // マスターデータ取得
  useEffect(() => {
    const fetchMasterData = async () => {
      const [workersRes, partsRes] = await Promise.all([
        supabase.from('workers').select('*').order('order_index'),
        supabase.from('parts').select('*').order('order_index'),
      ]);

      if (workersRes.data) setWorkers(workersRes.data);
      if (partsRes.data) setParts(partsRes.data);
      setInitialized(true);
    };

    fetchMasterData();
  }, []);

  // ログ取得（初期化完了後、フィルター変更時）
  useEffect(() => {
    if (initialized && dateFrom && dateTo) {
      fetchLogs();
    }
  }, [initialized, dateFrom, dateTo, filterWorker, filterPart]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          workers(name),
          parts(name, order_index),
          operations(name, order_index)
        `)
        .eq('is_deleted', false)
        .gte('work_date', dateFrom)
        .lte('work_date', dateTo);

      if (filterWorker) query = query.eq('worker_id', filterWorker);
      if (filterPart) query = query.eq('part_id', filterPart);

      const { data } = await query;

      if (data) {
        const formattedLogs: WorkLog[] = data.map((log: any) => ({
          worker_id: log.worker_id,
          worker_name: log.workers?.name || '不明',
          part_id: log.part_id,
          part_name: log.parts?.name || '不明',
          part_order_index: log.parts?.order_index ?? 999,
          operation_id: log.operation_id,
          operation_name: log.operations?.name || '不明',
          operation_order_index: log.operations?.order_index ?? 999,
          duration_minutes: log.duration_minutes,
          quantity: log.quantity,
          loss_quantity: log.loss_quantity,
          work_date: log.work_date,
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
    const allDates = logs.map((log) => log.work_date);
    const latestDate = allDates.sort().reverse()[0];

    const latestLogs = logs.filter((log) => log.work_date === latestDate);

    if (latestLogs.length === 0) {
      return { chartData: [], totalTime: 0, totalQty: 0, totalGood: 0, date: latestDate, workers: [] };
    }

    // 工程別×作業者別の集計（部品情報も保持）
    const operationWorkerMap = new Map<string, { workerMap: Map<string, number>; partName: string }>();
    let totalTime = 0;
    let totalQty = 0;
    let totalLoss = 0;

    latestLogs.forEach((log) => {
      const key = log.operation_name;
      if (!operationWorkerMap.has(key)) {
        operationWorkerMap.set(key, { workerMap: new Map(), partName: log.part_name });
      }
      const data = operationWorkerMap.get(key)!;
      const current = data.workerMap.get(log.worker_name) || 0;
      data.workerMap.set(log.worker_name, current + log.quantity);

      totalTime += log.duration_minutes;
      totalQty += log.quantity;
      totalLoss += log.loss_quantity;
    });

    const allWorkers = Array.from(new Set(latestLogs.map((l) => l.worker_name)));
    const chartData = Array.from(operationWorkerMap.entries()).map(([operation, data]) => {
      const row: any = { operation, partName: data.partName };
      allWorkers.forEach((worker) => {
        row[worker] = data.workerMap.get(worker) || 0;
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

  // グラフ2: 人別×工程別の生産性（分/良品）
  const getProductivityMatrix = () => {
    const matrix = new Map<string, Map<string, { minutes: number; good: number }>>();
    const operationInfoMap = new Map<string, { partName: string; partOrder: number; opOrder: number }>(); // 工程→部品情報のマッピング

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

      // 工程と部品の情報を保存
      if (!operationInfoMap.has(log.operation_name)) {
        operationInfoMap.set(log.operation_name, {
          partName: log.part_name,
          partOrder: log.part_order_index,
          opOrder: log.operation_order_index,
        });
      }
    });

    const allWorkers = Array.from(new Set(logs.map((l) => l.worker_name)));

    // 工程を部品順→工程順でソート
    const allOperations = Array.from(new Set(logs.map((l) => l.operation_name))).sort((a, b) => {
      const infoA = operationInfoMap.get(a);
      const infoB = operationInfoMap.get(b);

      // データが見つからない場合はソート順を維持
      if (!infoA || !infoB) return 0;

      // まず部品の順序で比較
      if (infoA.partOrder !== infoB.partOrder) {
        return infoA.partOrder - infoB.partOrder;
      }
      // 同じ部品なら工程の順序で比較
      return infoA.opOrder - infoB.opOrder;
    });

    const tableData: any[] = [];
    allOperations.forEach((op) => {
      const info = operationInfoMap.get(op)!;
      const row: any = { operation: op, partName: info.partName };
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

  // グラフ4: 工程別のロス率
  const getLossRateByOperation = () => {
    const operationStats = new Map<string, { quantity: number; loss: number; partName: string; partOrder: number; opOrder: number }>();

    logs.forEach((log) => {
      if (!operationStats.has(log.operation_name)) {
        operationStats.set(log.operation_name, {
          quantity: 0,
          loss: 0,
          partName: log.part_name,
          partOrder: log.part_order_index,
          opOrder: log.operation_order_index,
        });
      }
      const stats = operationStats.get(log.operation_name)!;
      stats.quantity += log.quantity;
      stats.loss += log.loss_quantity;
    });

    const chartData = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        partName: stats.partName,
        partOrder: stats.partOrder,
        opOrder: stats.opOrder,
        lossRate: stats.quantity > 0 ? ((stats.loss / stats.quantity) * 100).toFixed(1) : 0,
        lossRateNum: stats.quantity > 0 ? (stats.loss / stats.quantity) * 100 : 0,
      }))
      .sort((a, b) => {
        // 部品順→工程順でソート
        if (a.partOrder !== b.partOrder) {
          return a.partOrder - b.partOrder;
        }
        return a.opOrder - b.opOrder;
      });

    return chartData;
  };

  const latestDaySummary = getLatestDaySummary();
  const productivityMatrix = getProductivityMatrix();
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
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-yellow-800 font-medium text-lg mb-2">選択した期間・条件にデータがありません</p>
          <p className="text-yellow-700 text-sm mb-4">
            以下をお試しください：
          </p>
          <ul className="text-yellow-700 text-sm text-left max-w-md mx-auto space-y-2">
            <li>• 期間を広げる（例：開始日を1ヶ月前に設定）</li>
            <li>• 作業者フィルタ・部品フィルタを「全て」に変更</li>
            <li>• 実績一覧タブで登録済みデータの日付を確認</li>
          </ul>
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
                        {latestDaySummary.workers.map((worker) => (
                          <th
                            key={worker}
                            className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold"
                            style={{ color: getWorkerColorByName(worker) }}
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
                              {(() => {
                                const partColor = getPartColorByName(row.partName);
                                return (
                                  <span
                                    className="inline-block px-2 py-0.5 rounded text-xs mr-2 font-medium"
                                    style={{ backgroundColor: partColor.bg, color: partColor.text }}
                                  >
                                    {row.partName}
                                  </span>
                                );
                              })()}
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

          {/* 部品カラー凡例 */}
          {parts.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-sm font-bold mb-3 text-gray-700">部品カラー凡例</h4>
              <div className="flex flex-wrap gap-2">
                {parts.map((part) => {
                  const partColor = getPartColorByName(part.name);
                  return (
                    <span
                      key={part.part_id}
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: partColor.bg, color: partColor.text }}
                    >
                      {part.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

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
                        <th
                          key={worker}
                          className="border px-2 md:px-4 py-2 text-center font-bold"
                          style={{ color: getWorkerColorByName(worker) }}
                        >
                          {worker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productivityMatrix.tableData.map((row, idx) => {
                      const partColor = getPartColorByName(row.partName);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border px-2 md:px-4 py-2 font-medium">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs mr-2 font-medium"
                              style={{ backgroundColor: partColor.bg, color: partColor.text }}
                            >
                              {row.partName}
                            </span>
                            {row.operation}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  <YAxis
                    dataKey="operation"
                    type="category"
                    width={150}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const entry = lossRate.find((r) => r.operation === payload.value);
                      const partColor = getPartColorByName(entry?.partName || '');
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={4} textAnchor="end" fill="#666" fontSize={11}>
                            <tspan fill={partColor.text} fontWeight="bold">
                              【{entry?.partName}】
                            </tspan>
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
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

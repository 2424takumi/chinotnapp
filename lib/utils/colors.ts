// 作業者名に基づいて一貫した色を割り当てる

// 作業者名と色のマッピング（手動で設定）
const WORKER_COLOR_MAP: Record<string, string> = {
  '中西': '#3b82f6',  // blue-500
  '西村': '#10b981',  // green-500
  '井上': '#f59e0b',  // amber-500
  '田中': '#ef4444',  // red-500
  '佐藤': '#8b5cf6',  // violet-500
  '鈴木': '#ec4899',  // pink-500
  '高橋': '#14b8a6',  // teal-500
  '渡辺': '#f97316',  // orange-500
};

// デフォルトの色リスト（マッピングにない作業者用）
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

// 作業者IDから色を取得
export function getWorkerColor(workerId: string): string {
  // マッピングにない場合はハッシュベースで色を決定
  let hash = 0;
  for (let i = 0; i < workerId.length; i++) {
    hash = workerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
}

// 作業者名から色を取得（名前ベース、マッピング優先）
export function getWorkerColorByName(workerName: string): string {
  // まず手動マッピングをチェック
  if (WORKER_COLOR_MAP[workerName]) {
    return WORKER_COLOR_MAP[workerName];
  }

  // マッピングにない場合はハッシュベースで色を決定
  let hash = 0;
  for (let i = 0; i < workerName.length; i++) {
    hash = workerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
}

// 作業者のリストから色マップを作成
export function createWorkerColorMap(workers: Array<{ worker_id: string; name: string }>): Map<string, string> {
  const colorMap = new Map<string, string>();
  workers.forEach((worker) => {
    const color = getWorkerColorByName(worker.name);
    colorMap.set(worker.worker_id, color);
    colorMap.set(worker.name, color);
  });
  return colorMap;
}

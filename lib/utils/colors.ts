// 作業者IDに基づいて一貫した色を割り当てる

const WORKER_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

// 作業者IDから色を取得（常に同じIDには同じ色を返す）
export function getWorkerColor(workerId: string): string {
  // IDをハッシュ化して色のインデックスを決定
  let hash = 0;
  for (let i = 0; i < workerId.length; i++) {
    hash = workerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % WORKER_COLORS.length;
  return WORKER_COLORS[index];
}

// 作業者名から色を取得（名前ベース）
export function getWorkerColorByName(workerName: string): string {
  let hash = 0;
  for (let i = 0; i < workerName.length; i++) {
    hash = workerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % WORKER_COLORS.length;
  return WORKER_COLORS[index];
}

// 作業者のリストから色マップを作成
export function createWorkerColorMap(workers: Array<{ worker_id: string; name: string }>): Map<string, string> {
  const colorMap = new Map<string, string>();
  workers.forEach((worker) => {
    colorMap.set(worker.worker_id, getWorkerColor(worker.worker_id));
    colorMap.set(worker.name, getWorkerColor(worker.worker_id));
  });
  return colorMap;
}

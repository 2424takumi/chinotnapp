// 部品名に基づいて一貫した色を割り当てる（Notionスタイル）

// 部品名と色のマッピング（Notionスタイルのパステルカラー）
const PART_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  '胴': { bg: '#E8E5F9', text: '#5E4DB2' },      // 薄紫背景、濃い紫文字
  '棹': { bg: '#D4F4DD', text: '#2B7A3E' },      // 薄緑背景、濃い緑文字
  '皮': { bg: '#FFF4CC', text: '#9A6B00' },      // 薄黄背景、濃い黄文字
  '駒': { bg: '#FFE5E5', text: '#C92A2A' },      // 薄赤背景、濃い赤文字
  '糸': { bg: '#EDE3FF', text: '#6741D9' },      // 薄紫背景、濃い紫文字
  '糸巻': { bg: '#FFE0F0', text: '#C2255C' },    // 薄ピンク背景、濃いピンク文字
  'その他': { bg: '#D9F5F2', text: '#0D7C66' },  // 薄青緑背景、濃い青緑文字
};

// デフォルトの色リスト（マッピングにない部品用）
const DEFAULT_PART_COLORS = [
  { bg: '#E8E5F9', text: '#5E4DB2' }, // purple
  { bg: '#D4F4DD', text: '#2B7A3E' }, // green
  { bg: '#FFF4CC', text: '#9A6B00' }, // yellow
  { bg: '#FFE5E5', text: '#C92A2A' }, // red
  { bg: '#EDE3FF', text: '#6741D9' }, // violet
  { bg: '#FFE0F0', text: '#C2255C' }, // pink
  { bg: '#D9F5F2', text: '#0D7C66' }, // teal
  { bg: '#FFE8CC', text: '#D9480F' }, // orange
  { bg: '#D3F9FF', text: '#0C8599' }, // cyan
  { bg: '#E9F5DB', text: '#5C940D' }, // lime
];

// 部品名から色を取得（名前ベース、マッピング優先）
export function getPartColorByName(partName: string): { bg: string; text: string } {
  // まず手動マッピングをチェック
  if (PART_COLOR_MAP[partName]) {
    return PART_COLOR_MAP[partName];
  }

  // マッピングにない場合はハッシュベースで色を決定
  let hash = 0;
  for (let i = 0; i < partName.length; i++) {
    hash = partName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_PART_COLORS.length;
  return DEFAULT_PART_COLORS[index];
}

// 部品IDから色を取得
export function getPartColor(partId: string): { bg: string; text: string } {
  // IDベースのハッシュで色を決定
  let hash = 0;
  for (let i = 0; i < partId.length; i++) {
    hash = partId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_PART_COLORS.length;
  return DEFAULT_PART_COLORS[index];
}

// 部品のリストから色マップを作成
export function createPartColorMap(parts: Array<{ part_id: string; name: string }>): Map<string, { bg: string; text: string }> {
  const colorMap = new Map<string, { bg: string; text: string }>();
  parts.forEach((part) => {
    const color = getPartColorByName(part.name);
    colorMap.set(part.part_id, color);
    colorMap.set(part.name, color);
  });
  return colorMap;
}

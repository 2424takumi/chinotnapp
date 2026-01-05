-- 胴を短手・長手・組み立て済みに再構成

-- 1. 新しい部品を追加：胴-短手、胴-長手
-- 既存の「胴」は組み立て以降の工程として残す

INSERT INTO parts (name, order_index, active)
VALUES
  ('胴-短手', 1, true),
  ('胴-長手', 2, true)
ON CONFLICT DO NOTHING;

-- 既存の「胴」のorder_indexを更新（短手・長手の後に配置）
UPDATE parts SET order_index = 3 WHERE name = '胴';

-- 他の部品のorder_indexも調整
UPDATE parts SET order_index = 4 WHERE name = '棹';
UPDATE parts SET order_index = 5 WHERE name = '糸巻き';
UPDATE parts SET order_index = 6 WHERE name = '中木';
UPDATE parts SET order_index = 7 WHERE name = '完成品（三味線）';

-- 2. 胴-短手の工程を追加
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（サイズ切り）',
  1,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-短手'
ON CONFLICT DO NOTHING;

INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（幅）',
  2,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-短手'
ON CONFLICT DO NOTHING;

INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（斜め切り）',
  3,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-短手'
ON CONFLICT DO NOTHING;

-- 3. 胴-長手の工程を追加
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（サイズ切り）',
  1,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-長手'
ON CONFLICT DO NOTHING;

INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（幅）',
  2,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-長手'
ON CONFLICT DO NOTHING;

INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '製材（斜め切り）',
  3,
  '加工',
  true
FROM parts p
WHERE p.name = '胴-長手'
ON CONFLICT DO NOTHING;

-- 4. 既存の胴の工程から「製材（サイズ切り）」を削除
-- （組み立て以降の工程のみ残す）
UPDATE operations
SET active = false
WHERE part_id = (SELECT part_id FROM parts WHERE name = '胴')
  AND name = '製材（サイズ切り）';

-- 5. BOMデータを追加：胴の「組み立て」で短手×2、長手×2を消費
INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '胴-短手'),
  2
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '胴' AND op.name = '組み立て'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '胴-長手'),
  2
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '胴' AND op.name = '組み立て'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

-- 確認用クエリ（実行後に確認）
-- SELECT
--   p.name as 部品,
--   p.order_index,
--   op.name as 工程,
--   op.order_index as 工程順序,
--   op.active as 有効
-- FROM parts p
-- LEFT JOIN operations op ON p.part_id = op.part_id
-- WHERE p.name LIKE '胴%'
-- ORDER BY p.order_index, op.order_index;

-- BOM確認用クエリ
-- SELECT
--   p.name as 部品,
--   op.name as 工程,
--   cp.name as 消費部品,
--   b.quantity_per_unit as 消費数
-- FROM bom b
-- JOIN operations op ON b.operation_id = op.operation_id
-- JOIN parts p ON op.part_id = p.part_id
-- JOIN parts cp ON b.consumed_part_id = cp.part_id
-- ORDER BY p.order_index, op.order_index;

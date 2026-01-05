-- 完成品（三味線）部品を追加

-- 1. 完成品部品を追加
INSERT INTO parts (name, order_index, active)
VALUES ('完成品（三味線）', 5, true)
ON CONFLICT DO NOTHING;

-- 2. 完成品の工程を追加（組み立て工程のみ）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT
  p.part_id,
  '最終組み立て',
  1,
  '組立',
  true
FROM parts p
WHERE p.name = '完成品（三味線）'
ON CONFLICT DO NOTHING;

-- 3. BOMデータを追加

-- 3-1. 棹の「中木接着」工程で中木を1個消費
INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '中木'),
  1
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '棹' AND op.name = '中木接着'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

-- 3-2. 完成品の「最終組み立て」で胴×1、棹×1、糸巻き×3を消費
INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '胴'),
  1
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '完成品（三味線）' AND op.name = '最終組み立て'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '棹'),
  1
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '完成品（三味線）' AND op.name = '最終組み立て'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '糸巻き'),
  3
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '完成品（三味線）' AND op.name = '最終組み立て'
ON CONFLICT (operation_id, consumed_part_id) DO NOTHING;

-- 確認用クエリ（実行後に確認してください）
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

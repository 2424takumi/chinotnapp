-- 各部品に「完成」工程を追加

-- 1. 胴-短手に「完成」工程を追加
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 4, '仕上', true
FROM parts p
WHERE p.name = '胴-短手'
ON CONFLICT DO NOTHING;

-- 2. 胴-長手に「完成」工程を追加
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 4, '仕上', true
FROM parts p
WHERE p.name = '胴-長手'
ON CONFLICT DO NOTHING;

-- 3. 胴に「完成」工程を追加（最終工程の後）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 9, '仕上', true
FROM parts p
WHERE p.name = '胴'
ON CONFLICT DO NOTHING;

-- 4. 棹に「完成」工程を追加（仕上げの後）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 7, '仕上', true
FROM parts p
WHERE p.name = '棹'
ON CONFLICT DO NOTHING;

-- 5. 糸巻きに「完成」工程を追加（仕上げの後）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 4, '仕上', true
FROM parts p
WHERE p.name = '糸巻き'
ON CONFLICT DO NOTHING;

-- 6. 中木に「完成」工程を追加（角度切りの後）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 3, '仕上', true
FROM parts p
WHERE p.name = '中木'
ON CONFLICT DO NOTHING;

-- 7. 完成品（三味線）はすでに「最終組み立て」があるので追加不要

-- 確認用クエリ
SELECT
  p.name as 部品,
  op.name as 工程,
  op.order_index as 順序,
  op.category as カテゴリ
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.active = true
ORDER BY p.order_index, op.order_index;

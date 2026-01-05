-- 初期マスタデータ投入
-- 小じゃみチントン生産管理システム

-- 作業者マスタ
INSERT INTO workers (name, order_index, active) VALUES
  ('西村', 1, true),
  ('中西', 2, true);

-- 部品マスタ
INSERT INTO parts (name, order_index, active) VALUES
  ('胴', 1, true),
  ('棹', 2, true),
  ('糸巻き', 3, true),
  ('中木', 4, true);

-- 工程マスタ（胴）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT
  part_id,
  operation_name,
  row_number() OVER (PARTITION BY part_id ORDER BY operation_order),
  true,
  category
FROM (
  SELECT p.part_id, '製材（サイズ切り）' as operation_name, 1 as operation_order, '加工' as category FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '組み立て', 2, '組立' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '平だし', 3, '加工' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '整形（帯鋸）', 4, '加工' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '裏板貼り', 5, '組立' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '角穴あけ', 6, '加工' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '皮張り', 7, '仕上' FROM parts p WHERE p.name = '胴'
  UNION ALL SELECT p.part_id, '仕上げ（サンダー）', 8, '仕上' FROM parts p WHERE p.name = '胴'
) ops;

-- 工程マスタ（棹）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT
  part_id,
  operation_name,
  row_number() OVER (PARTITION BY part_id ORDER BY operation_order),
  true,
  category
FROM (
  SELECT p.part_id, '製材（サイズ切り）' as operation_name, 1 as operation_order, '加工' as category FROM parts p WHERE p.name = '棹'
  UNION ALL SELECT p.part_id, '糸倉穴あけ', 2, '加工' FROM parts p WHERE p.name = '棹'
  UNION ALL SELECT p.part_id, '糸巻穴あけ', 3, '加工' FROM parts p WHERE p.name = '棹'
  UNION ALL SELECT p.part_id, 'スリット加工', 4, '加工' FROM parts p WHERE p.name = '棹'
  UNION ALL SELECT p.part_id, '中木接着', 5, '組立' FROM parts p WHERE p.name = '棹'
  UNION ALL SELECT p.part_id, '仕上げ（サンダー）', 6, '仕上' FROM parts p WHERE p.name = '棹'
) ops;

-- 工程マスタ（糸巻き）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT
  part_id,
  operation_name,
  row_number() OVER (PARTITION BY part_id ORDER BY operation_order),
  true,
  category
FROM (
  SELECT p.part_id, '荒削り（小刀）' as operation_name, 1 as operation_order, '加工' as category FROM parts p WHERE p.name = '糸巻き'
  UNION ALL SELECT p.part_id, '旋盤加工', 2, '加工' FROM parts p WHERE p.name = '糸巻き'
  UNION ALL SELECT p.part_id, '仕上げ（サンダー）', 3, '仕上' FROM parts p WHERE p.name = '糸巻き'
) ops;

-- 工程マスタ（中木）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT
  part_id,
  operation_name,
  row_number() OVER (PARTITION BY part_id ORDER BY operation_order),
  true,
  category
FROM (
  SELECT p.part_id, '製材（サイズ切り）' as operation_name, 1 as operation_order, '加工' as category FROM parts p WHERE p.name = '中木'
  UNION ALL SELECT p.part_id, '角度切り（斜め加工）', 2, '加工' FROM parts p WHERE p.name = '中木'
) ops;

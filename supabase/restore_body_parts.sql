-- 胴-短手と胴-長手を再度有効化し、胴に追加した工程を削除

-- 1. 胴-短手と胴-長手を再度有効化
UPDATE parts SET active = true WHERE name IN ('胴-短手', '胴-長手');

-- 2. 胴に追加した短手・長手工程を削除
DELETE FROM operations
WHERE part_id = (SELECT part_id FROM parts WHERE name = '胴')
  AND name LIKE '%短手%' OR name LIKE '%長手%';

-- 3. 胴の工程のorder_indexを元に戻す
UPDATE parts SET order_index = 1 WHERE name = '胴-短手';
UPDATE parts SET order_index = 2 WHERE name = '胴-長手';
UPDATE parts SET order_index = 3 WHERE name = '胴';

DO $$
DECLARE
  body_part_id UUID;
BEGIN
  SELECT part_id INTO body_part_id FROM parts WHERE name = '胴';

  UPDATE operations
  SET order_index = CASE name
    WHEN '製材（サイズ切り）' THEN 1
    WHEN '組み立て' THEN 2
    WHEN '平だし' THEN 3
    WHEN '整形（帯鋸）' THEN 4
    WHEN '裏板貼り' THEN 5
    WHEN '角穴あけ' THEN 6
    WHEN '皮張り' THEN 7
    WHEN '仕上げ（サンダー）' THEN 8
    ELSE order_index
  END
  WHERE part_id = body_part_id;
END $$;

-- 4. BOMを再追加：胴の組み立てで短手×2、長手×2を消費
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

-- 確認
SELECT p.name, p.order_index, p.active
FROM parts p
WHERE p.name LIKE '胴%' OR p.name LIKE '%短手%' OR p.name LIKE '%長手%'
ORDER BY p.order_index;

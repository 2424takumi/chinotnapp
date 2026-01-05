-- 胴-短手と胴-長手を胴の工程に統合

-- 1. 胴-短手と胴-長手の部品を無効化（削除ではなく非表示に）
UPDATE parts SET active = false WHERE name IN ('胴-短手', '胴-長手');

-- 2. 胴の製材工程を再度有効化
UPDATE operations
SET active = true
WHERE part_id = (SELECT part_id FROM parts WHERE name = '胴')
  AND name = '製材（サイズ切り）';

-- 3. 胴に短手・長手の工程を追加

-- 胴の part_id を取得
DO $$
DECLARE
  body_part_id UUID;
BEGIN
  SELECT part_id INTO body_part_id FROM parts WHERE name = '胴';

  -- 短手工程
  INSERT INTO operations (part_id, name, order_index, category, active)
  VALUES
    (body_part_id, '製材（サイズ切り）- 短手', 1, '加工', true),
    (body_part_id, '製材（幅）- 短手', 2, '加工', true),
    (body_part_id, '製材（斜め切り）- 短手', 3, '加工', true),
    -- 長手工程
    (body_part_id, '製材（サイズ切り）- 長手', 4, '加工', true),
    (body_part_id, '製材（幅）- 長手', 5, '加工', true),
    (body_part_id, '製材（斜め切り）- 長手', 6, '加工', true)
  ON CONFLICT DO NOTHING;

  -- 既存の工程のorder_indexを調整（組み立て以降を7以降に）
  UPDATE operations
  SET order_index = order_index + 6
  WHERE part_id = body_part_id
    AND name != '製材（サイズ切り）'
    AND name NOT LIKE '%短手%'
    AND name NOT LIKE '%長手%';
END $$;

-- 4. BOMを更新：胴の組み立てで、胴-短手/胴-長手ではなく、
--    短手最終工程と長手最終工程の在庫を消費するように変更

-- 既存のBOMを削除
DELETE FROM bom
WHERE operation_id IN (
  SELECT op.operation_id
  FROM operations op
  JOIN parts p ON op.part_id = p.part_id
  WHERE p.name = '胴' AND op.name = '組み立て'
);

-- 新しいBOMを追加（短手と長手の最終工程をそれぞれ2個ずつ消費）
-- 注：これは仮の実装です。実際には「工程の在庫」ではなく「部品の在庫」を消費する仕組みが必要です
-- 今回はシンプルに、在庫計算ロジック側で対応します

-- 確認用クエリ
SELECT
  p.name as 部品,
  op.name as 工程,
  op.order_index as 順序,
  op.active as 有効
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '胴'
ORDER BY op.order_index;

-- 短手・長手を「仮想部品」として追加し、胴の組み立てで消費できるようにする

-- 1. 仮想部品を追加（実際には製造しないが、BOMで参照するため）
INSERT INTO parts (name, order_index, active)
VALUES
  ('胴-短手（仮想）', 11, false),  -- active=falseで入力画面には表示しない
  ('胴-長手（仮想）', 12, false);

-- 2. 仮想部品に工程を1つ追加（在庫計算のため）
INSERT INTO operations (part_id, name, order_index, category, active)
SELECT p.part_id, '完成', 1, '仕上', false
FROM parts p
WHERE p.name IN ('胴-短手（仮想）', '胴-長手（仮想）');

-- 3. BOMを追加：胴の組み立てで短手×2、長手×2を消費
INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '胴-短手（仮想）'),
  2
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '胴' AND op.name = '組み立て';

INSERT INTO bom (operation_id, consumed_part_id, quantity_per_unit)
SELECT
  op.operation_id,
  (SELECT part_id FROM parts WHERE name = '胴-長手（仮想）'),
  2
FROM operations op
JOIN parts p ON op.part_id = p.part_id
WHERE p.name = '胴' AND op.name = '組み立て';

-- 4. 短手・長手の工程が完了したら、仮想部品の在庫が増えるように
--    bom_consumptionに「逆向き」のエントリを作成する仕組みが必要
--    これはアプリケーション側で実装します

-- 確認
SELECT
  p.name as 部品,
  op.name as 工程,
  cp.name as 消費部品,
  b.quantity_per_unit as 消費数
FROM bom b
JOIN operations op ON b.operation_id = op.operation_id
JOIN parts p ON op.part_id = p.part_id
JOIN parts cp ON b.consumed_part_id = cp.part_id
WHERE p.name = '胴';

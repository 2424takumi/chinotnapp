-- 在庫調整の属性値テーブルの作成
CREATE TABLE IF NOT EXISTS inventory_adjustment_attributes (
  adjustment_attribute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(adjustment_id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES variant_attribute_values(value_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_inventory_adjustment_attributes_adjustment_id ON inventory_adjustment_attributes(adjustment_id);
CREATE INDEX idx_inventory_adjustment_attributes_value_id ON inventory_adjustment_attributes(value_id);

-- RLSを有効化
ALTER TABLE inventory_adjustment_attributes ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can view inventory adjustment attributes"
  ON inventory_adjustment_attributes FOR SELECT
  USING (true);

-- 認証済みユーザーは挿入・更新・削除可能
CREATE POLICY "Authenticated users can insert inventory adjustment attributes"
  ON inventory_adjustment_attributes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory adjustment attributes"
  ON inventory_adjustment_attributes FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete inventory adjustment attributes"
  ON inventory_adjustment_attributes FOR DELETE
  USING (true);

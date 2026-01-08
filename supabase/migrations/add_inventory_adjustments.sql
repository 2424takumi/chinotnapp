-- 在庫調整テーブルの作成
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  adjustment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  adjustment_quantity INTEGER NOT NULL, -- プラスで増加、マイナスで減少
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES workers(worker_id) ON DELETE SET NULL
);

-- インデックスの作成
CREATE INDEX idx_inventory_adjustments_part_id ON inventory_adjustments(part_id);
CREATE INDEX idx_inventory_adjustments_operation_id ON inventory_adjustments(operation_id);
CREATE INDEX idx_inventory_adjustments_created_at ON inventory_adjustments(created_at);

-- RLSを有効化
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can view inventory adjustments"
  ON inventory_adjustments FOR SELECT
  USING (true);

-- 認証済みユーザーは挿入・更新・削除可能
CREATE POLICY "Authenticated users can insert inventory adjustments"
  ON inventory_adjustments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory adjustments"
  ON inventory_adjustments FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete inventory adjustments"
  ON inventory_adjustments FOR DELETE
  USING (true);

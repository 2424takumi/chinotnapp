-- 工程テーブルに前工程消費設定を追加
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS consumes_previous_operation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consumption_quantity_per_unit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS inherit_attributes BOOLEAN DEFAULT true;

-- 工程間消費実績テーブルを作成
CREATE TABLE IF NOT EXISTS process_consumption (
  consumption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(log_id) ON DELETE CASCADE,
  consumed_operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  consumed_quantity INTEGER NOT NULL,
  consumed_attribute_values JSONB, -- 消費した在庫の属性値（key: attribute_id, value: value_id）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_process_consumption_work_log_id ON process_consumption(work_log_id);
CREATE INDEX IF NOT EXISTS idx_process_consumption_consumed_operation_id ON process_consumption(consumed_operation_id);
CREATE INDEX IF NOT EXISTS idx_process_consumption_created_at ON process_consumption(created_at);

-- RLSを有効化
ALTER TABLE process_consumption ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can view process consumption"
  ON process_consumption FOR SELECT
  USING (true);

-- 認証済みユーザーは挿入・更新・削除可能
CREATE POLICY "Authenticated users can insert process consumption"
  ON process_consumption FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update process consumption"
  ON process_consumption FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete process consumption"
  ON process_consumption FOR DELETE
  USING (true);

-- コメント追加
COMMENT ON COLUMN operations.consumes_previous_operation IS '前工程在庫を消費するか（例: 皮張りは帯鋸整形の在庫を消費する）';
COMMENT ON COLUMN operations.consumption_quantity_per_unit IS '1個生産するごとに消費する前工程在庫の数量';
COMMENT ON COLUMN operations.inherit_attributes IS '前工程の属性値を引き継ぐか（trueの場合、同じ属性値の在庫のみ消費）';
COMMENT ON TABLE process_consumption IS '工程間の在庫消費実績（例: 皮張り5個作成時に帯鋸整形5個消費）';

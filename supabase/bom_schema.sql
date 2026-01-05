-- BOM (Bill of Materials) テーブル
-- 各工程でどの部品を何個消費するかを定義

CREATE TABLE IF NOT EXISTS bom (
  bom_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(operation_id),
  consumed_part_id UUID NOT NULL REFERENCES parts(part_id),
  quantity_per_unit INTEGER NOT NULL CHECK (quantity_per_unit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(operation_id, consumed_part_id)
);

COMMENT ON TABLE bom IS '部品表：各工程で消費する部品を定義';
COMMENT ON COLUMN bom.operation_id IS 'この工程を実行する際に';
COMMENT ON COLUMN bom.consumed_part_id IS 'この部品を消費する';
COMMENT ON COLUMN bom.quantity_per_unit IS '1個生産するごとに何個消費するか';

-- BOM消費記録テーブル
-- 実際に作業した際の部品消費を記録

CREATE TABLE IF NOT EXISTS bom_consumption (
  consumption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(log_id) ON DELETE CASCADE,
  consumed_part_id UUID NOT NULL REFERENCES parts(part_id),
  consumed_quantity INTEGER NOT NULL CHECK (consumed_quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bom_consumption IS 'BOM消費記録：作業記録時に実際に消費した部品を記録';
COMMENT ON COLUMN bom_consumption.work_log_id IS '関連する作業ログ';
COMMENT ON COLUMN bom_consumption.consumed_part_id IS '消費した部品';
COMMENT ON COLUMN bom_consumption.consumed_quantity IS '消費した数量';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bom_operation ON bom(operation_id);
CREATE INDEX IF NOT EXISTS idx_bom_consumption_work_log ON bom_consumption(work_log_id);
CREATE INDEX IF NOT EXISTS idx_bom_consumption_part ON bom_consumption(consumed_part_id);

-- updated_at自動更新トリガー
CREATE TRIGGER update_bom_updated_at
  BEFORE UPDATE ON bom
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

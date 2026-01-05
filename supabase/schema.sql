-- 小じゃみチントン生産管理システム

-- データベーススキーマ定義

-- 作業者マスタ
CREATE TABLE workers (
  worker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 部品マスタ
CREATE TABLE parts (
  part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工程マスタ
CREATE TABLE operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(50), -- 加工/組立/仕上/付帯など
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(part_id, name)
);

-- 作業ログ
CREATE TABLE work_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE RESTRICT,
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE RESTRICT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  loss_quantity INTEGER NOT NULL DEFAULT 0 CHECK (loss_quantity >= 0),
  note TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(100),
  CONSTRAINT loss_not_exceed_quantity CHECK (loss_quantity <= quantity)
);

-- インデックス作成（検索性能向上）
CREATE INDEX idx_work_logs_worker ON work_logs(worker_id) WHERE NOT is_deleted;
CREATE INDEX idx_work_logs_part ON work_logs(part_id) WHERE NOT is_deleted;
CREATE INDEX idx_work_logs_operation ON work_logs(operation_id) WHERE NOT is_deleted;
CREATE INDEX idx_work_logs_created_at ON work_logs(created_at DESC) WHERE NOT is_deleted;
CREATE INDEX idx_operations_part ON operations(part_id) WHERE active;

-- updated_at自動更新トリガー（PostgreSQL）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント（ドキュメント）
COMMENT ON TABLE workers IS '作業者マスタ';
COMMENT ON TABLE parts IS '部品マスタ';
COMMENT ON TABLE operations IS '工程マスタ（部品に紐づく）';
COMMENT ON TABLE work_logs IS '作業ログ（実績データ）';
COMMENT ON COLUMN work_logs.duration_minutes IS '作業時間（分）';
COMMENT ON COLUMN work_logs.quantity IS '生産数量';
COMMENT ON COLUMN work_logs.loss_quantity IS 'ロス数（不良品数）';
COMMENT ON COLUMN work_logs.is_deleted IS '論理削除フラグ';
COMMENT ON COLUMN work_logs.updated_by IS '更新者（管理者名など）';

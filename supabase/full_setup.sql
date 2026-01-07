-- ===================================================
-- 小じゃみチントン生産管理システム - 完全セットアップ
-- ===================================================
-- このSQLを一度に実行することで、全てのテーブルとデータがセットアップされます

-- ===================================================
-- 1. 基本スキーマ
-- ===================================================

-- 作業者マスタ
CREATE TABLE IF NOT EXISTS workers (
  worker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 部品マスタ
CREATE TABLE IF NOT EXISTS parts (
  part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工程マスタ
CREATE TABLE IF NOT EXISTS operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(part_id, name)
);

-- 作業ログ
CREATE TABLE IF NOT EXISTS work_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE RESTRICT,
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE RESTRICT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  loss_quantity INTEGER NOT NULL DEFAULT 0 CHECK (loss_quantity >= 0),
  note TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(100),
  CONSTRAINT loss_not_exceed_quantity CHECK (loss_quantity <= quantity)
);

-- トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parts_updated_at ON parts;
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_operations_updated_at ON operations;
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_logs_updated_at ON work_logs;
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_work_logs_worker ON work_logs(worker_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_work_logs_part ON work_logs(part_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_work_logs_operation ON work_logs(operation_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs(created_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_work_logs_work_date ON work_logs(work_date DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_operations_part ON operations(part_id) WHERE active;

-- ===================================================
-- 2. サンプルデータ
-- ===================================================

-- 作業者
INSERT INTO workers (name, order_index, active) VALUES
  ('西村', 1, true),
  ('中西', 2, true)
ON CONFLICT (name) DO NOTHING;

-- 部品
INSERT INTO parts (name, order_index, active) VALUES
  ('胴', 1, true),
  ('棹', 2, true),
  ('糸巻き', 3, true),
  ('中木', 4, true)
ON CONFLICT (name) DO NOTHING;

-- 工程（胴）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT p.part_id, operation_name, operation_order, true, category
FROM (VALUES
  ('胴', '製材（サイズ切り）', 1, '加工'),
  ('胴', '組み立て', 2, '組立'),
  ('胴', '平だし', 3, '加工'),
  ('胴', '整形（帯鋸）', 4, '加工'),
  ('胴', '裏板貼り', 5, '組立'),
  ('胴', '角穴あけ', 6, '加工'),
  ('胴', '皮張り', 7, '仕上'),
  ('胴', '仕上げ（サンダー）', 8, '仕上')
) AS v(part_name, operation_name, operation_order, category)
JOIN parts p ON p.name = v.part_name
ON CONFLICT (part_id, name) DO NOTHING;

-- 工程（棹）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT p.part_id, operation_name, operation_order, true, category
FROM (VALUES
  ('棹', '製材（サイズ切り）', 1, '加工'),
  ('棹', '糸倉穴あけ', 2, '加工'),
  ('棹', '糸巻穴あけ', 3, '加工'),
  ('棹', 'スリット加工', 4, '加工'),
  ('棹', '中木接着', 5, '組立'),
  ('棹', '仕上げ（サンダー）', 6, '仕上')
) AS v(part_name, operation_name, operation_order, category)
JOIN parts p ON p.name = v.part_name
ON CONFLICT (part_id, name) DO NOTHING;

-- 工程（糸巻き）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT p.part_id, operation_name, operation_order, true, category
FROM (VALUES
  ('糸巻き', '荒削り（小刀）', 1, '加工'),
  ('糸巻き', '旋盤加工', 2, '加工'),
  ('糸巻き', '仕上げ（サンダー）', 3, '仕上')
) AS v(part_name, operation_name, operation_order, category)
JOIN parts p ON p.name = v.part_name
ON CONFLICT (part_id, name) DO NOTHING;

-- 工程（中木）
INSERT INTO operations (part_id, name, order_index, active, category)
SELECT p.part_id, operation_name, operation_order, true, category
FROM (VALUES
  ('中木', '製材（サイズ切り）', 1, '加工'),
  ('中木', '角度切り（斜め加工）', 2, '加工')
) AS v(part_name, operation_name, operation_order, category)
JOIN parts p ON p.name = v.part_name
ON CONFLICT (part_id, name) DO NOTHING;

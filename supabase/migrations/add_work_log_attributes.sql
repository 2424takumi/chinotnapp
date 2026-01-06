-- 作業ログに属性値を紐付けるテーブル
-- 例: 整形（帯鋸）の作業で「通常版」を選択、皮張りの作業で「花柄」を選択

CREATE TABLE work_log_attributes (
  work_log_attribute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES work_logs(log_id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES variant_attribute_values(value_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(work_log_id, value_id)
);

-- インデックスの追加
CREATE INDEX idx_work_log_attributes_work_log ON work_log_attributes(work_log_id);
CREATE INDEX idx_work_log_attributes_value ON work_log_attributes(value_id);

-- コメント追加
COMMENT ON TABLE work_log_attributes IS '作業ログと属性値の紐付け（工程ごとに選択された属性値を記録）';

-- work_logs.variant_id カラムは後方互換性のため残しますが、新システムでは使用しません
-- （既存データが存在する可能性があるため、削除せずに残します）

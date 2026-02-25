-- Slack連携のためのカラム追加
-- workersテーブルにslack_user_idカラムを追加

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS slack_user_id VARCHAR(20) UNIQUE;

-- インデックスを追加（Slack IDでの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_workers_slack_user_id ON workers(slack_user_id)
WHERE slack_user_id IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN workers.slack_user_id IS 'SlackユーザーID（U1234567890形式）';

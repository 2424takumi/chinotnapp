-- Discord連携のためのカラム追加
-- workersテーブルにdiscord_user_idカラムを追加

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS discord_user_id VARCHAR(20) UNIQUE;

-- インデックスを追加（Discord IDでの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_workers_discord_user_id ON workers(discord_user_id)
WHERE discord_user_id IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN workers.discord_user_id IS 'DiscordユーザーID（数字のみ、例: 123456789012345678）';

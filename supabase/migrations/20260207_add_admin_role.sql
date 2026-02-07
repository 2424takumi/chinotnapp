-- ========================================
-- 管理者権限フラグの追加
-- ========================================
-- 作成日: 2026-02-07
-- 目的: 管理者権限チェックの実装（CWE-306: Missing Authentication for Critical Function）

-- workersテーブルに管理者フラグを追加
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- コメント追加
COMMENT ON COLUMN workers.is_admin IS '管理者権限フラグ。trueの場合、管理機能へのアクセスが許可される。';

-- インデックス追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_workers_is_admin ON workers(is_admin) WHERE is_admin = true;

-- ========================================
-- 既存ユーザーへの権限付与（必要に応じて調整）
-- ========================================
-- 注意: 実行前に管理者にすべきユーザーを確認してください

-- 例: 特定のメールアドレスを管理者に設定
-- UPDATE workers SET is_admin = true
-- WHERE auth_user_id IN (
--   SELECT id FROM auth.users WHERE email = 'admin@example.com'
-- );

-- または: 最初のワーカーを管理者に設定（開発環境用）
UPDATE workers SET is_admin = true
WHERE worker_id = (SELECT worker_id FROM workers ORDER BY created_at LIMIT 1);

-- ========================================
-- 監査ログ
-- ========================================
-- 管理者権限の変更を記録（将来の拡張用）
-- CREATE TABLE IF NOT EXISTS admin_role_changes (
--   change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   worker_id UUID REFERENCES workers(worker_id),
--   changed_by UUID REFERENCES workers(worker_id),
--   old_value BOOLEAN,
--   new_value BOOLEAN,
--   reason TEXT,
--   changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

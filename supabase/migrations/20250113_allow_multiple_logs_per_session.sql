-- work_sessionsテーブルのwork_log_id列を削除
-- 1つのセッションから複数のwork_logsを作成できるようにする
ALTER TABLE work_sessions DROP COLUMN IF EXISTS work_log_id;

-- コメント: 今後、work_logsのsession_idを使って逆参照する形になります
-- 1 session → 多 work_logs の関係

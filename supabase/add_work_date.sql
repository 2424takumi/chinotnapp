-- work_logsテーブルに作業日カラムを追加

-- 1. work_dateカラムを追加（デフォルト値は記録日と同じ）
ALTER TABLE work_logs
ADD COLUMN work_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. 既存のデータに対して、created_atの日付をwork_dateに設定
UPDATE work_logs
SET work_date = DATE(created_at);

-- 確認
SELECT log_id, work_date, created_at, worker_id, part_id, quantity
FROM work_logs
ORDER BY created_at DESC
LIMIT 10;

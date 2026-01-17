-- 工程マスタのデフォルト値を変更
-- 新規作成時に「前工程を消費する」をデフォルトでONにする

ALTER TABLE operations
ALTER COLUMN consumes_previous_operation SET DEFAULT true;

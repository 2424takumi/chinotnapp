-- ============================================================================
-- スタート/ストップ方式の作業記録とログイン機能の追加
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 作業者テーブルに認証機能を追加
-- ----------------------------------------------------------------------------

-- Supabase Auth ユーザーとの紐付け
ALTER TABLE workers
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN email VARCHAR(255) UNIQUE,
ADD COLUMN is_authenticated BOOLEAN NOT NULL DEFAULT false;

-- インデックスの追加
CREATE INDEX idx_workers_auth_user ON workers(auth_user_id);
CREATE INDEX idx_workers_email ON workers(email);

-- コメント
COMMENT ON COLUMN workers.auth_user_id IS 'Supabase Auth user ID (NULL for legacy workers)';
COMMENT ON COLUMN workers.email IS 'Email address for login';
COMMENT ON COLUMN workers.is_authenticated IS 'Whether this worker uses login authentication';

-- ----------------------------------------------------------------------------
-- 2. 作業セッションテーブル（進行中および完了した作業セッション）
-- ----------------------------------------------------------------------------

CREATE TABLE work_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE RESTRICT,

  -- セッションのタイミング
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,

  -- 作業詳細（開始時にキャプチャ）
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- セッションステータス
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),

  -- 完了時の最終作業ログ参照
  work_log_id UUID REFERENCES work_logs(log_id) ON DELETE SET NULL,

  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約：終了時刻は開始時刻より後
  CONSTRAINT end_after_start CHECK (end_time IS NULL OR end_time > start_time)
);

-- インデックス
CREATE INDEX idx_work_sessions_worker ON work_sessions(worker_id);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time DESC);
CREATE INDEX idx_work_sessions_work_date ON work_sessions(work_date DESC);

-- 一意制約：作業者ごとに1つのアクティブセッションのみ
CREATE UNIQUE INDEX idx_work_sessions_active_worker
ON work_sessions(worker_id)
WHERE status = 'active';

-- 自動更新トリガー
CREATE TRIGGER update_work_sessions_updated_at
BEFORE UPDATE ON work_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- コメント
COMMENT ON TABLE work_sessions IS 'Active and historical work sessions (start/stop tracking)';
COMMENT ON COLUMN work_sessions.status IS 'active: in progress, paused: temporarily stopped, completed: finished with work_log, abandoned: cancelled without completion';
COMMENT ON COLUMN work_sessions.work_log_id IS 'Reference to the final work log created when session is completed';

-- ----------------------------------------------------------------------------
-- 3. 作業セッション属性（セッション開始時に選択された属性値）
-- ----------------------------------------------------------------------------

CREATE TABLE work_session_attributes (
  session_attribute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES work_sessions(session_id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES variant_attribute_values(value_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, value_id)
);

-- インデックス
CREATE INDEX idx_work_session_attributes_session ON work_session_attributes(session_id);
CREATE INDEX idx_work_session_attributes_value ON work_session_attributes(value_id);

-- コメント
COMMENT ON TABLE work_session_attributes IS 'Variant attribute values selected when starting a work session';

-- ----------------------------------------------------------------------------
-- 4. 作業ログにセッション参照を追加
-- ----------------------------------------------------------------------------

-- セッション参照を追加
ALTER TABLE work_logs
ADD COLUMN session_id UUID REFERENCES work_sessions(session_id) ON DELETE SET NULL;

-- インデックス
CREATE INDEX idx_work_logs_session ON work_logs(session_id);

-- コメント
COMMENT ON COLUMN work_logs.session_id IS 'Reference to the work session if created via start/stop tracking (NULL for manual entry)';

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) ポリシーの設定
-- ----------------------------------------------------------------------------

-- work_sessions テーブルのRLSを有効化
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- 作業者は自分のセッションのみ閲覧可能
CREATE POLICY "Workers can view own sessions"
ON work_sessions FOR SELECT
USING (
  auth.uid() = (SELECT auth_user_id FROM workers WHERE worker_id = work_sessions.worker_id)
);

-- 作業者は自分のセッションを作成可能
CREATE POLICY "Workers can create own sessions"
ON work_sessions FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT auth_user_id FROM workers WHERE worker_id = work_sessions.worker_id)
);

-- 作業者は自分のセッションを更新可能
CREATE POLICY "Workers can update own sessions"
ON work_sessions FOR UPDATE
USING (
  auth.uid() = (SELECT auth_user_id FROM workers WHERE worker_id = work_sessions.worker_id)
);

-- work_session_attributes テーブルのRLSを有効化
ALTER TABLE work_session_attributes ENABLE ROW LEVEL SECURITY;

-- セッション属性は所有者のみアクセス可能
CREATE POLICY "Workers can manage own session attributes"
ON work_session_attributes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM work_sessions ws
    INNER JOIN workers w ON ws.worker_id = w.worker_id
    WHERE ws.session_id = work_session_attributes.session_id
    AND w.auth_user_id = auth.uid()
  )
);

-- work_logs テーブルのRLS（既存のテーブルに追加）
-- 注: work_logsは既に存在するため、RLSが有効になっていない場合のみ実行
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'work_logs') THEN
    ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 作業者は自分の作業ログのみ閲覧可能
DROP POLICY IF EXISTS "Workers can view own work logs" ON work_logs;
CREATE POLICY "Workers can view own work logs"
ON work_logs FOR SELECT
USING (
  auth.uid() = (SELECT auth_user_id FROM workers WHERE worker_id = work_logs.worker_id)
);

-- 作業者は自分の作業ログを作成可能
DROP POLICY IF EXISTS "Workers can create own work logs" ON work_logs;
CREATE POLICY "Workers can create own work logs"
ON work_logs FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT auth_user_id FROM workers WHERE worker_id = work_logs.worker_id)
);

-- ----------------------------------------------------------------------------
-- 6. サービスロール用のバイパスポリシー（管理者・バックエンド用）
-- ----------------------------------------------------------------------------

-- 管理者は全てのデータにアクセス可能（service_roleキー使用時）
-- Note: service_role キーを使用する場合、RLSはバイパスされます
-- アプリケーションコードで適切に権限管理を行ってください

-- ----------------------------------------------------------------------------
-- 7. ヘルパー関数：アクティブセッションの取得
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_active_session(p_worker_id UUID)
RETURNS TABLE (
  session_id UUID,
  part_id UUID,
  part_name VARCHAR,
  operation_id UUID,
  operation_name VARCHAR,
  start_time TIMESTAMPTZ,
  elapsed_seconds BIGINT,
  work_date DATE,
  attribute_values JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.session_id,
    ws.part_id,
    p.name AS part_name,
    ws.operation_id,
    o.name AS operation_name,
    ws.start_time,
    EXTRACT(EPOCH FROM (NOW() - ws.start_time))::BIGINT AS elapsed_seconds,
    ws.work_date,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'attribute_name', va.name,
          'value_name', vav.name
        )
      ) FILTER (WHERE vav.value_id IS NOT NULL),
      '[]'::jsonb
    ) AS attribute_values
  FROM work_sessions ws
  INNER JOIN parts p ON ws.part_id = p.part_id
  INNER JOIN operations o ON ws.operation_id = o.operation_id
  LEFT JOIN work_session_attributes wsa ON ws.session_id = wsa.session_id
  LEFT JOIN variant_attribute_values vav ON wsa.value_id = vav.value_id
  LEFT JOIN variant_attributes va ON vav.attribute_id = va.attribute_id
  WHERE ws.worker_id = p_worker_id
  AND ws.status = 'active'
  GROUP BY ws.session_id, p.name, o.name;
END;
$$;

-- コメント
COMMENT ON FUNCTION get_active_session IS 'Get the active work session for a worker with all details';

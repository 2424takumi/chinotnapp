import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { logger } from '../utils/logger'

let serverClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

/**
 * サーバーサイド用のSupabaseクライアントを作成
 * サービスロールキーを使用して管理者権限でアクセス
 */
export function createServerClient() {
  if (serverClient) {
    return serverClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    logger.error('[createServerClient] 環境変数が設定されていません')
    throw new Error('Supabase環境変数が設定されていません (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  }

  serverClient = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  logger.debug('[createServerClient] サーバークライアント作成完了')
  return serverClient
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { logger } from '../utils/logger'

// シングルトンパターンでクライアントを1つだけ作成
let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  if (client) {
    logger.debug('[createClient] 既存のクライアントを返却')
    return client
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  logger.debug('[createClient] 新しいクライアントを作成中...')

  if (!url || !key) {
    logger.error('[createClient] エラー: 環境変数が設定されていません')
    throw new Error('Supabase環境変数が設定されていません')
  }

  client = createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  })

  logger.debug('[createClient] クライアント作成完了')

  return client
}

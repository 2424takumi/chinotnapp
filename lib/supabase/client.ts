import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { logger } from '../utils/logger'

// ブラウザ環境専用シングルトンインスタンス（SSR環境では使用しない）
let browserClient: SupabaseClient<Database> | undefined

export function createClient() {
  // ブラウザ環境でキャッシュされたインスタンスがあれば再利用
  if (typeof window !== 'undefined' && browserClient) {
    logger.debug('[createClient] 既存のブラウザクライアントを再利用')
    return browserClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  logger.debug('[createClient] 新しいクライアントを作成中...')

  if (!url || !key) {
    logger.error('[createClient] エラー: 環境変数が設定されていません')
    throw new Error('Supabase環境変数が設定されていません')
  }

  const client = createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  })

  // ブラウザ環境でのみインスタンスをキャッシュ
  if (typeof window !== 'undefined') {
    browserClient = client
    logger.debug('[createClient] ブラウザクライアントをキャッシュしました')
  }

  logger.debug('[createClient] クライアント作成完了')

  return client
}

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'
import { logger } from '../utils/logger'

// シングルトンパターンでクライアントを1つだけ作成
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

// ビルド時かどうかを判定
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

export function createClient() {
  if (client) {
    logger.debug('[createClient] 既存のクライアントを返却')
    return client
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  logger.debug('[createClient] 新しいクライアントを作成中...')

  if (!url || !key) {
    // ビルド時は警告のみでダミークライアントを返す
    if (isBuildTime) {
      logger.warn('[createClient] ビルド時: 環境変数なし、ダミークライアントを返却')
      // ダミーのURLとキーでクライアントを作成（ビルド時のみ）
      client = createBrowserClient<Database>(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
      return client
    }
    logger.error('[createClient] エラー: 環境変数が設定されていません')
    throw new Error('Supabase環境変数が設定されていません')
  }

  client = createBrowserClient<Database>(url, key)
  logger.debug('[createClient] クライアント作成完了')

  return client
}

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

// シングルトンパターンでクライアントを1つだけ作成
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) {
    console.log('[createClient] 既存のクライアントを返却')
    return client
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[createClient] 新しいクライアントを作成中...')
  console.log('[createClient] URL:', url ? url.substring(0, 30) + '...' : 'NOT SET')
  console.log('[createClient] Key:', key ? key.substring(0, 20) + '...' : 'NOT SET')

  if (!url || !key) {
    console.error('[createClient] エラー: 環境変数が設定されていません')
    throw new Error('Supabase環境変数が設定されていません')
  }

  client = createBrowserClient<Database>(url, key)
  console.log('[createClient] クライアント作成完了')

  return client
}

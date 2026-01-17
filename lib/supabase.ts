// 古いファイル - 新しい lib/supabase/client.ts を使用してください
// このファイルは後方互換性のために残されています
import { createClient } from './supabase/client'

// 遅延初期化でビルド時のエラーを回避
let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient()
    }
    return (_supabase as any)[prop]
  }
})

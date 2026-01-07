import { createClient } from '@/lib/supabase/client'

// ログアウト（クライアントサイド用）
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

// メールアドレスとパスワードでログイン（クライアントサイド用）
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

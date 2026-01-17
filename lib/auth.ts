import { createClient } from '@/lib/supabase/client'

// ログアウト（クライアントサイド用）
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

// メールアドレスとパスワードでログイン（クライアントサイド用）
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  console.log('[signInWithEmail] ログイン試行:', { email })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[signInWithEmail] ログインエラー:', error)
  } else {
    console.log('[signInWithEmail] ログイン成功:', { user: data.user?.email, session: !!data.session })
  }

  return { data, error }
}

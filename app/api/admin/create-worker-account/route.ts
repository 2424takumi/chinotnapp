import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 認証されたユーザーを取得するヘルパー関数
async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // ワーカー情報を取得して認証済みか確認
  const { data: worker } = await supabase
    .from('workers')
    .select('worker_id, name, is_authenticated')
    .eq('auth_user_id', user.id)
    .eq('is_authenticated', true)
    .maybeSingle()

  if (!worker) {
    return null
  }

  return { user, worker }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await getAuthenticatedUser(request)

    if (!authResult) {
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      )
    }

    const { workerId, email, password } = await request.json()

    if (!workerId || !email || !password) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    // パスワード強度チェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      )
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // Service role keyを使用してSupabaseクライアントを作成
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Auth ユーザーを作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認をスキップ
    })

    if (authError) {
      // エラーメッセージを一般化（詳細情報を露出しない）
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: 'アカウントの作成に失敗しました。メールアドレスが既に使用されている可能性があります。' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'アカウントの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 2. workersテーブルを更新してauth_user_idを紐付け
    const { error: updateError } = await supabaseAdmin
      .from('workers')
      .update({
        auth_user_id: authData.user.id,
        email,
        is_authenticated: true,
      })
      .eq('worker_id', workerId)

    if (updateError) {
      // ロールバック: 作成したAuthユーザーを削除
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Worker update error:', updateError)
      return NextResponse.json(
        { error: 'ワーカー情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Worker account creation error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

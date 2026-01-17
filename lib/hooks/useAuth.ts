'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Worker } from '@/lib/types/database'
import { logger } from '@/lib/utils/logger'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ブラウザ環境でのみクライアントを作成
    if (typeof window === 'undefined') {
      logger.debug('[useAuth] サーバーサイドでは実行しない')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // 初回ロード時のユーザー取得
    const getUser = async () => {
      try {
        logger.debug('[useAuth] ユーザー情報を取得中...')

        // まずセッションを確認
        const { data: { session } } = await supabase.auth.getSession()
        logger.debug('[useAuth] セッション確認:', session ? `User: ${session.user.email}` : 'セッションなし')

        if (!session) {
          logger.debug('[useAuth] セッションなし - 未ログイン状態')
          setUser(null)
          setWorker(null)
          setLoading(false)
          return
        }

        // セッションがある場合、ユーザー情報を設定
        const user = session.user
        logger.debug('[useAuth] ユーザー情報:', `ID: ${user.id}, Email: ${user.email}`)
        setUser(user)

        // ワーカー情報を取得
        logger.debug('[useAuth] ワーカー情報を取得中... auth_user_id:', user.id)
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('is_authenticated', true)
          .maybeSingle()

        if (workerError) {
          logger.error('[useAuth] ワーカー情報取得エラー:', workerError)
        }

        logger.debug('[useAuth] ワーカー情報:', workerData ? `ID: ${workerData.worker_id}, Name: ${workerData.name}` : 'なし')
        setWorker(workerData)

        logger.debug('[useAuth] ローディング完了')
        setLoading(false)
      } catch (error) {
        logger.error('[useAuth] getUser エラー:', error)
        setUser(null)
        setWorker(null)
        setLoading(false)
      }
    }

    getUser()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null)

          if (session?.user) {
            // ワーカー情報を取得
            const { data: workerData, error: workerError } = await supabase
              .from('workers')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .eq('is_authenticated', true)
              .maybeSingle()  // single()の代わりにmaybeSingle()を使用

            if (workerError) {
              logger.error('ワーカー情報取得エラー:', workerError)
            }

            setWorker(workerData)
          } else {
            setWorker(null)
          }

          setLoading(false)
        } catch (error) {
          logger.error('useAuth onAuthStateChange エラー:', error)
          setWorker(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    worker,
    loading,
    isAuthenticated: !!user,
  }
}

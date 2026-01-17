'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Worker } from '@/lib/types/database'
import { logger } from '@/lib/utils/logger'

// コンポーネント外でクライアントを作成
const supabase = createClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初回ロード時のユーザー取得
    const getUser = async () => {
      try {
        logger.debug('[useAuth] ユーザー情報を取得中...')
        logger.debug('[useAuth] supabase.auth.getUser() を呼び出します...')

        // タイムアウト付きでリクエスト
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('タイムアウト: 5秒以内に応答がありませんでした')), 5000)
        )

        const getUserPromise = supabase.auth.getUser()

        const { data: { user }, error: userError } = await Promise.race([
          getUserPromise,
          timeoutPromise
        ]) as any

        logger.debug('[useAuth] supabase.auth.getUser() から応答を受け取りました')

        if (userError) {
          logger.error('[useAuth] ユーザー取得エラー:', userError)
          setUser(null)
          setWorker(null)
          setLoading(false)
          return
        }

        logger.debug('[useAuth] ユーザー情報:', user ? `ID: ${user.id}, Email: ${user.email}` : 'なし')
        setUser(user)

        if (user) {
          // ワーカー情報を取得
          logger.debug('[useAuth] ワーカー情報を取得中... auth_user_id:', user.id)
          const { data: workerData, error: workerError } = await supabase
            .from('workers')
            .select('*')
            .eq('auth_user_id', user.id)
            .eq('is_authenticated', true)
            .maybeSingle()  // single()の代わりにmaybeSingle()を使用

          if (workerError) {
            logger.error('[useAuth] ワーカー情報取得エラー:', workerError)
          }

          logger.debug('[useAuth] ワーカー情報:', workerData ? `ID: ${workerData.worker_id}, Name: ${workerData.name}` : 'なし')
          setWorker(workerData)
        } else {
          setWorker(null)
        }

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

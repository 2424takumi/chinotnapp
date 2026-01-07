'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Worker } from '@/lib/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // 初回ロード時のユーザー取得
    const getUser = async () => {
      try {
        console.log('[useAuth] ユーザー情報を取得中...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('[useAuth] ユーザー取得エラー:', userError)
          setUser(null)
          setWorker(null)
          setLoading(false)
          return
        }

        console.log('[useAuth] ユーザー情報:', user ? `ID: ${user.id}, Email: ${user.email}` : 'なし')
        setUser(user)

        if (user) {
          // ワーカー情報を取得
          console.log('[useAuth] ワーカー情報を取得中... auth_user_id:', user.id)
          const { data: workerData, error: workerError } = await supabase
            .from('workers')
            .select('*')
            .eq('auth_user_id', user.id)
            .eq('is_authenticated', true)
            .maybeSingle()  // single()の代わりにmaybeSingle()を使用

          if (workerError) {
            console.error('[useAuth] ワーカー情報取得エラー:', workerError)
          }

          console.log('[useAuth] ワーカー情報:', workerData ? `ID: ${workerData.worker_id}, Name: ${workerData.name}` : 'なし')
          setWorker(workerData)
        } else {
          setWorker(null)
        }

        console.log('[useAuth] ローディング完了')
        setLoading(false)
      } catch (error) {
        console.error('[useAuth] getUser エラー:', error)
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
              console.error('ワーカー情報取得エラー:', workerError)
            }

            setWorker(workerData)
          } else {
            setWorker(null)
          }

          setLoading(false)
        } catch (error) {
          console.error('useAuth onAuthStateChange エラー:', error)
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

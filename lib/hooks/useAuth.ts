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
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // ワーカー情報を取得
        const { data: workerData } = await supabase
          .from('workers')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('is_authenticated', true)
          .single()

        setWorker(workerData)
      }

      setLoading(false)
    }

    getUser()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          // ワーカー情報を取得
          const { data: workerData } = await supabase
            .from('workers')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .eq('is_authenticated', true)
            .single()

          setWorker(workerData)
        } else {
          setWorker(null)
        }

        setLoading(false)
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

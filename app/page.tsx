'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { user, worker, loading: authLoading } = useAuth()

  // 認証状態に応じてリダイレクト
  useEffect(() => {
    if (!authLoading) {
      if (user && worker) {
        // ログイン済みの場合はダッシュボードへ
        router.push('/worker/dashboard')
      } else {
        // 未ログインの場合はログイン画面へ
        router.push('/login')
      }
    }
  }, [authLoading, user, worker, router])

  // 認証チェック中またはリダイレクト中はローディング表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    </div>
  )
}

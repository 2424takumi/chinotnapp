'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { logger } from '@/lib/utils/logger'

interface AuthGuardProps {
  children: React.ReactNode
  requireWorker?: boolean // デフォルトはtrue
}

export function AuthGuard({ children, requireWorker = true }: AuthGuardProps) {
  const { user, worker, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    logger.debug('[AuthGuard] useEffect:', { loading, hasUser: !!user, hasWorker: !!worker, requireWorker })
    if (!loading) {
      if (!user) {
        // 未認証の場合はログインページにリダイレクト
        logger.debug('[AuthGuard] ユーザーなし → /login へリダイレクト')
        router.push('/login')
      } else if (requireWorker && !worker) {
        // ユーザーは存在するがワーカー情報がない場合（requireWorkerがtrueの場合のみ）
        logger.error('[AuthGuard] ワーカー情報が見つかりません。管理者にアカウント設定を依頼してください。')
        // ログアウトさせる
        signOut().then(() => {
          logger.debug('[AuthGuard] ログアウト完了 → /login へリダイレクト')
          router.push('/login')
        })
      } else {
        logger.debug('[AuthGuard] 認証OK - コンテンツ表示')
      }
    }
  }, [user, worker, loading, router, requireWorker])

  // ローディング中
  if (loading) {
    logger.debug('[AuthGuard] ローディング中を表示')
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-pretty">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null
  }

  // ユーザーは存在するがワーカー情報がない場合（requireWorkerがtrueの場合のみエラー表示）
  if (requireWorker && !worker) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="size-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-balance">アカウント設定エラー</h2>
          <p className="text-gray-600 mb-4 text-pretty">
            ワーカー情報が見つかりません。<br />
            管理者にアカウント設定を依頼してください。
          </p>
          <button
            onClick={() => {
              signOut().then(() => router.push('/login'))
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    )
  }

  // 認証済みかつワーカー情報も存在する場合は子要素を表示
  return <>{children}</>
}

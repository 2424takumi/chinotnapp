'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { SessionStartForm } from '@/components/worker/SessionStartForm'
import { SessionStopForm } from '@/components/worker/SessionStopForm'
import {
  startWorkSession,
  stopWorkSession,
  getActiveSession,
  abandonSession,
  type ActiveSessionData,
} from '@/lib/services/sessionService'

function DashboardContent() {
  const { worker } = useAuth()
  const router = useRouter()
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (worker) {
      checkActiveSession()
    }
  }, [worker])

  const checkActiveSession = async () => {
    if (!worker) return

    setInitialLoading(true)
    const { data } = await getActiveSession(worker.worker_id)
    setActiveSession(data)
    setInitialLoading(false)
  }

  const handleStartSession = async (params: {
    partId: string
    operationId: string
    attributeValueIds: string[]
  }) => {
    if (!worker) return

    setLoading(true)
    try {
      const { data, error } = await startWorkSession({
        workerId: worker.worker_id,
        partId: params.partId,
        operationId: params.operationId,
        attributeValueIds: params.attributeValueIds,
      })

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      // アクティブセッションを再取得
      await checkActiveSession()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStopSession = async (params: {
    quantity: number
    lossQuantity?: number
    note?: string
  }) => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { data, error } = await stopWorkSession({
        sessionId: activeSession.session.session_id,
        quantity: params.quantity,
        lossQuantity: params.lossQuantity,
        note: params.note,
      })

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      alert('作業を完了しました')
      setActiveSession(null)
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAbandonSession = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { error } = await abandonSession(activeSession.session.session_id)

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      alert('作業をキャンセルしました')
      setActiveSession(null)
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (activeSession) {
      if (!confirm('作業中です。ログアウトしますか？')) {
        return
      }
    }

    await signOut()
    router.push('/login')
    router.refresh()
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                作業ダッシュボード
              </h1>
              {worker && (
                <p className="mt-1 text-sm text-gray-600">
                  作業者: {worker.name}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {activeSession ? '作業中' : '作業開始'}
          </h2>

          {activeSession ? (
            <SessionStopForm
              sessionData={activeSession}
              onStop={handleStopSession}
              onAbandon={handleAbandonSession}
              loading={loading}
            />
          ) : (
            worker && (
              <SessionStartForm
                workerId={worker.worker_id}
                onStart={handleStartSession}
                loading={loading}
              />
            )
          )}
        </div>
      </main>
    </div>
  )
}

export default function WorkerDashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

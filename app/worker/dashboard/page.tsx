'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { SessionStartForm } from '@/components/worker/SessionStartForm'
import { SessionStopForm } from '@/components/worker/SessionStopForm'
import { ManualEntryForm } from '@/components/worker/ManualEntryForm'
import {
  startWorkSession,
  stopWorkSession,
  getActiveSession,
  abandonSession,
  type ActiveSessionData,
} from '@/lib/services/sessionService'
import { createClient } from '@/lib/supabase/client'

function DashboardContent() {
  const { worker } = useAuth()
  const router = useRouter()
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')

  const checkActiveSession = useCallback(async () => {
    if (!worker) return

    setInitialLoading(true)
    const { data } = await getActiveSession(worker.worker_id)
    setActiveSession(data)
    setInitialLoading(false)
  }, [worker])

  useEffect(() => {
    if (worker) {
      checkActiveSession()
    }
  }, [worker, checkActiveSession])

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

  const handleManualSubmit = async (params: {
    workerId: string
    partId: string
    operationId: string
    durationMinutes: number
    quantity: number
    lossQuantity: number
    note: string
    attributeValueIds: string[]
  }) => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 作業ログを直接作成
      const { data: workLog, error: workLogError } = await supabase
        .from('work_logs')
        .insert({
          worker_id: params.workerId,
          part_id: params.partId,
          operation_id: params.operationId,
          duration_minutes: params.durationMinutes,
          quantity: params.quantity,
          loss_quantity: params.lossQuantity,
          note: params.note || null,
          work_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (workLogError) {
        alert(`エラー: ${workLogError.message}`)
        return
      }

      // 属性値を保存
      if (params.attributeValueIds.length > 0 && workLog) {
        const logAttributeInserts = params.attributeValueIds.map(valueId => ({
          work_log_id: workLog.log_id,
          value_id: valueId,
        }))

        const { error: logAttrError } = await supabase
          .from('work_log_attributes')
          .insert(logAttributeInserts)

        if (logAttrError) {
          console.error('作業ログ属性の保存エラー:', logAttrError)
        }
      }

      alert('作業を登録しました')
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
            <div className="flex gap-2">
              <a
                href="/admin/charts"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                グラフを見る
              </a>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* モード切替（セッション中は非表示） */}
          {!activeSession && (
            <div className="mb-6 flex gap-2 border-b pb-4">
              <button
                onClick={() => setMode('timer')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'timer'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                スタート/ストップ
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                手動で登録
              </button>
            </div>
          )}

          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {activeSession
              ? '作業中'
              : mode === 'timer'
              ? 'タイマーで作業開始'
              : '手動で作業を登録'}
          </h2>

          {activeSession ? (
            <SessionStopForm
              sessionData={activeSession}
              onStop={handleStopSession}
              onAbandon={handleAbandonSession}
              loading={loading}
            />
          ) : mode === 'timer' ? (
            worker && (
              <SessionStartForm
                workerId={worker.worker_id}
                onStart={handleStartSession}
                loading={loading}
              />
            )
          ) : (
            <ManualEntryForm
              workerId={worker?.worker_id}
              onSubmit={handleManualSubmit}
              loading={loading}
            />
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

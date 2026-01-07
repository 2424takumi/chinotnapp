'use client'

import { useState, useEffect } from 'react'
import type { ActiveSessionData } from '@/lib/services/sessionService'

interface SessionStopFormProps {
  sessionData: ActiveSessionData
  onStop: (params: { quantity: number; lossQuantity?: number; note?: string }) => Promise<void>
  onAbandon: () => Promise<void>
  loading: boolean
}

export function SessionStopForm({
  sessionData,
  onStop,
  onAbandon,
  loading,
}: SessionStopFormProps) {
  const [quantity, setQuantity] = useState('')
  const [lossQuantity, setLossQuantity] = useState('0')
  const [note, setNote] = useState('')
  const [elapsedTime, setElapsedTime] = useState(sessionData.elapsedSeconds)

  // タイマー更新
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      alert('数量を正しく入力してください')
      return
    }

    const lossQty = parseInt(lossQuantity)
    if (isNaN(lossQty) || lossQty < 0) {
      alert('不良数を正しく入力してください')
      return
    }

    await onStop({
      quantity: qty,
      lossQuantity: lossQty,
      note: note.trim() || undefined,
    })
  }

  const handleAbandon = async () => {
    if (!confirm('この作業をキャンセルしますか？記録は保存されません。')) {
      return
    }

    await onAbandon()
  }

  return (
    <div className="space-y-6">
      {/* セッション情報 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600 mb-1">作業時間</div>
          <div className="text-4xl font-bold text-gray-900 font-mono">
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">部品:</span>
            <span className="font-medium">{sessionData.partName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">工程:</span>
            <span className="font-medium">{sessionData.operationName}</span>
          </div>
          {sessionData.attributeValues.length > 0 && (
            <div className="pt-2 border-t">
              {sessionData.attributeValues.map((attr, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{attr.attributeName}:</span>
                  <span className="font-medium">{attr.valueName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 停止フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            完成数量 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            min="1"
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            placeholder="例: 10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            不良数
          </label>
          <input
            type="number"
            value={lossQuantity}
            onChange={(e) => setLossQuantity(e.target.value)}
            min="0"
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            placeholder="例: 0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            placeholder="備考があれば入力してください"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登録中...' : '作業終了'}
          </button>

          <button
            type="button"
            onClick={handleAbandon}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}

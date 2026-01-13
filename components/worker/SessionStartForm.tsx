'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Part, Operation } from '@/lib/types/database'

interface SessionStartFormProps {
  workerId: string
  onStart: (params: {
    partId: string
    operationId: string
  }) => Promise<void>
  loading: boolean
}

export function SessionStartForm({ workerId, onStart, loading }: SessionStartFormProps) {
  const supabase = createClient()

  const [parts, setParts] = useState<Part[]>([])
  const [operations, setOperations] = useState<Operation[]>([])

  const [selectedPartId, setSelectedPartId] = useState('')
  const [selectedOperationId, setSelectedOperationId] = useState('')

  // 部品一覧を取得
  useEffect(() => {
    fetchParts()
  }, [])

  // 工程一覧を取得（部品選択時）
  useEffect(() => {
    if (selectedPartId) {
      fetchOperations(selectedPartId)
    } else {
      setOperations([])
      setSelectedOperationId('')
    }
  }, [selectedPartId])

  const fetchParts = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('active', true)
      .order('order_index')
    if (error) {
      console.error('部品取得エラー:', error)
      alert(`部品の取得に失敗しました: ${error.message}`)
    }
    if (data) setParts(data)
  }

  const fetchOperations = async (partId: string) => {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .eq('part_id', partId)
      .eq('active', true)
      .order('order_index')
    if (error) {
      console.error('工程取得エラー:', error)
      alert(`工程の取得に失敗しました: ${error.message}`)
    }
    if (data) setOperations(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPartId || !selectedOperationId) {
      alert('部品と工程を選択してください')
      return
    }

    await onStart({
      partId: selectedPartId,
      operationId: selectedOperationId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* 部品選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            部品 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPartId}
            onChange={(e) => setSelectedPartId(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {parts.map((part) => (
              <option key={part.part_id} value={part.part_id}>
                {part.name}
              </option>
            ))}
          </select>
        </div>

        {/* 工程選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工程 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedOperationId}
            onChange={(e) => setSelectedOperationId(e.target.value)}
            required
            disabled={!selectedPartId || loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {operations.map((operation) => (
              <option key={operation.operation_id} value={operation.operation_id}>
                {operation.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-600">
          ※ 種類（色・形など）は作業終了時に入力します
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !selectedPartId || !selectedOperationId}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '開始中...' : '作業開始'}
      </button>
    </form>
  )
}

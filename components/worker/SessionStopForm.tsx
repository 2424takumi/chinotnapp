'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActiveSessionData } from '@/lib/services/sessionService'
import type { VariantAttribute, VariantAttributeValue } from '@/lib/types/database'
import type { SessionStopItem } from '@/lib/services/sessionService'

interface SessionStopFormProps {
  sessionData: ActiveSessionData
  onStop: (params: { items: SessionStopItem[]; note?: string }) => Promise<void>
  onAbandon: () => Promise<void>
  loading: boolean
}

interface WorkItem {
  id: string // ユニークID（フロントエンド用）
  attributeValueIds: Record<string, string> // attribute_id -> value_id
  quantity: string
  lossQuantity: string
}

export function SessionStopForm({
  sessionData,
  onStop,
  onAbandon,
  loading,
}: SessionStopFormProps) {
  const supabase = createClient()

  const [attributes, setAttributes] = useState<VariantAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, VariantAttributeValue[]>>({})
  const [items, setItems] = useState<WorkItem[]>([
    {
      id: crypto.randomUUID(),
      attributeValueIds: {},
      quantity: '',
      lossQuantity: '0',
    },
  ])
  const [note, setNote] = useState('')
  const [elapsedTime, setElapsedTime] = useState(sessionData.elapsedSeconds)

  // 工程に紐づく属性を取得
  useEffect(() => {
    fetchAttributesAndValues()
  }, [])

  const fetchAttributesAndValues = async () => {
    const { data: operationAttrs } = await supabase
      .from('operation_variant_attributes')
      .select('attribute_id')
      .eq('operation_id', sessionData.session.operation_id)

    if (!operationAttrs || operationAttrs.length === 0) {
      setAttributes([])
      setAttributeValues({})
      return
    }

    const attributeIds = operationAttrs.map(a => a.attribute_id)

    const { data: attrs } = await supabase
      .from('variant_attributes')
      .select('*')
      .in('attribute_id', attributeIds)
      .eq('active', true)
      .order('order_index')

    if (attrs) {
      setAttributes(attrs)

      const valuesMap: Record<string, VariantAttributeValue[]> = {}
      for (const attr of attrs) {
        const { data: values } = await supabase
          .from('variant_attribute_values')
          .select('*')
          .eq('attribute_id', attr.attribute_id)
          .eq('active', true)
          .order('order_index')

        if (values) {
          valuesMap[attr.attribute_id] = values
        }
      }
      setAttributeValues(valuesMap)
    }
  }

  // セッション開始時刻を取得
  const startTime = new Date(sessionData.session.start_time)

  // 経過時間を再計算する関数
  const calculateElapsedTime = () => {
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    setElapsedTime(elapsed)
  }

  // タイマー更新（開始時刻から毎秒再計算）
  useEffect(() => {
    calculateElapsedTime()

    const interval = setInterval(() => {
      calculateElapsedTime()
    }, 1000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        calculateElapsedTime()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        attributeValueIds: {},
        quantity: '',
        lossQuantity: '0',
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) {
      alert('最低1つの種類が必要です')
      return
    }
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof WorkItem, value: any) => {
    setItems(items.map(item => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const updateItemAttribute = (itemId: string, attributeId: string, valueId: string) => {
    setItems(
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              attributeValueIds: {
                ...item.attributeValueIds,
                [attributeId]: valueId,
              },
            }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 属性値チェック
      const missingAttrs = attributes.filter(attr => !item.attributeValueIds[attr.attribute_id])
      if (missingAttrs.length > 0) {
        alert(
          `種類${i + 1}: 以下の属性を選択してください: ${missingAttrs.map(a => a.name).join(', ')}`
        )
        return
      }

      // 数量チェック
      const qty = parseInt(item.quantity)
      if (isNaN(qty) || qty <= 0) {
        alert(`種類${i + 1}: 完成数量を正しく入力してください`)
        return
      }

      // 不良数チェック
      const lossQty = parseInt(item.lossQuantity)
      if (isNaN(lossQty) || lossQty < 0) {
        alert(`種類${i + 1}: 不良数を正しく入力してください`)
        return
      }
    }

    // SessionStopItem形式に変換
    const stopItems: SessionStopItem[] = items.map(item => ({
      attributeValueIds: Object.values(item.attributeValueIds),
      quantity: parseInt(item.quantity),
      lossQuantity: parseInt(item.lossQuantity),
    }))

    await onStop({
      items: stopItems,
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
        </div>
      </div>

      {/* 停止フォーム */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 複数種類の入力 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">作業した種類と数量</h3>
            <button
              type="button"
              onClick={addItem}
              disabled={loading}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              + 種類を追加
            </button>
          </div>

          {items.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-300 rounded-lg p-4 space-y-4 bg-white"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">種類 {index + 1}</h4>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={loading}
                    className="text-red-600 text-sm hover:text-red-800 disabled:opacity-50"
                  >
                    削除
                  </button>
                )}
              </div>

              {/* 属性選択 */}
              {attributes.map(attribute => (
                <div key={attribute.attribute_id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {attribute.name} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.attributeValueIds[attribute.attribute_id] || ''}
                    onChange={e =>
                      updateItemAttribute(item.id, attribute.attribute_id, e.target.value)
                    }
                    required
                    disabled={loading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">選択してください</option>
                    {attributeValues[attribute.attribute_id]?.map(value => (
                      <option key={value.value_id} value={value.value_id}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* 完成数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  完成数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                  required
                  min="1"
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  placeholder="例: 10"
                />
              </div>

              {/* 不良数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">不良数</label>
                <input
                  type="number"
                  value={item.lossQuantity}
                  onChange={e => updateItem(item.id, 'lossQuantity', e.target.value)}
                  min="0"
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  placeholder="例: 0"
                />
              </div>
            </div>
          ))}
        </div>

        {/* メモ（全体共通） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">メモ（全体共通）</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
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

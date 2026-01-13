'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Part, Operation, VariantAttribute, VariantAttributeValue, Worker } from '@/lib/types/database'

interface ManualEntryFormProps {
  workerId?: string
  onSubmit: (params: {
    workerId: string
    partId: string
    operationId: string
    durationMinutes: number
    quantity: number
    lossQuantity: number
    note: string
    attributeValueIds: string[]
  }) => Promise<void>
  loading: boolean
}

export function ManualEntryForm({ workerId, onSubmit, loading }: ManualEntryFormProps) {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [attributes, setAttributes] = useState<VariantAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, VariantAttributeValue[]>>({})

  const [selectedWorkerId, setSelectedWorkerId] = useState(workerId || '')
  const [selectedPartId, setSelectedPartId] = useState('')
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})

  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')
  const [quantity, setQuantity] = useState('')
  const [lossQuantity, setLossQuantity] = useState('0')
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchWorkers()
    fetchParts()
  }, [])

  useEffect(() => {
    if (selectedPartId) {
      fetchOperations(selectedPartId)
    } else {
      setOperations([])
      setSelectedOperationId('')
    }
  }, [selectedPartId])

  useEffect(() => {
    if (selectedOperationId) {
      fetchAttributesAndValues(selectedOperationId)
    } else {
      setAttributes([])
      setAttributeValues({})
      setSelectedAttributeValues({})
    }
  }, [selectedOperationId])

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('active', true)
      .order('order_index')
    if (error) {
      console.error('作業者取得エラー:', error)
      alert(`作業者の取得に失敗しました: ${error.message}`)
    }
    if (data) setWorkers(data)
  }

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

  const fetchAttributesAndValues = async (operationId: string) => {
    const { data: operationAttrs } = await supabase
      .from('operation_variant_attributes')
      .select('attribute_id')
      .eq('operation_id', operationId)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWorkerId) {
      alert('作業者を選択してください')
      return
    }

    if (!selectedPartId || !selectedOperationId) {
      alert('部品と工程を選択してください')
      return
    }

    const missingAttributes = attributes.filter(
      attr => !selectedAttributeValues[attr.attribute_id]
    )

    if (missingAttributes.length > 0) {
      alert(`以下の属性を選択してください: ${missingAttributes.map(a => a.name).join(', ')}`)
      return
    }

    const durationMinutes = parseInt(hours) * 60 + parseInt(minutes)
    const qty = parseInt(quantity)
    const loss = parseInt(lossQuantity)

    if (durationMinutes <= 0) {
      alert('作業時間を入力してください')
      return
    }

    if (!qty || qty <= 0) {
      alert('数量を入力してください')
      return
    }

    if (loss < 0) {
      alert('不良数は0以上で入力してください')
      return
    }

    const attributeValueIds = Object.values(selectedAttributeValues).filter(Boolean)

    await onSubmit({
      workerId: selectedWorkerId,
      partId: selectedPartId,
      operationId: selectedOperationId,
      durationMinutes,
      quantity: qty,
      lossQuantity: loss,
      note: note.trim(),
      attributeValueIds,
    })

    // フォームをリセット
    setSelectedWorkerId(workerId || '')
    setSelectedPartId('')
    setSelectedOperationId('')
    setSelectedAttributeValues({})
    setHours('0')
    setMinutes('0')
    setQuantity('')
    setLossQuantity('0')
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {/* 作業者選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業者 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">選択してください</option>
            {workers.map((worker) => (
              <option key={worker.worker_id} value={worker.worker_id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>

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

        {/* 属性選択 */}
        {attributes.map((attribute) => (
          <div key={attribute.attribute_id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {attribute.name} <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAttributeValues[attribute.attribute_id] || ''}
              onChange={(e) =>
                setSelectedAttributeValues({
                  ...selectedAttributeValues,
                  [attribute.attribute_id]: e.target.value,
                })
              }
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">選択してください</option>
              {attributeValues[attribute.attribute_id]?.map((value) => (
                <option key={value.value_id} value={value.value_id}>
                  {value.name}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* 作業時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業時間 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min="0"
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="時間"
              />
              <span className="text-xs text-gray-500 mt-1 block">時間</span>
            </div>
            <div>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min="0"
                max="59"
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="分"
              />
              <span className="text-xs text-gray-500 mt-1 block">分</span>
            </div>
          </div>
        </div>

        {/* 数量 */}
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

        {/* 不良数 */}
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

        {/* メモ */}
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
      </div>

      <button
        type="submit"
        disabled={loading || !selectedWorkerId || !selectedPartId || !selectedOperationId}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '登録中...' : '作業を登録'}
      </button>
    </form>
  )
}

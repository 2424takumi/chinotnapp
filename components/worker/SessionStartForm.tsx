'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Part, Operation, VariantAttribute, VariantAttributeValue } from '@/lib/types/database'

interface SessionStartFormProps {
  workerId: string
  onStart: (params: {
    partId: string
    operationId: string
    attributeValueIds: string[]
  }) => Promise<void>
  loading: boolean
}

export function SessionStartForm({ workerId, onStart, loading }: SessionStartFormProps) {
  const supabase = createClient()

  const [parts, setParts] = useState<Part[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [attributes, setAttributes] = useState<VariantAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, VariantAttributeValue[]>>({})

  const [selectedPartId, setSelectedPartId] = useState('')
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})

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

  // 属性と属性値を取得（工程選択時）
  useEffect(() => {
    if (selectedOperationId) {
      fetchAttributesAndValues(selectedOperationId)
    } else {
      setAttributes([])
      setAttributeValues({})
      setSelectedAttributeValues({})
    }
  }, [selectedOperationId])

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
    // この工程で使用される属性を取得
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

    // 属性情報を取得
    const { data: attrs } = await supabase
      .from('variant_attributes')
      .select('*')
      .in('attribute_id', attributeIds)
      .eq('active', true)
      .order('order_index')

    if (attrs) {
      setAttributes(attrs)

      // 各属性の値を取得
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

    if (!selectedPartId || !selectedOperationId) {
      alert('部品と工程を選択してください')
      return
    }

    // 必須の属性が全て選択されているか確認
    const missingAttributes = attributes.filter(
      attr => !selectedAttributeValues[attr.attribute_id]
    )

    if (missingAttributes.length > 0) {
      alert(`以下の属性を選択してください: ${missingAttributes.map(a => a.name).join(', ')}`)
      return
    }

    const attributeValueIds = Object.values(selectedAttributeValues).filter(Boolean)

    await onStart({
      partId: selectedPartId,
      operationId: selectedOperationId,
      attributeValueIds,
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

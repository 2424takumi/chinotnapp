import { createClient } from '@/lib/supabase/client'

export interface InventoryCheckResult {
  available: boolean
  shortages: Array<{
    partName: string
    operationName: string
    required: number
    available: number
    shortage: number
    attributeValues?: Record<string, string>
  }>
}

export interface OrderInventoryConsumption {
  consumption_id: string
  order_id: string
  order_item_id: string
  operation_id: string
  consumed_quantity: number
  consumed_attribute_values: Record<string, string> | null
  is_deleted: boolean
  created_at: string
}

/**
 * variant_idから最終工程を取得
 */
export async function getFinalOperationForVariant(variantId: string) {
  const supabase = createClient()

  try {
    // 1. variantからbase_part_idを取得
    const { data: variant, error: variantError } = await supabase
      .from('product_variants_v2')
      .select('base_part_id')
      .eq('variant_id', variantId)
      .single()

    if (variantError || !variant) {
      throw new Error(`バリエーションが見つかりません: ${variantError?.message}`)
    }

    // 2. そのpart_idの最終工程（order_index最大）を取得
    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('*')
      .eq('part_id', variant.base_part_id)
      .eq('active', true)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    if (operationError || !operation) {
      throw new Error(`最終工程が見つかりません: ${operationError?.message}`)
    }

    return { data: operation, error: null }
  } catch (error: any) {
    console.error('最終工程取得エラー:', error)
    return { data: null, error }
  }
}

/**
 * variant_idから属性値を取得
 */
export async function getAttributeValuesForVariant(variantId: string) {
  const supabase = createClient()

  try {
    const { data: assignments, error } = await supabase
      .from('variant_attribute_assignments')
      .select(`
        value_id,
        variant_attribute_values (
          name,
          attribute_id,
          variant_attributes (
            name
          )
        )
      `)
      .eq('variant_id', variantId)

    if (error) {
      throw error
    }

    // {attribute_id: value_id} の形式に変換
    const attributeValues: Record<string, string> = {}
    const attributeNames: Record<string, string> = {}

    assignments?.forEach((assignment: any) => {
      const attrName = assignment.variant_attribute_values.variant_attributes.name
      const valueName = assignment.variant_attribute_values.name
      const attrId = assignment.variant_attribute_values.attribute_id
      const valueId = assignment.value_id

      attributeValues[attrId] = valueId
      attributeNames[attrName] = valueName
    })

    return { data: { attributeValues, attributeNames }, error: null }
  } catch (error: any) {
    console.error('属性値取得エラー:', error)
    return { data: null, error }
  }
}

/**
 * 受注の在庫チェック
 */
export async function checkInventoryForOrder(orderId: string): Promise<InventoryCheckResult> {
  const supabase = createClient()

  try {
    // 1. 受注明細を取得
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*, product_variants_v2(variant_id, base_part_id, display_name)')
      .eq('order_id', orderId)

    if (orderItemsError || !orderItems) {
      throw new Error(`受注明細の取得に失敗: ${orderItemsError?.message}`)
    }

    const shortages: InventoryCheckResult['shortages'] = []

    // 2. 各明細ごとに在庫チェック
    for (const item of orderItems) {
      const variantId = item.product_variants_v2.variant_id
      const requiredQty = item.quantity

      // 最終工程を取得
      const { data: operation, error: opError } = await getFinalOperationForVariant(variantId)
      if (opError || !operation) {
        throw new Error(`最終工程の取得に失敗: ${opError?.message}`)
      }

      // 属性値を取得
      const { data: attrData, error: attrError } = await getAttributeValuesForVariant(variantId)
      if (attrError) {
        throw new Error(`属性値の取得に失敗: ${attrError?.message}`)
      }

      // 在庫を計算（簡易版：詳細な計算はinventory/page.tsxから移植する）
      const availableQty = await calculateOperationInventory(
        operation.operation_id,
        attrData?.attributeValues || null
      )

      // 不足チェック
      if (availableQty < requiredQty) {
        // 部品名を取得
        const { data: part } = await supabase
          .from('parts')
          .select('name')
          .eq('part_id', operation.part_id)
          .single()

        shortages.push({
          partName: part?.name || '不明',
          operationName: operation.name,
          required: requiredQty,
          available: availableQty,
          shortage: requiredQty - availableQty,
          attributeValues: attrData?.attributeNames || undefined,
        })
      }
    }

    return {
      available: shortages.length === 0,
      shortages,
    }
  } catch (error: any) {
    console.error('在庫チェックエラー:', error)
    return {
      available: false,
      shortages: [],
    }
  }
}

/**
 * 工程の在庫を計算（属性値指定版）
 */
async function calculateOperationInventory(
  operationId: string,
  attributeValues: Record<string, string> | null
): Promise<number> {
  const supabase = createClient()

  try {
    // 1. 作業ログから生産数を集計
    let workLogsQuery = supabase
      .from('work_logs')
      .select('quantity, loss_quantity, log_id, work_log_attributes(value_id)')
      .eq('operation_id', operationId)
      .eq('is_deleted', false)

    const { data: workLogs, error: workLogsError } = await workLogsQuery

    if (workLogsError) {
      throw workLogsError
    }

    // 属性値でフィルタ
    let goodTotal = 0
    let totalQuantity = 0

    for (const log of workLogs || []) {
      // 属性値が指定されている場合、一致するログのみカウント
      if (attributeValues) {
        const logAttrs: any[] = log.work_log_attributes || []
        const logAttrValueIds = logAttrs.map(a => a.value_id)
        const requiredValueIds = Object.values(attributeValues)

        // すべての属性値が一致するかチェック
        const allMatch = requiredValueIds.every(vid => logAttrValueIds.includes(vid))
        if (!allMatch) {
          continue
        }
      }

      goodTotal += (log.quantity - log.loss_quantity)
      totalQuantity += log.quantity
    }

    // 2. 次工程での消費を取得（process_consumption）
    const { data: nextOpConsumptions } = await supabase
      .from('process_consumption')
      .select('consumed_quantity, consumed_attribute_values')
      .eq('consumed_operation_id', operationId)
      .order('created_at', { ascending: false })

    let nextOpConsumed = 0
    for (const consumption of nextOpConsumptions || []) {
      // 属性値が指定されている場合、一致する消費のみカウント
      if (attributeValues && consumption.consumed_attribute_values) {
        const consumedAttrs = consumption.consumed_attribute_values as Record<string, string>
        const allMatch = Object.entries(attributeValues).every(
          ([attrId, valueId]) => consumedAttrs[attrId] === valueId
        )
        if (!allMatch) {
          continue
        }
      }
      nextOpConsumed += consumption.consumed_quantity
    }

    // 3. BOM消費を取得（最終工程のみ）
    const { data: bomConsumptions } = await supabase
      .from('bom_consumption')
      .select('consumed_quantity, work_logs!inner(operation_id)')
      .eq('work_logs.operation_id', operationId)

    const bomConsumed = bomConsumptions?.reduce((sum, c) => sum + c.consumed_quantity, 0) || 0

    // 4. 在庫調整を取得
    const { data: adjustments } = await supabase
      .from('inventory_adjustments')
      .select('adjustment_quantity, inventory_adjustment_attributes(value_id)')
      .eq('operation_id', operationId)

    let adjustmentTotal = 0
    for (const adj of adjustments || []) {
      // 属性値が指定されている場合、一致する調整のみカウント
      if (attributeValues) {
        const adjAttrs: any[] = adj.inventory_adjustment_attributes || []
        const adjAttrValueIds = adjAttrs.map(a => a.value_id)
        const requiredValueIds = Object.values(attributeValues)

        const allMatch = requiredValueIds.every(vid => adjAttrValueIds.includes(vid))
        if (!allMatch) {
          continue
        }
      }

      adjustmentTotal += adj.adjustment_quantity
    }

    // 5. 受注消費を取得
    const { data: orderConsumptions } = await supabase
      .from('order_inventory_consumption')
      .select('consumed_quantity, consumed_attribute_values')
      .eq('operation_id', operationId)
      .eq('is_deleted', false)

    let orderConsumed = 0
    for (const consumption of orderConsumptions || []) {
      // 属性値が指定されている場合、一致する消費のみカウント
      if (attributeValues && consumption.consumed_attribute_values) {
        const consumedAttrs = consumption.consumed_attribute_values as Record<string, string>
        const allMatch = Object.entries(attributeValues).every(
          ([attrId, valueId]) => consumedAttrs[attrId] === valueId
        )
        if (!allMatch) {
          continue
        }
      }
      orderConsumed += consumption.consumed_quantity
    }

    // 6. 在庫計算
    const inventory = goodTotal - nextOpConsumed - bomConsumed + adjustmentTotal - orderConsumed

    return Math.max(0, inventory)
  } catch (error: any) {
    console.error('在庫計算エラー:', error)
    return 0
  }
}

/**
 * 受注の在庫を消費（納品完了時）
 */
export async function consumeInventoryForOrder(orderId: string) {
  const supabase = createClient()

  try {
    // 1. 在庫チェック
    const checkResult = await checkInventoryForOrder(orderId)
    if (!checkResult.available) {
      const shortageMessages = checkResult.shortages.map(s => {
        const attrStr = s.attributeValues
          ? ` (${Object.entries(s.attributeValues).map(([k, v]) => `${k}:${v}`).join(', ')})`
          : ''
        return `${s.partName} - ${s.operationName}${attrStr}: ${s.shortage}個不足`
      })
      throw new Error(`在庫不足のため納品完了できません:\n${shortageMessages.join('\n')}`)
    }

    // 2. 受注明細を取得
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*, product_variants_v2(variant_id)')
      .eq('order_id', orderId)

    if (orderItemsError || !orderItems) {
      throw new Error(`受注明細の取得に失敗: ${orderItemsError?.message}`)
    }

    // 3. 各明細の在庫を消費
    const consumptions: any[] = []

    for (const item of orderItems) {
      const variantId = item.product_variants_v2.variant_id

      // 最終工程を取得
      const { data: operation, error: opError } = await getFinalOperationForVariant(variantId)
      if (opError || !operation) {
        throw new Error(`最終工程の取得に失敗: ${opError?.message}`)
      }

      // 属性値を取得
      const { data: attrData, error: attrError } = await getAttributeValuesForVariant(variantId)
      if (attrError) {
        throw new Error(`属性値の取得に失敗: ${attrError?.message}`)
      }

      // 消費レコードを作成
      consumptions.push({
        order_id: orderId,
        order_item_id: item.order_item_id,
        operation_id: operation.operation_id,
        consumed_quantity: item.quantity,
        consumed_attribute_values: attrData?.attributeValues || null,
        is_deleted: false,
      })
    }

    // 4. 一括挿入
    const { error: insertError } = await supabase
      .from('order_inventory_consumption')
      .insert(consumptions)

    if (insertError) {
      throw new Error(`在庫消費の記録に失敗: ${insertError.message}`)
    }

    return { data: consumptions, error: null }
  } catch (error: any) {
    console.error('在庫消費エラー:', error)
    return { data: null, error }
  }
}

/**
 * 受注の在庫を復元（納品完了取り消し時）
 */
export async function restoreInventoryForOrder(orderId: string) {
  const supabase = createClient()

  try {
    // 消費レコードを論理削除（is_deleted = true）
    const { error } = await supabase
      .from('order_inventory_consumption')
      .update({ is_deleted: true })
      .eq('order_id', orderId)
      .eq('is_deleted', false)

    if (error) {
      throw new Error(`在庫復元に失敗: ${error.message}`)
    }

    return { data: true, error: null }
  } catch (error: any) {
    console.error('在庫復元エラー:', error)
    return { data: null, error }
  }
}

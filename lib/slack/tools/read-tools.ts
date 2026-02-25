import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * 今日/期間の生産実績を取得するツール
 */
export const getProductionStats = tool({
  description: '生産実績を取得します。今日の実績や指定した期間の生産数、ロス数、作業時間を確認できます。',
  parameters: z.object({
    dateFrom: z.string().optional().describe('開始日（YYYY-MM-DD形式）。省略時は今日'),
    dateTo: z.string().optional().describe('終了日（YYYY-MM-DD形式）。省略時は今日'),
    partId: z.string().optional().describe('部品ID（特定の部品で絞り込む場合）'),
  }),
  execute: async ({ dateFrom, dateTo, partId }) => {
    const supabase = createServerClient()

    // デフォルトは今日
    const today = new Date().toISOString().split('T')[0]
    const from = dateFrom || today
    const to = dateTo || today

    try {
      let query = supabase
        .from('work_logs')
        .select(`
          duration_minutes,
          quantity,
          loss_quantity,
          parts:part_id(name),
          operations:operation_id(name)
        `)
        .eq('is_deleted', false)
        .gte('work_date', from)
        .lte('work_date', to)

      if (partId) {
        query = query.eq('part_id', partId)
      }

      const { data, error } = await query

      if (error) {
        logger.error('[getProductionStats] クエリエラー:', error)
        return { error: 'データ取得に失敗しました' }
      }

      // 集計
      const totalQuantity = data?.reduce((sum, log) => sum + (log.quantity || 0), 0) || 0
      const totalLoss = data?.reduce((sum, log) => sum + (log.loss_quantity || 0), 0) || 0
      const totalMinutes = data?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0
      const goodQuantity = totalQuantity - totalLoss
      const lossRate = totalQuantity > 0 ? ((totalLoss / totalQuantity) * 100).toFixed(1) : '0'

      // 時間を時:分形式に変換
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      const timeStr = `${hours}時間${minutes}分`

      // 部品別の集計
      const partSummary: Record<string, { quantity: number; loss: number }> = {}
      data?.forEach((log: any) => {
        const partName = log.parts?.name || '不明'
        if (!partSummary[partName]) {
          partSummary[partName] = { quantity: 0, loss: 0 }
        }
        partSummary[partName].quantity += log.quantity || 0
        partSummary[partName].loss += log.loss_quantity || 0
      })

      return {
        period: from === to ? from : `${from} 〜 ${to}`,
        totalQuantity,
        goodQuantity,
        totalLoss,
        lossRate: `${lossRate}%`,
        totalTime: timeStr,
        recordCount: data?.length || 0,
        partSummary,
      }
    } catch (error) {
      logger.error('[getProductionStats] エラー:', error)
      return { error: '生産実績の取得中にエラーが発生しました' }
    }
  },
})

/**
 * 作業者別の実績を取得するツール
 */
export const getWorkerStats = tool({
  description: '作業者別の生産実績を取得します。特定の作業者の実績や全作業者の比較ができます。',
  parameters: z.object({
    dateFrom: z.string().optional().describe('開始日（YYYY-MM-DD形式）。省略時は今日'),
    dateTo: z.string().optional().describe('終了日（YYYY-MM-DD形式）。省略時は今日'),
    workerName: z.string().optional().describe('作業者名（部分一致で検索）'),
  }),
  execute: async ({ dateFrom, dateTo, workerName }) => {
    const supabase = createServerClient()

    const today = new Date().toISOString().split('T')[0]
    const from = dateFrom || today
    const to = dateTo || today

    try {
      // まず作業者を取得
      let workersQuery = supabase
        .from('workers')
        .select('worker_id, name')
        .eq('active', true)

      if (workerName) {
        workersQuery = workersQuery.ilike('name', `%${workerName}%`)
      }

      const { data: workers, error: workersError } = await workersQuery

      if (workersError) {
        logger.error('[getWorkerStats] 作業者取得エラー:', workersError)
        return { error: '作業者データ取得に失敗しました' }
      }

      if (!workers || workers.length === 0) {
        return { error: '該当する作業者が見つかりません' }
      }

      // 作業ログを取得
      const workerIds = workers.map(w => w.worker_id)
      const { data: logs, error: logsError } = await supabase
        .from('work_logs')
        .select('worker_id, duration_minutes, quantity, loss_quantity')
        .eq('is_deleted', false)
        .gte('work_date', from)
        .lte('work_date', to)
        .in('worker_id', workerIds)

      if (logsError) {
        logger.error('[getWorkerStats] ログ取得エラー:', logsError)
        return { error: 'ログデータ取得に失敗しました' }
      }

      // 作業者ごとに集計
      const workerSummary = workers.map(worker => {
        const workerLogs = logs?.filter(log => log.worker_id === worker.worker_id) || []
        const quantity = workerLogs.reduce((sum, log) => sum + (log.quantity || 0), 0)
        const loss = workerLogs.reduce((sum, log) => sum + (log.loss_quantity || 0), 0)
        const minutes = workerLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60

        return {
          name: worker.name,
          quantity,
          goodQuantity: quantity - loss,
          loss,
          lossRate: quantity > 0 ? `${((loss / quantity) * 100).toFixed(1)}%` : '0%',
          workTime: `${hours}時間${mins}分`,
        }
      })

      return {
        period: from === to ? from : `${from} 〜 ${to}`,
        workers: workerSummary,
      }
    } catch (error) {
      logger.error('[getWorkerStats] エラー:', error)
      return { error: '作業者実績の取得中にエラーが発生しました' }
    }
  },
})

/**
 * 受注一覧・ステータス確認ツール
 */
export const getOrders = tool({
  description: '受注一覧を取得します。ステータスや顧客名で絞り込みができます。',
  parameters: z.object({
    status: z.enum(['pending', 'confirmed', 'in_production', 'completed', 'shipped', 'cancelled']).optional()
      .describe('受注ステータス（pending: 保留, confirmed: 確定, in_production: 生産中, completed: 完了, shipped: 出荷済, cancelled: キャンセル）'),
    customerName: z.string().optional().describe('顧客名（部分一致で検索）'),
    limit: z.number().optional().describe('取得件数（デフォルト10件）'),
  }),
  execute: async ({ status, customerName, limit = 10 }) => {
    const supabase = createServerClient()

    try {
      let query = supabase
        .from('orders')
        .select(`
          order_id,
          order_number,
          customer_name,
          order_date,
          delivery_deadline,
          status,
          total_amount,
          note
        `)
        .order('order_date', { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq('status', status)
      }

      if (customerName) {
        query = query.ilike('customer_name', `%${customerName}%`)
      }

      const { data, error } = await query

      if (error) {
        logger.error('[getOrders] クエリエラー:', error)
        return { error: '受注データ取得に失敗しました' }
      }

      const statusLabels: Record<string, string> = {
        pending: '保留',
        confirmed: '確定',
        in_production: '生産中',
        completed: '完了',
        shipped: '出荷済',
        cancelled: 'キャンセル',
      }

      const orders = data?.map(order => ({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        orderDate: order.order_date,
        deliveryDeadline: order.delivery_deadline,
        status: statusLabels[order.status] || order.status,
        totalAmount: order.total_amount ? `¥${order.total_amount.toLocaleString()}` : '未定',
        note: order.note,
      }))

      return {
        count: orders?.length || 0,
        orders,
      }
    } catch (error) {
      logger.error('[getOrders] エラー:', error)
      return { error: '受注一覧の取得中にエラーが発生しました' }
    }
  },
})

/**
 * 在庫状況確認ツール
 */
export const getInventoryStatus = tool({
  description: '各工程の在庫状況を確認します。部品ごとの工程在庫が表示されます。',
  parameters: z.object({
    partName: z.string().optional().describe('部品名（部分一致で検索）'),
  }),
  execute: async ({ partName }) => {
    const supabase = createServerClient()

    try {
      // 部品と工程を取得
      let partsQuery = supabase
        .from('parts')
        .select(`
          part_id,
          name,
          operations(operation_id, name, order_index)
        `)
        .eq('active', true)
        .order('order_index')

      if (partName) {
        partsQuery = partsQuery.ilike('name', `%${partName}%`)
      }

      const { data: parts, error: partsError } = await partsQuery

      if (partsError) {
        logger.error('[getInventoryStatus] 部品取得エラー:', partsError)
        return { error: '部品データ取得に失敗しました' }
      }

      const inventory: Array<{
        partName: string
        operations: Array<{ name: string; stock: number }>
      }> = []

      for (const part of parts || []) {
        const operations = (part as any).operations || []
        const sortedOps = operations.sort((a: any, b: any) => a.order_index - b.order_index)

        const opInventory: Array<{ name: string; stock: number }> = []

        for (const op of sortedOps) {
          // 工程ごとの在庫を計算
          // 生産数 - 消費数 + 調整数
          const { data: produced } = await supabase
            .from('work_logs')
            .select('quantity, loss_quantity')
            .eq('operation_id', op.operation_id)
            .eq('is_deleted', false)

          const { data: consumed } = await supabase
            .from('process_consumption')
            .select('consumed_quantity')
            .eq('consumed_operation_id', op.operation_id)

          const { data: adjustments } = await supabase
            .from('inventory_adjustments')
            .select('adjustment_quantity')
            .eq('operation_id', op.operation_id)

          const producedQty = produced?.reduce((sum, log) =>
            sum + (log.quantity || 0) - (log.loss_quantity || 0), 0) || 0
          const consumedQty = consumed?.reduce((sum, c) =>
            sum + (c.consumed_quantity || 0), 0) || 0
          const adjustmentQty = adjustments?.reduce((sum, a) =>
            sum + (a.adjustment_quantity || 0), 0) || 0

          const stock = producedQty - consumedQty + adjustmentQty

          opInventory.push({
            name: op.name,
            stock,
          })
        }

        inventory.push({
          partName: part.name,
          operations: opInventory,
        })
      }

      return {
        inventory,
      }
    } catch (error) {
      logger.error('[getInventoryStatus] エラー:', error)
      return { error: '在庫状況の取得中にエラーが発生しました' }
    }
  },
})

/**
 * 読み取り系ツールをまとめてエクスポート
 */
export const readTools = {
  getProductionStats,
  getWorkerStats,
  getOrders,
  getInventoryStatus,
}

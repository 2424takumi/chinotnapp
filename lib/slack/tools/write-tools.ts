import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * 作業セッションを開始するツール
 */
export const startWorkSession = tool({
  description: '作業セッションを開始します。部品名と工程名を指定して作業を開始できます。',
  parameters: z.object({
    workerSlackId: z.string().describe('SlackユーザーID'),
    partName: z.string().describe('部品名（例: 胴、棹、皮）'),
    operationName: z.string().describe('工程名（例: 塗装、仕上げ、検品）'),
  }),
  execute: async ({ workerSlackId, partName, operationName }) => {
    const supabase = createServerClient()

    try {
      // 作業者を取得
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('worker_id, name')
        .eq('slack_user_id', workerSlackId)
        .eq('active', true)
        .single()

      if (workerError || !worker) {
        return {
          success: false,
          error: 'あなたのSlackアカウントは作業者として登録されていません。管理者に連絡してください。',
        }
      }

      // 既存のアクティブセッションをチェック
      const { data: existingSession } = await supabase
        .from('work_sessions')
        .select('session_id, parts:part_id(name), operations:operation_id(name)')
        .eq('worker_id', worker.worker_id)
        .eq('status', 'active')
        .single()

      if (existingSession) {
        const partNameExisting = (existingSession as any).parts?.name || '不明'
        const opNameExisting = (existingSession as any).operations?.name || '不明'
        return {
          success: false,
          error: `既にアクティブな作業があります（${partNameExisting} - ${opNameExisting}）。先に作業を終了してください。`,
        }
      }

      // 部品を検索
      const { data: part } = await supabase
        .from('parts')
        .select('part_id, name')
        .eq('active', true)
        .ilike('name', `%${partName}%`)
        .single()

      if (!part) {
        return {
          success: false,
          error: `部品「${partName}」が見つかりません。正確な部品名を指定してください。`,
        }
      }

      // 工程を検索
      const { data: operation } = await supabase
        .from('operations')
        .select('operation_id, name')
        .eq('part_id', part.part_id)
        .eq('active', true)
        .ilike('name', `%${operationName}%`)
        .single()

      if (!operation) {
        return {
          success: false,
          error: `部品「${part.name}」の工程「${operationName}」が見つかりません。`,
        }
      }

      // セッションを作成
      const { data: session, error: sessionError } = await supabase
        .from('work_sessions')
        .insert({
          worker_id: worker.worker_id,
          part_id: part.part_id,
          operation_id: operation.operation_id,
          status: 'active',
        })
        .select()
        .single()

      if (sessionError) {
        logger.error('[startWorkSession] セッション作成エラー:', sessionError)
        return {
          success: false,
          error: '作業開始に失敗しました。',
        }
      }

      const startTime = new Date(session.start_time).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })

      return {
        success: true,
        message: '作業を開始しました',
        workerName: worker.name,
        partName: part.name,
        operationName: operation.name,
        startTime,
        sessionId: session.session_id,
      }
    } catch (error) {
      logger.error('[startWorkSession] エラー:', error)
      return {
        success: false,
        error: '作業開始中にエラーが発生しました。',
      }
    }
  },
})

/**
 * 作業セッションを停止するツール
 */
export const stopWorkSession = tool({
  description: '現在の作業セッションを停止して完了数を記録します。',
  parameters: z.object({
    workerSlackId: z.string().describe('SlackユーザーID'),
    quantity: z.number().describe('完成数量'),
    lossQuantity: z.number().optional().describe('不良数（省略時は0）'),
    note: z.string().optional().describe('メモ'),
  }),
  execute: async ({ workerSlackId, quantity, lossQuantity = 0, note }) => {
    const supabase = createServerClient()

    try {
      // 作業者を取得
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('worker_id, name')
        .eq('slack_user_id', workerSlackId)
        .eq('active', true)
        .single()

      if (workerError || !worker) {
        return {
          success: false,
          error: 'あなたのSlackアカウントは作業者として登録されていません。',
        }
      }

      // アクティブセッションを取得
      const { data: session, error: sessionError } = await supabase
        .from('work_sessions')
        .select('*, parts:part_id(name), operations:operation_id(name)')
        .eq('worker_id', worker.worker_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !session) {
        return {
          success: false,
          error: 'アクティブな作業がありません。',
        }
      }

      // 作業時間を計算
      const startTime = new Date(session.start_time)
      const endTime = new Date()
      const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000))

      // 作業ログを作成
      const { error: logError } = await supabase
        .from('work_logs')
        .insert({
          worker_id: worker.worker_id,
          part_id: session.part_id,
          operation_id: session.operation_id,
          duration_minutes: durationMinutes,
          quantity,
          loss_quantity: lossQuantity,
          note: note || null,
          work_date: session.work_date,
          session_id: session.session_id,
        })

      if (logError) {
        logger.error('[stopWorkSession] ログ作成エラー:', logError)
        return {
          success: false,
          error: '作業ログの作成に失敗しました。',
        }
      }

      // セッションを完了状態に更新
      const { error: updateError } = await supabase
        .from('work_sessions')
        .update({
          status: 'completed',
          end_time: endTime.toISOString(),
        })
        .eq('session_id', session.session_id)

      if (updateError) {
        logger.error('[stopWorkSession] セッション更新エラー:', updateError)
        return {
          success: false,
          error: 'セッションの終了処理に失敗しました。',
        }
      }

      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      const timeStr = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`

      return {
        success: true,
        message: '作業を終了しました',
        workerName: worker.name,
        partName: (session as any).parts?.name || '不明',
        operationName: (session as any).operations?.name || '不明',
        duration: timeStr,
        quantity,
        goodQuantity: quantity - lossQuantity,
        lossQuantity,
      }
    } catch (error) {
      logger.error('[stopWorkSession] エラー:', error)
      return {
        success: false,
        error: '作業終了中にエラーが発生しました。',
      }
    }
  },
})

/**
 * 受注ステータスを更新するツール
 */
export const updateOrderStatus = tool({
  description: '受注のステータスを更新します。受注番号を指定して状態を変更できます。',
  parameters: z.object({
    orderNumber: z.string().describe('受注番号'),
    newStatus: z.enum(['pending', 'confirmed', 'in_production', 'completed', 'shipped', 'cancelled'])
      .describe('新しいステータス（pending: 保留, confirmed: 確定, in_production: 生産中, completed: 完了, shipped: 出荷済, cancelled: キャンセル）'),
    note: z.string().optional().describe('更新メモ（任意）'),
  }),
  execute: async ({ orderNumber, newStatus, note }) => {
    const supabase = createServerClient()

    const statusLabels: Record<string, string> = {
      pending: '保留',
      confirmed: '確定',
      in_production: '生産中',
      completed: '完了',
      shipped: '出荷済',
      cancelled: 'キャンセル',
    }

    try {
      // 受注を検索
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_id, order_number, customer_name, status')
        .eq('order_number', orderNumber)
        .single()

      if (orderError || !order) {
        return {
          success: false,
          error: `受注番号「${orderNumber}」が見つかりません。`,
        }
      }

      const oldStatus = order.status

      // ステータスを更新
      const updateData: { status: string; note?: string } = {
        status: newStatus,
      }

      if (note) {
        const existingNote = order.note || ''
        const timestamp = new Date().toLocaleString('ja-JP')
        updateData.note = existingNote
          ? `${existingNote}\n[${timestamp}] ${note}`
          : `[${timestamp}] ${note}`
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('order_id', order.order_id)

      if (updateError) {
        logger.error('[updateOrderStatus] 更新エラー:', updateError)
        return {
          success: false,
          error: 'ステータス更新に失敗しました。',
        }
      }

      return {
        success: true,
        message: 'ステータスを更新しました',
        orderNumber: order.order_number,
        customerName: order.customer_name,
        oldStatus: statusLabels[oldStatus] || oldStatus,
        newStatus: statusLabels[newStatus],
      }
    } catch (error) {
      logger.error('[updateOrderStatus] エラー:', error)
      return {
        success: false,
        error: 'ステータス更新中にエラーが発生しました。',
      }
    }
  },
})

/**
 * 書き込み系ツールをまとめてエクスポート
 */
export const writeTools = {
  startWorkSession,
  stopWorkSession,
  updateOrderStatus,
}

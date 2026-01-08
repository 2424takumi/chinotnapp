import { createClient } from '@/lib/supabase/client'
import type { WorkSession, WorkSessionInsert, WorkSessionUpdate, WorkLog, WorkLogInsert } from '@/lib/types/database'

export interface SessionStartParams {
  workerId: string
  partId: string
  operationId: string
  attributeValueIds?: string[] // 選択された属性値のID配列
}

export interface SessionStopParams {
  sessionId: string
  quantity: number
  lossQuantity?: number
  note?: string
}

export interface ActiveSessionData {
  session: WorkSession
  partName: string
  operationName: string
  elapsedSeconds: number
  attributeValues: Array<{
    attributeName: string
    valueName: string
  }>
}

/**
 * 作業セッションを開始
 */
export async function startWorkSession(params: SessionStartParams) {
  const supabase = createClient()

  try {
    // 1. 既にアクティブなセッションがないか確認
    const { data: existingSession } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('worker_id', params.workerId)
      .eq('status', 'active')
      .single()

    if (existingSession) {
      throw new Error('既にアクティブなセッションがあります。先に終了してください。')
    }

    // 2. 新しいセッションを作成
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .insert({
        worker_id: params.workerId,
        part_id: params.partId,
        operation_id: params.operationId,
        status: 'active',
      })
      .select()
      .single()

    if (sessionError) throw sessionError
    if (!session) throw new Error('セッションの作成に失敗しました')

    // 3. 属性値がある場合は work_session_attributes に保存
    if (params.attributeValueIds && params.attributeValueIds.length > 0) {
      const attributeInserts = params.attributeValueIds.map(valueId => ({
        session_id: session.session_id,
        value_id: valueId,
      }))

      const { error: attributeError } = await supabase
        .from('work_session_attributes')
        .insert(attributeInserts)

      if (attributeError) {
        // セッションを削除してロールバック
        await supabase
          .from('work_sessions')
          .delete()
          .eq('session_id', session.session_id)
        throw attributeError
      }
    }

    return { data: session, error: null }
  } catch (error: any) {
    console.error('セッション開始エラー:', error)
    return { data: null, error }
  }
}

/**
 * 作業セッションを停止して作業ログを作成
 */
export async function stopWorkSession(params: SessionStopParams) {
  const supabase = createClient()

  try {
    // 1. セッション情報を取得
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .select('*, work_session_attributes(*)')
      .eq('session_id', params.sessionId)
      .eq('status', 'active')
      .single()

    if (sessionError) throw sessionError
    if (!session) throw new Error('アクティブなセッションが見つかりません')

    // 2. 作業時間を計算（分単位、最低1分）
    const startTime = new Date(session.start_time)
    const endTime = new Date()
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000))

    // 3. 作業ログを作成
    const workLogInsert: WorkLogInsert = {
      worker_id: session.worker_id,
      part_id: session.part_id,
      operation_id: session.operation_id,
      duration_minutes: durationMinutes,
      quantity: params.quantity,
      loss_quantity: params.lossQuantity || 0,
      note: params.note || null,
      work_date: session.work_date,
      session_id: session.session_id,
    }

    const { data: workLog, error: workLogError } = await supabase
      .from('work_logs')
      .insert(workLogInsert)
      .select()
      .single()

    if (workLogError) throw workLogError
    if (!workLog) throw new Error('作業ログの作成に失敗しました')

    // 4. work_log_attributes にセッション属性をコピー
    if (session.work_session_attributes && session.work_session_attributes.length > 0) {
      const logAttributeInserts = session.work_session_attributes.map((attr: any) => ({
        work_log_id: workLog.log_id,
        value_id: attr.value_id,
      }))

      const { error: logAttrError } = await supabase
        .from('work_log_attributes')
        .insert(logAttributeInserts)

      if (logAttrError) {
        console.error('作業ログ属性の保存エラー:', logAttrError)
        // 続行する（エラーでもログは作成されている）
      }
    }

    // 5. セッションを完了状態に更新
    const { error: updateError } = await supabase
      .from('work_sessions')
      .update({
        status: 'completed',
        end_time: endTime.toISOString(),
        work_log_id: workLog.log_id,
      })
      .eq('session_id', session.session_id)

    if (updateError) throw updateError

    // 6. 前工程在庫の自動消費処理
    try {
      // 工程設定を取得
      const { data: operation } = await supabase
        .from('operations')
        .select('consumes_previous_operation, consumption_quantity_per_unit, inherit_attributes, part_id, order_index')
        .eq('operation_id', session.operation_id)
        .single()

      if (operation?.consumes_previous_operation) {
        // 前工程を取得（同じ部品で、order_indexが小さい工程）
        const { data: previousOp } = await supabase
          .from('operations')
          .select('operation_id')
          .eq('part_id', operation.part_id)
          .lt('order_index', operation.order_index)
          .order('order_index', { ascending: false })
          .limit(1)
          .single()

        if (previousOp) {
          const consumedQty = params.quantity * operation.consumption_quantity_per_unit

          // 属性値の組み合わせをJSONとして保存
          let attributeValuesJson = null
          if (operation.inherit_attributes && session.work_session_attributes && session.work_session_attributes.length > 0) {
            const attrMap: Record<string, string> = {}
            for (const attr of session.work_session_attributes) {
              // attribute_id を取得するために variant_attribute_values を検索
              const { data: attrValue } = await supabase
                .from('variant_attribute_values')
                .select('attribute_id')
                .eq('value_id', attr.value_id)
                .single()

              if (attrValue) {
                attrMap[attrValue.attribute_id] = attr.value_id
              }
            }
            attributeValuesJson = attrMap
          }

          // process_consumption に記録
          const { error: consumptionError } = await supabase
            .from('process_consumption')
            .insert({
              work_log_id: workLog.log_id,
              consumed_operation_id: previousOp.operation_id,
              consumed_quantity: consumedQty,
              consumed_attribute_values: attributeValuesJson,
            })

          if (consumptionError) {
            console.error('前工程消費の記録エラー:', consumptionError)
            // エラーでも作業ログは作成されているので続行
          }
        }
      }
    } catch (consumptionError) {
      console.error('前工程消費処理エラー:', consumptionError)
      // エラーでも作業ログは作成されているので続行
    }

    return { data: workLog, error: null }
  } catch (error: any) {
    console.error('セッション停止エラー:', error)
    return { data: null, error }
  }
}

/**
 * アクティブなセッションを取得
 */
export async function getActiveSession(workerId: string): Promise<{ data: ActiveSessionData | null; error: any }> {
  const supabase = createClient()

  try {
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .select(`
        *,
        parts:part_id(name),
        operations:operation_id(name),
        work_session_attributes(
          value_id,
          variant_attribute_values(
            name,
            variant_attributes(name)
          )
        )
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        // セッションが見つからない（正常なケース）
        return { data: null, error: null }
      }
      throw sessionError
    }

    if (!session) {
      return { data: null, error: null }
    }

    // 経過時間を計算
    const startTime = new Date(session.start_time)
    const now = new Date()
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)

    // 属性値を整形
    const attributeValues = session.work_session_attributes?.map((attr: any) => ({
      attributeName: attr.variant_attribute_values?.variant_attributes?.name || '',
      valueName: attr.variant_attribute_values?.name || '',
    })) || []

    const activeSessionData: ActiveSessionData = {
      session,
      partName: (session.parts as any)?.name || '',
      operationName: (session.operations as any)?.name || '',
      elapsedSeconds,
      attributeValues,
    }

    return { data: activeSessionData, error: null }
  } catch (error: any) {
    console.error('アクティブセッション取得エラー:', error)
    return { data: null, error }
  }
}

/**
 * セッションを放棄（キャンセル）
 */
export async function abandonSession(sessionId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('work_sessions')
      .update({
        status: 'abandoned',
        end_time: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('status', 'active')

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('セッション放棄エラー:', error)
    return { error }
  }
}

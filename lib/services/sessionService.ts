import { createClient } from '@/lib/supabase/client';
import type {
  WorkSession,
  WorkSessionInsert,
  WorkSessionUpdate,
  WorkLog,
  WorkLogInsert,
} from '@/lib/types/database';
import { logger } from '@/lib/utils/logger';

export interface SessionStartParams {
  workerId: string;
  partId: string;
  operationId: string;
}

export interface SessionStopItem {
  attributeValueIds: string[]; // 種類（属性値の組み合わせ）
  quantity: number; // 完成数量
  lossQuantity: number; // 不良数
}

export interface SessionStopParams {
  sessionId: string;
  items: SessionStopItem[]; // 複数の種類×数量
  note?: string;
}

export interface ActiveSessionData {
  session: WorkSession;
  partName: string;
  operationName: string;
  elapsedSeconds: number;
}

/**
 * 作業セッションを開始
 */
export async function startWorkSession(params: SessionStartParams) {
  const supabase = createClient();

  try {
    // 1. 既にアクティブなセッションがないか確認
    const { data: existingSession } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('worker_id', params.workerId)
      .eq('status', 'active')
      .single();

    if (existingSession) {
      throw new Error('既にアクティブなセッションがあります。先に終了してください。');
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
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('セッションの作成に失敗しました');

    return { data: session, error: null };
  } catch (error: any) {
    logger.error('セッション開始エラー:', error);
    return { data: null, error };
  }
}

/**
 * 作業セッションを停止して複数の作業ログを作成
 */
export async function stopWorkSession(params: SessionStopParams) {
  const supabase = createClient();

  try {
    // 1. セッション情報を取得
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', params.sessionId)
      .eq('status', 'active')
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('アクティブなセッションが見つかりません');

    // 2. 全体の作業時間を計算（分単位、最低1分）
    const startTime = new Date(session.start_time);
    const endTime = new Date();
    const totalDurationMinutes = Math.max(
      1,
      Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    );

    // 3. 総数量を計算（時間按分のため）
    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalQuantity === 0) {
      throw new Error('完成数量が0です。少なくとも1種類は数量を入力してください。');
    }

    // 4. 工程設定を取得（前工程消費処理用）
    const { data: operation } = await supabase
      .from('operations')
      .select(
        'consumes_previous_operation, consumption_quantity_per_unit, inherit_attributes, part_id, order_index'
      )
      .eq('operation_id', session.operation_id)
      .single();

    let previousOp = null;
    if (operation?.consumes_previous_operation) {
      // 前工程を取得
      const { data: prevOp } = await supabase
        .from('operations')
        .select('operation_id')
        .eq('part_id', operation.part_id)
        .lt('order_index', operation.order_index)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();
      previousOp = prevOp;
    }

    // 5. 各種類ごとに作業ログを作成
    const createdLogs: WorkLog[] = [];

    // 時間按分を事前計算（合計がtotalDurationMinutesを超えないように調整）
    const itemDurations: number[] = [];
    let allocatedTime = 0;

    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
      if (i === params.items.length - 1) {
        // 最後のアイテムは残り時間を割り当て
        itemDurations.push(Math.max(1, totalDurationMinutes - allocatedTime));
      } else {
        const duration = Math.max(
          1,
          Math.round((item.quantity / totalQuantity) * totalDurationMinutes)
        );
        itemDurations.push(duration);
        allocatedTime += duration;
      }
    }

    // 属性値情報を一括で取得（N+1クエリ対策）
    const allValueIds = [...new Set(params.items.flatMap((item) => item.attributeValueIds))];
    let attrValueMap: Record<string, string> = {};

    if (allValueIds.length > 0) {
      const { data: attrValues } = await supabase
        .from('variant_attribute_values')
        .select('value_id, attribute_id')
        .in('value_id', allValueIds);

      if (attrValues) {
        attrValueMap = Object.fromEntries(attrValues.map((v) => [v.value_id, v.attribute_id]));
      }
    }

    for (let idx = 0; idx < params.items.length; idx++) {
      const item = params.items[idx];
      const itemDuration = itemDurations[idx];

      // 作業ログを作成
      const workLogInsert: WorkLogInsert = {
        worker_id: session.worker_id,
        part_id: session.part_id,
        operation_id: session.operation_id,
        duration_minutes: itemDuration,
        quantity: item.quantity,
        loss_quantity: item.lossQuantity,
        note: params.note || null,
        work_date: session.work_date,
        session_id: session.session_id,
      };

      const { data: workLog, error: workLogError } = await supabase
        .from('work_logs')
        .insert(workLogInsert)
        .select()
        .single();

      if (workLogError) throw workLogError;
      if (!workLog) throw new Error('作業ログの作成に失敗しました');

      createdLogs.push(workLog);

      // 属性値を保存
      if (item.attributeValueIds.length > 0) {
        const logAttributeInserts = item.attributeValueIds.map((valueId) => ({
          work_log_id: workLog.log_id,
          value_id: valueId,
        }));

        const { error: logAttrError } = await supabase
          .from('work_log_attributes')
          .insert(logAttributeInserts);

        if (logAttrError) {
          // エラーを吸収せずにthrowする（データ整合性のため）
          throw new Error(`作業ログ属性の保存に失敗しました: ${logAttrError.message}`);
        }
      }

      // 前工程在庫の自動消費処理
      if (operation?.consumes_previous_operation && previousOp) {
        const consumedQty = item.quantity * operation.consumption_quantity_per_unit;

        // 属性値の組み合わせをJSONとして保存（事前取得したマップを使用）
        let attributeValuesJson = null;
        if (operation.inherit_attributes && item.attributeValueIds.length > 0) {
          const attrMap: Record<string, string> = {};
          for (const valueId of item.attributeValueIds) {
            const attributeId = attrValueMap[valueId];
            if (attributeId) {
              attrMap[attributeId] = valueId;
            }
          }
          attributeValuesJson = Object.keys(attrMap).length > 0 ? attrMap : null;
        }

        // process_consumption に記録
        const { error: consumptionError } = await supabase.from('process_consumption').insert({
          work_log_id: workLog.log_id,
          consumed_operation_id: previousOp.operation_id,
          consumed_quantity: consumedQty,
          consumed_attribute_values: attributeValuesJson,
        });

        if (consumptionError) {
          // エラーを吸収せずにthrowする（在庫計算のデータ整合性のため）
          throw new Error(`前工程消費の記録に失敗しました: ${consumptionError.message}`);
        }
      }
    }

    // 6. セッションを完了状態に更新
    const { error: updateError } = await supabase
      .from('work_sessions')
      .update({
        status: 'completed',
        end_time: endTime.toISOString(),
      })
      .eq('session_id', session.session_id);

    if (updateError) throw updateError;

    return { data: createdLogs, error: null };
  } catch (error: any) {
    logger.error('セッション停止エラー:', error);
    return { data: null, error };
  }
}

/**
 * アクティブなセッションを取得
 */
export async function getActiveSession(
  workerId: string
): Promise<{ data: ActiveSessionData | null; error: any }> {
  const supabase = createClient();

  try {
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .select(
        `
        *,
        parts:part_id(name),
        operations:operation_id(name)
      `
      )
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        // セッションが見つからない（正常なケース）
        return { data: null, error: null };
      }
      throw sessionError;
    }

    if (!session) {
      return { data: null, error: null };
    }

    // 経過時間を計算
    const startTime = new Date(session.start_time);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const activeSessionData: ActiveSessionData = {
      session,
      partName: (session.parts as any)?.name || '',
      operationName: (session.operations as any)?.name || '',
      elapsedSeconds,
    };

    return { data: activeSessionData, error: null };
  } catch (error: any) {
    logger.error('アクティブセッション取得エラー:', error);
    return { data: null, error };
  }
}

/**
 * セッションを放棄（キャンセル）
 */
export async function abandonSession(sessionId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('work_sessions')
      .update({
        status: 'abandoned',
        end_time: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('status', 'active');

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    logger.error('セッション放棄エラー:', error);
    return { error };
  }
}

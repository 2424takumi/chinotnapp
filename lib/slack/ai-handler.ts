import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { allTools } from './tools'
import { sendSlackMessage } from './client'
import { logger } from '../utils/logger'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `あなたは小じゃみチントン生産管理システムのアシスタントです。
Slackを通じて、作業者の生産実績確認、作業セッションの開始・終了、受注管理のサポートを行います。

## あなたができること
- 生産実績の確認（今日の実績、期間指定、部品別、作業者別）
- 作業セッションの開始と終了
- 受注一覧の確認とステータス更新
- 在庫状況の確認

## 応答のガイドライン
- 簡潔で分かりやすい日本語で応答してください
- 数値はなるべく見やすくフォーマットしてください
- エラーが発生した場合は、原因と対処法を説明してください
- 絵文字を適度に使って親しみやすく応答してください

## 注意事項
- 作業開始・終了はSlackユーザーIDを使って本人確認を行います
- 不明な場合は確認してから操作を実行してください`

interface HandleSlackMessageParams {
  channel: string
  userSlackId: string
  text: string
  threadTs?: string
}

/**
 * Slackメッセージを処理してAI応答を生成
 */
export async function handleSlackMessage({
  channel,
  userSlackId,
  text,
  threadTs,
}: HandleSlackMessageParams): Promise<void> {
  try {
    logger.debug('[handleSlackMessage] メッセージ受信:', { channel, userSlackId, text })

    // 「考え中...」メッセージを送信
    const thinkingMessage = await sendSlackMessage(
      channel,
      '考え中... 🤔',
      threadTs
    )

    // AI SDKでテキスト生成
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `プラットフォーム: slack\nユーザーID: ${userSlackId}\nメッセージ: ${text}`,
        },
      ],
      tools: allTools,
      maxSteps: 5, // ツール呼び出しの最大回数
    })

    logger.debug('[handleSlackMessage] AI応答生成完了')

    // 応答を送信
    const responseText = result.text || 'すみません、応答を生成できませんでした。'

    // 「考え中...」メッセージを更新
    const { updateSlackMessage } = await import('./client')
    await updateSlackMessage(channel, thinkingMessage.ts!, responseText)
  } catch (error) {
    logger.error('[handleSlackMessage] エラー:', error)

    // エラーメッセージを送信
    await sendSlackMessage(
      channel,
      'エラーが発生しました。しばらく待ってからもう一度お試しください。',
      threadTs
    )
  }
}

/**
 * Slackイベントタイプに応じた処理
 */
export function extractMessageInfo(event: any): {
  channel: string
  userSlackId: string
  text: string
  threadTs?: string
} | null {
  // app_mentionイベント
  if (event.type === 'app_mention') {
    // メンションを除去
    const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()
    return {
      channel: event.channel,
      userSlackId: event.user,
      text,
      threadTs: event.thread_ts || event.ts,
    }
  }

  // DMイベント
  if (event.type === 'message' && event.channel_type === 'im') {
    // ボット自身のメッセージは無視
    if (event.bot_id) return null

    return {
      channel: event.channel,
      userSlackId: event.user,
      text: event.text,
      threadTs: event.thread_ts,
    }
  }

  return null
}

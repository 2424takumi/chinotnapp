import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { allTools } from '../slack/tools'
import { editOriginalResponse } from './client'
import { logger } from '../utils/logger'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `あなたは小じゃみチントン生産管理システムのアシスタントです。
Discordを通じて、作業者の生産実績確認、作業セッションの開始・終了、受注管理のサポートを行います。

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
- Discord の文字数制限（2000文字）に注意してください

## 注意事項
- 作業開始・終了はDiscordユーザーIDを使って本人確認を行います
- 不明な場合は確認してから操作を実行してください`

interface HandleDiscordMessageParams {
  applicationId: string
  interactionToken: string
  userId: string
  text: string
}

/**
 * Discordメッセージを処理してAI応答を生成
 */
export async function handleDiscordMessage({
  applicationId,
  interactionToken,
  userId,
  text,
}: HandleDiscordMessageParams): Promise<void> {
  try {
    logger.debug('[handleDiscordMessage] メッセージ受信:', { userId, text })

    // AI SDKでテキスト生成
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `プラットフォーム: discord\nユーザーID: ${userId}\nメッセージ: ${text}`,
        },
      ],
      tools: allTools,
      maxSteps: 5,
    })

    logger.debug('[handleDiscordMessage] AI応答生成完了')

    // 応答テキスト
    let responseText = result.text || 'すみません、応答を生成できませんでした。'

    // Discord の文字数制限対応（2000文字）
    if (responseText.length > 2000) {
      responseText = responseText.substring(0, 1997) + '...'
    }

    // 初期応答を編集
    await editOriginalResponse(applicationId, interactionToken, responseText)
  } catch (error) {
    logger.error('[handleDiscordMessage] エラー:', error)

    // エラーメッセージを送信
    await editOriginalResponse(
      applicationId,
      interactionToken,
      'エラーが発生しました。しばらく待ってからもう一度お試しください。'
    )
  }
}

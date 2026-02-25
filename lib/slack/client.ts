import { WebClient } from '@slack/web-api'
import { logger } from '../utils/logger'

let slackClient: WebClient | null = null

/**
 * Slack Web APIクライアントを取得
 */
export function getSlackClient(): WebClient {
  if (slackClient) {
    return slackClient
  }

  const token = process.env.SLACK_BOT_TOKEN

  if (!token) {
    logger.error('[getSlackClient] SLACK_BOT_TOKEN が設定されていません')
    throw new Error('SLACK_BOT_TOKEN 環境変数が設定されていません')
  }

  slackClient = new WebClient(token)
  logger.debug('[getSlackClient] Slackクライアント作成完了')

  return slackClient
}

/**
 * Slackにメッセージを送信
 */
export async function sendSlackMessage(channel: string, text: string, threadTs?: string) {
  const client = getSlackClient()

  try {
    const result = await client.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    })

    logger.debug('[sendSlackMessage] メッセージ送信成功:', result.ts)
    return result
  } catch (error) {
    logger.error('[sendSlackMessage] メッセージ送信エラー:', error)
    throw error
  }
}

/**
 * Slackメッセージを更新
 */
export async function updateSlackMessage(channel: string, ts: string, text: string) {
  const client = getSlackClient()

  try {
    const result = await client.chat.update({
      channel,
      ts,
      text,
    })

    logger.debug('[updateSlackMessage] メッセージ更新成功:', result.ts)
    return result
  } catch (error) {
    logger.error('[updateSlackMessage] メッセージ更新エラー:', error)
    throw error
  }
}

import { logger } from '../utils/logger'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

/**
 * Discord APIにリクエストを送信
 */
async function discordFetch(endpoint: string, options: RequestInit = {}) {
  const token = process.env.DISCORD_BOT_TOKEN

  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN 環境変数が設定されていません')
  }

  const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('[discordFetch] APIエラー:', response.status, error)
    throw new Error(`Discord API error: ${response.status}`)
  }

  return response.json()
}

/**
 * チャンネルにメッセージを送信
 */
export async function sendDiscordMessage(channelId: string, content: string) {
  try {
    const result = await discordFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })

    logger.debug('[sendDiscordMessage] メッセージ送信成功:', result.id)
    return result
  } catch (error) {
    logger.error('[sendDiscordMessage] メッセージ送信エラー:', error)
    throw error
  }
}

/**
 * Interactionに対してフォローアップメッセージを送信
 */
export async function sendFollowupMessage(
  applicationId: string,
  interactionToken: string,
  content: string
) {
  try {
    const result = await discordFetch(
      `/webhooks/${applicationId}/${interactionToken}`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    )

    logger.debug('[sendFollowupMessage] フォローアップ送信成功')
    return result
  } catch (error) {
    logger.error('[sendFollowupMessage] フォローアップ送信エラー:', error)
    throw error
  }
}

/**
 * Interactionの初期応答を編集
 */
export async function editOriginalResponse(
  applicationId: string,
  interactionToken: string,
  content: string
) {
  try {
    const result = await discordFetch(
      `/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }
    )

    logger.debug('[editOriginalResponse] 応答編集成功')
    return result
  } catch (error) {
    logger.error('[editOriginalResponse] 応答編集エラー:', error)
    throw error
  }
}

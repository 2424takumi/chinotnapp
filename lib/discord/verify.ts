import { verifyKey } from 'discord-interactions'
import { logger } from '../utils/logger'

/**
 * Discordリクエストの署名を検証
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */
export function verifyDiscordRequest(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  try {
    const isValid = verifyKey(body, signature, timestamp, publicKey)

    if (!isValid) {
      logger.warn('[verifyDiscordRequest] 署名検証失敗')
    }

    return isValid
  } catch (error) {
    logger.error('[verifyDiscordRequest] 署名検証エラー:', error)
    return false
  }
}

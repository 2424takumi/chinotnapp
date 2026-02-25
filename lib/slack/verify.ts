import crypto from 'crypto'
import { logger } from '../utils/logger'

/**
 * Slackリクエストの署名を検証
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  // タイムスタンプが5分以上古い場合はリプレイ攻撃の可能性
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    logger.warn('[verifySlackRequest] タイムスタンプが古すぎます')
    return false
  }

  // 署名ベースストリングを作成
  const sigBasestring = `v0:${timestamp}:${body}`

  // HMAC-SHA256で署名を生成
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex')

  // タイミング攻撃を防ぐため、timingSafeEqualを使用
  try {
    const sigBuffer = Buffer.from(signature)
    const myBuffer = Buffer.from(mySignature)

    if (sigBuffer.length !== myBuffer.length) {
      logger.warn('[verifySlackRequest] 署名の長さが一致しません')
      return false
    }

    const isValid = crypto.timingSafeEqual(sigBuffer, myBuffer)
    if (!isValid) {
      logger.warn('[verifySlackRequest] 署名が一致しません')
    }
    return isValid
  } catch (error) {
    logger.error('[verifySlackRequest] 署名検証エラー:', error)
    return false
  }
}

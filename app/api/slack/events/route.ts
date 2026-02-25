import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/verify'
import { handleSlackMessage, extractMessageInfo } from '@/lib/slack/ai-handler'
import { logger } from '@/lib/utils/logger'

/**
 * Slackイベントを処理するエンドポイント
 * @see https://api.slack.com/apis/events-api
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // URL検証（Slack App設定時に使用）
    if (body.type === 'url_verification') {
      logger.debug('[Slack Events] URL検証リクエストを受信')
      return NextResponse.json({ challenge: body.challenge })
    }

    // 署名検証
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!signingSecret) {
      logger.error('[Slack Events] SLACK_SIGNING_SECRETが設定されていません')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const timestamp = request.headers.get('x-slack-request-timestamp') || ''
    const signature = request.headers.get('x-slack-signature') || ''

    if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
      logger.warn('[Slack Events] 署名検証失敗')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // イベントコールバックを処理
    if (body.type === 'event_callback') {
      const event = body.event

      logger.debug('[Slack Events] イベント受信:', event.type)

      // 重複イベントをチェック（リトライ対策）
      const retryNum = request.headers.get('x-slack-retry-num')
      if (retryNum) {
        logger.debug('[Slack Events] リトライイベントをスキップ:', retryNum)
        return NextResponse.json({ ok: true })
      }

      // メッセージ情報を抽出
      const messageInfo = extractMessageInfo(event)

      if (messageInfo) {
        // 非同期で処理（Slackは3秒以内に応答が必要）
        // バックグラウンドで処理を実行
        handleSlackMessage(messageInfo).catch(error => {
          logger.error('[Slack Events] メッセージ処理エラー:', error)
        })
      }

      // すぐに応答を返す（Slackのタイムアウト対策）
      return NextResponse.json({ ok: true })
    }

    // 不明なイベントタイプ
    logger.warn('[Slack Events] 不明なイベントタイプ:', body.type)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[Slack Events] エンドポイントエラー:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET リクエストは許可しない
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

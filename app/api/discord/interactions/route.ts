import { NextRequest, NextResponse } from 'next/server'
import { InteractionType, InteractionResponseType } from 'discord-interactions'
import { verifyDiscordRequest } from '@/lib/discord/verify'
import { handleDiscordMessage } from '@/lib/discord/ai-handler'
import { logger } from '@/lib/utils/logger'

/**
 * Discord Interactionsエンドポイント
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // 署名検証
    const publicKey = process.env.DISCORD_PUBLIC_KEY
    if (!publicKey) {
      logger.error('[Discord] DISCORD_PUBLIC_KEYが設定されていません')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const signature = request.headers.get('x-signature-ed25519') || ''
    const timestamp = request.headers.get('x-signature-timestamp') || ''

    if (!verifyDiscordRequest(publicKey, signature, timestamp, rawBody)) {
      logger.warn('[Discord] 署名検証失敗')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // PING（Discord Bot設定時の検証用）
    if (body.type === InteractionType.PING) {
      logger.debug('[Discord] PING受信')
      return NextResponse.json({ type: InteractionResponseType.PONG })
    }

    // Application Command（スラッシュコマンド）
    if (body.type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = body.data
      const userId = body.member?.user?.id || body.user?.id
      const applicationId = process.env.DISCORD_APPLICATION_ID || body.application_id

      logger.debug('[Discord] コマンド受信:', name, options)

      // /ask コマンドを処理
      if (name === 'ask') {
        const question = options?.find((opt: any) => opt.name === 'question')?.value || ''

        // まず「考え中...」と応答（3秒以内に応答が必要）
        // 非同期で処理を実行
        handleDiscordMessage({
          applicationId,
          interactionToken: body.token,
          userId,
          text: question,
        }).catch(error => {
          logger.error('[Discord] メッセージ処理エラー:', error)
        })

        // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 後で編集する応答
        return NextResponse.json({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        })
      }

      // 不明なコマンド
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'このコマンドは対応していません。',
        },
      })
    }

    // 不明なInteractionタイプ
    logger.warn('[Discord] 不明なInteractionタイプ:', body.type)
    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
  } catch (error) {
    logger.error('[Discord] エンドポイントエラー:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GETリクエストは許可しない
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

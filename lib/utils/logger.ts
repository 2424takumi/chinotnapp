/**
 * 環境に応じたロギングユーティリティ
 *
 * ## 機能
 * - 本番環境ではデバッグログを抑制
 * - エラーログは簡略化（スタックトレースなし）
 * - 機密情報を自動的にマスク
 *
 * ## セキュリティ対策
 * - CWE-209: Generation of Error Message Containing Sensitive Information
 * - パスワード、トークン、メールアドレスなどを自動マスク
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * 機密情報をマスクする
 *
 * @param data - マスクする対象のデータ
 * @returns マスクされたデータ
 */
function sanitize(data: any): any {
  // プリミティブ型の処理
  if (data === null || data === undefined) {
    return data
  }

  // 文字列の処理
  if (typeof data === 'string') {
    // メールアドレスの一部をマスク (例: user@example.com → us***@example.com)
    let sanitized = data.replace(
      /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g,
      (match, local, domain) => {
        if (local.length <= 2) {
          return `**@${domain}`
        }
        return `${local.substring(0, 2)}***@${domain}`
      }
    )

    // 電話番号をマスク (例: 090-1234-5678 → 090-****-5678)
    sanitized = sanitized.replace(
      /(\d{2,4})-?(\d{4})-?(\d{4})/g,
      (match, p1, p2, p3) => `${p1}-****-${p3}`
    )

    // クレジットカード番号をマスク (例: 1234-5678-9012-3456 → ****-****-****-3456)
    sanitized = sanitized.replace(
      /(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})/g,
      (match, p1, p2, p3, p4) => `****-****-****-${p4}`
    )

    return sanitized
  }

  // 配列の処理
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item))
  }

  // オブジェクトの処理
  if (typeof data === 'object') {
    const sanitized: any = {}

    for (const key in data) {
      const lowerKey = key.toLowerCase()

      // パスワード関連のキーは完全にマスク
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('passwd') ||
        lowerKey.includes('pwd')
      ) {
        sanitized[key] = '***REDACTED***'
        continue
      }

      // トークン・シークレット関連のキーは完全にマスク
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('private')
      ) {
        sanitized[key] = '***REDACTED***'
        continue
      }

      // その他のフィールドは再帰的にサニタイズ
      sanitized[key] = sanitize(data[key])
    }

    return sanitized
  }

  // その他の型（number, boolean など）はそのまま返す
  return data
}

/**
 * エラーオブジェクトを簡略化する
 *
 * @param error - エラーオブジェクト
 * @returns 簡略化されたエラー情報
 */
function simplifyError(error: any): any {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: (error as any).code,
      // 本番環境ではスタックトレースを含めない
      ...(isDevelopment && { stack: error.stack })
    }
  }

  // Error インスタンスでない場合はサニタイズして返す
  return sanitize(error)
}

export const logger = {
  /**
   * デバッグログ（開発環境のみ出力）
   *
   * @param message - ログメッセージ
   * @param data - ログに含めるデータ（オプション）
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      if (data !== undefined) {
        console.log(`[DEBUG] ${message}`, data)
      } else {
        console.log(`[DEBUG] ${message}`)
      }
    }
  },

  /**
   * 情報ログ
   *
   * @param message - ログメッセージ
   * @param data - ログに含めるデータ（オプション）
   */
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      // 開発環境では詳細を出力
      if (data !== undefined) {
        console.info(`[INFO] ${message}`, data)
      } else {
        console.info(`[INFO] ${message}`)
      }
    } else {
      // 本番環境では簡略化（データは含めない）
      console.info(`[INFO] ${message}`)
    }
  },

  /**
   * 警告ログ
   *
   * @param message - 警告メッセージ
   * @param data - ログに含めるデータ（オプション）
   */
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      // 開発環境では詳細を出力
      if (data !== undefined) {
        console.warn(`[WARN] ${message}`, data)
      } else {
        console.warn(`[WARN] ${message}`)
      }
    } else {
      // 本番環境では機密情報をマスク
      if (data !== undefined) {
        console.warn(`[WARN] ${message}`, sanitize(data))
      } else {
        console.warn(`[WARN] ${message}`)
      }
    }
  },

  /**
   * エラーログ
   *
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクトまたはデータ（オプション）
   */
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      // 開発環境では詳細を出力（スタックトレース含む）
      if (error !== undefined) {
        console.error(`[ERROR] ${message}`, error)
        if (error?.stack) {
          console.error('Stack trace:', error.stack)
        }
      } else {
        console.error(`[ERROR] ${message}`)
      }
    } else {
      // 本番環境ではエラーを簡略化
      if (error !== undefined) {
        const simplifiedError = simplifyError(error)
        console.error(`[ERROR] ${message}`, simplifiedError)
      } else {
        console.error(`[ERROR] ${message}`)
      }
    }
  }
}

export default logger

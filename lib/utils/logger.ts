/**
 * 環境に応じたロギングユーティリティ
 * 本番環境ではデバッグログを抑制
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * デバッグログ（開発環境のみ出力）
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * 情報ログ（開発環境のみ出力）
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * 警告ログ（常に出力）
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * エラーログ（常に出力）
   */
  error: (...args: any[]) => {
    console.error(...args)
  },
}

export default logger

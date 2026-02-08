import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * セキュリティヘッダーを設定するミドルウェア
 *
 * ## 対策する脆弱性
 * - クリックジャッキング (X-Frame-Options)
 * - MIMEスニッフィング (X-Content-Type-Options)
 * - XSS (Content-Security-Policy)
 * - MITM攻撃 (Strict-Transport-Security)
 * - リファラー情報の漏洩 (Referrer-Policy)
 * - 不要なブラウザ機能へのアクセス (Permissions-Policy)
 *
 * @see https://owasp.org/www-project-secure-headers/
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ========================================
  // 1. X-Frame-Options: クリックジャッキング対策
  // ========================================
  // ページを<iframe>内に表示することを禁止
  // DENY: すべてのフレーム埋め込みを禁止
  response.headers.set('X-Frame-Options', 'DENY');

  // ========================================
  // 2. X-Content-Type-Options: MIMEスニッフィング対策
  // ========================================
  // ブラウザがContent-Typeを推測するのを防ぐ
  // nosniff: Content-Typeヘッダーを厳密に守る
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // ========================================
  // 3. Referrer-Policy: リファラー情報の制御
  // ========================================
  // クロスオリジンリクエストでは送信元URLのオリジン（ドメイン）のみを送信
  // strict-origin-when-cross-origin: HTTPSからHTTPへのダウングレード時はリファラーを送信しない
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ========================================
  // 4. Permissions-Policy: ブラウザ機能の制限
  // ========================================
  // カメラ・マイク・位置情報などへのアクセスを禁止
  // このアプリケーションでは不要な機能を無効化
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // ========================================
  // 5. Strict-Transport-Security (HSTS)
  // ========================================
  // HTTPS接続を強制（本番環境のみ）
  // ローカル開発ではHTTPを使用可能にするため、本番環境でのみ有効化
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      // max-age: 1年間HSTSを有効化
      // includeSubDomains: サブドメインにも適用
      // preload: ブラウザのHSTS Preloadリストに登録可能
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // ========================================
  // 6. Content-Security-Policy (CSP)
  // ========================================
  // XSS攻撃を防ぐため、スクリプト・スタイル・画像などの読み込み元を制限
  const cspDirectives = [
    // デフォルトは同一オリジンのみ許可
    "default-src 'self'",

    // スクリプト: 同一オリジン + インラインスクリプト + eval（Next.jsが必要とする）
    // 注意: 'unsafe-inline'と'unsafe-eval'はXSSリスクがあるが、Next.jsの動作に必要
    // 将来的にはnonce-basedに移行することを推奨
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

    // スタイル: 同一オリジン + インラインスタイル（Tailwind CSSが必要とする）
    "style-src 'self' 'unsafe-inline'",

    // 画像: 同一オリジン + data: スキーム + HTTPS
    // data: はBase64エンコードされた画像に必要
    "img-src 'self' data: https:",

    // フォント: 同一オリジン + data: スキーム
    "font-src 'self' data:",

    // 接続先（fetch/XHR）: 同一オリジン + Supabase API
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",

    // frame-ancestors: X-Frame-Optionsと同等の機能
    // none: すべてのフレーム埋め込みを禁止
    "frame-ancestors 'none'",

    // base-uri: <base>タグのURIを制限
    // self: 同一オリジンのみ
    "base-uri 'self'",

    // form-action: フォーム送信先を制限
    // self: 同一オリジンのみ
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // ========================================
  // 開発環境でのデバッグ情報（本番環境では無効）
  // ========================================
  if (process.env.NODE_ENV === 'development') {
    // セキュリティヘッダーが正しく設定されていることをコンソールで確認可能
    response.headers.set('X-Debug-Security-Headers', 'enabled');
  }

  return response;
}

/**
 * ミドルウェアを適用するパスを指定
 *
 * 静的ファイルとNext.js内部ファイルを除外し、
 * アプリケーションルートにのみセキュリティヘッダーを適用
 */
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスに適用:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico, robots.txt, sitemap.xml
     * - api/auth/* (Supabase Authのコールバック)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth).*)',
  ],
};

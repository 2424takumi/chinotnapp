# 実装ガイド - 優先順位付き改善タスク

このドキュメントは、`COMPREHENSIVE_REVIEW_REPORT.md`で特定された問題に対する具体的な実装手順を提供します。

---

## 📋 実装チェックリスト

### 🔥 Phase 1: 緊急対応（今週中）

#### ✅ タスク1.1: Next.jsのアップデート（30分）

**目的**: DoS脆弱性（CVSS 7.5）の修正

**手順**:
```bash
# 1. 現在のバージョン確認
npm list next

# 2. Next.jsを最新の安全なバージョンにアップデート
npm install next@16.1.5

# 3. 依存関係の脆弱性チェック
npm audit

# 4. 開発サーバーで動作確認
npm run dev

# 5. ビルド確認
npm run build

# 6. コミット
git add package.json package-lock.json
git commit -m "fix: Update Next.js to 16.1.5 to address DoS vulnerabilities (GHSA-h25m-26qc-wcjf)"
```

**検証**:
- [ ] `npm audit`で脆弱性が減っていることを確認
- [ ] 開発サーバーが正常起動
- [ ] 既存機能が動作することを確認

---

#### ✅ タスク1.2: 管理者権限チェックの実装（4時間）

**目的**: 認可の欠如（CWE-306）の修正

**手順**:

##### ステップ1: データベースマイグレーション

```sql
-- supabase/migrations/add_admin_role.sql
-- 管理者フラグを追加
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 既存の特定ユーザーを管理者に設定（必要に応じて）
UPDATE workers SET is_admin = true WHERE email = 'admin@example.com';

-- コメント追加
COMMENT ON COLUMN workers.is_admin IS '管理者権限フラグ';
```

実行:
```bash
supabase db push
```

##### ステップ2: 権限チェック関数の修正

`app/api/admin/create-worker-account/route.ts`:

```typescript
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const supabase = createClient()

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      logger.warn('[getAuthenticatedUser] Authorization header missing')
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      logger.warn('[getAuthenticatedUser] Invalid token or user not found')
      return null
    }

    // ワーカー情報を取得（管理者フラグを含む）
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_authenticated', true)
      .single()

    if (workerError || !worker) {
      logger.warn('[getAuthenticatedUser] Worker not found or not authenticated')
      return null
    }

    // 🔥 管理者権限チェック（新規追加）
    if (!worker.is_admin) {
      logger.warn('[getAuthenticatedUser] User is not admin', { workerId: worker.worker_id })
      return null
    }

    logger.info('[getAuthenticatedUser] Admin user authenticated', {
      userId: user.id,
      workerId: worker.worker_id
    })

    return { user, worker }
  } catch (error) {
    logger.error('[getAuthenticatedUser] Unexpected error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request)

    if (!authResult) {
      return NextResponse.json(
        { error: '管理者権限が必要です。ログインしているか、管理者アカウントであることを確認してください。' },
        { status: 403 } // 401 → 403に変更（権限不足）
      )
    }

    // ... 既存の処理
  } catch (error) {
    logger.error('Worker account creation error:', error)
    return NextResponse.json(
      { error: 'アカウント作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
```

**検証**:
- [ ] 管理者ユーザーでアカウント作成が成功
- [ ] 一般ユーザーで403エラーが返る
- [ ] ログに適切なメッセージが出力される

---

#### ✅ タスク1.3: セキュリティヘッダーの追加（2時間）

**目的**: セキュリティ設定の不備の修正

**手順**:

##### ステップ1: middleware.tsを作成

`middleware.ts`（プロジェクトルートに作成）:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * セキュリティヘッダーを設定するミドルウェア
 *
 * 対策する脆弱性:
 * - クリックジャッキング (X-Frame-Options)
 * - MIMEスニッフィング (X-Content-Type-Options)
 * - XSS (Content-Security-Policy)
 * - MITM攻撃 (Strict-Transport-Security)
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // X-Frame-Options: クリックジャッキング対策
  // ページを<iframe>内に表示することを禁止
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options: MIMEスニッフィング対策
  // ブラウザがContent-Typeを推測するのを防ぐ
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer-Policy: リファラー情報の制御
  // クロスオリジンリクエストでは送信元URLを送信しない
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: ブラウザ機能の制限
  // カメラ・マイク・位置情報などへのアクセスを禁止
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Strict-Transport-Security (HSTS): HTTPS強制
  // 本番環境のみ有効化（ローカル開発ではHTTPを使用可能にする）
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Content-Security-Policy (CSP): XSS対策
  // スクリプト・スタイル・画像などの読み込み元を制限
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.jsは unsafe-inline/eval が必要
    "style-src 'self' 'unsafe-inline'", // Tailwindは unsafe-inline が必要
    "img-src 'self' data: https:", // data: と https: を許可
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co", // Supabase APIを許可
    "frame-ancestors 'none'", // X-Frame-Options と同等
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  return response
}

// ミドルウェアを適用するパスを指定
// 静的ファイルと Next.js内部ファイルを除外
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスに適用:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

##### ステップ2: 動作確認

```bash
# 開発サーバー起動
npm run dev

# ブラウザの開発者ツールでResponseヘッダーを確認
# Network タブ → 任意のリクエスト → Headers → Response Headers

# 確認すべきヘッダー:
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy: strict-origin-when-cross-origin
# - Content-Security-Policy: (設定した内容)
```

**検証**:
- [ ] 全ヘッダーが正しく設定されている
- [ ] アプリケーションが正常に動作する
- [ ] CSPエラーがコンソールに出ていない

---

#### ✅ タスク1.4: RLSポリシーの修正（4時間）

**目的**: 不適切なアクセス制御の修正

**手順**:

##### ステップ1: 現在のポリシーを削除

```sql
-- supabase/migrations/fix_rls_policies_v2.sql

-- 既存の緩いポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can delete product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can insert product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can update product prices" ON product_prices;

DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

DROP POLICY IF EXISTS "Authenticated users can view order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
```

##### ステップ2: 適切なポリシーを作成

```sql
-- ========================================
-- Product Prices: 管理者のみが変更可能
-- ========================================

-- 全ユーザーが閲覧可能（価格情報は公開情報）
CREATE POLICY "Anyone can view product prices"
  ON product_prices FOR SELECT
  USING (true);

-- 管理者のみが変更可能
CREATE POLICY "Only admins can modify product prices"
  ON product_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- ========================================
-- Orders: 作成者または管理者のみがアクセス可能
-- ========================================

-- 自分が作成した注文または管理者は閲覧可能
CREATE POLICY "Users can view own orders or admins can view all"
  ON orders FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- 認証済みユーザーは注文作成可能（created_byは自動設定）
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- 自分の注文または管理者のみが更新可能
CREATE POLICY "Users can update own orders or admins can update all"
  ON orders FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- 管理者のみが削除可能
CREATE POLICY "Only admins can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- ========================================
-- Order Items: 親の注文と同じアクセス制御
-- ========================================

-- 自分の注文の明細または管理者は閲覧可能
CREATE POLICY "Users can view own order items or admins can view all"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND (
        orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workers
          WHERE auth_user_id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

-- 自分の注文の明細は追加可能
CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND orders.created_by = auth.uid()
    )
  );

-- 自分の注文の明細または管理者は更新可能
CREATE POLICY "Users can update own order items or admins can update all"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND (
        orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workers
          WHERE auth_user_id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

-- 管理者のみが削除可能
CREATE POLICY "Only admins can delete order items"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- ========================================
-- コメント追加
-- ========================================

COMMENT ON POLICY "Only admins can modify product prices" ON product_prices IS
  '価格情報は管理者のみが変更可能。全ユーザーは閲覧可能。';

COMMENT ON POLICY "Users can view own orders or admins can view all" ON orders IS
  '注文は作成者または管理者のみが閲覧可能。';
```

##### ステップ3: 適用とテスト

```bash
# マイグレーション適用
supabase db push

# RLSポリシーのテスト
# 1. 一般ユーザーで価格情報を削除しようとする（失敗するはず）
# 2. 管理者ユーザーで価格情報を削除する（成功するはず）
# 3. 一般ユーザーで他人の注文を閲覧しようとする（失敗するはず）
```

**検証**:
- [ ] 一般ユーザーが価格情報を変更できない
- [ ] 管理者が全ての操作を実行できる
- [ ] ユーザーが自分の注文のみ閲覧・変更できる

---

#### ✅ タスク1.5: 本番ログの改善（2時間）

**目的**: 機密情報の露出防止

**手順**:

##### ステップ1: logger.tsの改善

`lib/utils/logger.ts`:

```typescript
/**
 * 環境に応じたロギングユーティリティ
 *
 * 本番環境:
 * - デバッグログを抑制
 * - エラーログは簡略化（スタックトレースなし）
 * - 機密情報をマスク
 *
 * 開発環境:
 * - 全てのログを出力
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * 機密情報をマスクする
 */
function sanitize(data: any): any {
  if (typeof data === 'string') {
    // メールアドレスの一部をマスク
    return data.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)/g, (match, local, domain) => {
      return `${local.substring(0, 2)}***@${domain}`
    })
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {}

    for (const key in data) {
      // パスワード関連のキーは完全にマスク
      if (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '***REDACTED***'
      } else {
        sanitized[key] = sanitize(data[key])
      }
    }

    return sanitized
  }

  return data
}

export const logger = {
  /**
   * デバッグログ（開発環境のみ）
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  },

  /**
   * 情報ログ
   */
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, data)
    } else {
      // 本番環境では簡略化
      console.info(`[INFO] ${message}`)
    }
  },

  /**
   * 警告ログ
   */
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data)
    } else {
      // 本番環境では機密情報をマスク
      console.warn(`[WARN] ${message}`, sanitize(data))
    }
  },

  /**
   * エラーログ
   */
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      // 開発環境では詳細を出力
      console.error(`[ERROR] ${message}`, error)
      if (error?.stack) {
        console.error('Stack trace:', error.stack)
      }
    } else {
      // 本番環境ではエラーメッセージとコードのみ
      const sanitizedError = error instanceof Error
        ? { message: error.message, code: (error as any).code }
        : sanitize(error)

      console.error(`[ERROR] ${message}`, sanitizedError)
    }
  }
}
```

##### ステップ2: 全ファイルでloggerを使用

既存の`console.log/error/warn`を`logger`に置換:

```typescript
// 悪い例（修正前）
console.log('[signInWithEmail] ログイン試行:', { email })
console.error('[signInWithEmail] ログインエラー:', error)

// 良い例（修正後）
import { logger } from '@/lib/utils/logger'

logger.debug('[signInWithEmail] ログイン試行', { email })
logger.error('[signInWithEmail] ログインエラー', error)
```

**一括置換スクリプト**:

```bash
# console.logをlogger.debugに置換
find app lib components -type f -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.log(/logger.debug(/g'

# console.errorをlogger.errorに置換
find app lib components -type f -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.error(/logger.error(/g'

# console.warnをlogger.warnに置換
find app lib components -type f -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.warn(/logger.warn(/g'

# importを追加（手動で各ファイルの先頭に追加）
# import { logger } from '@/lib/utils/logger'
```

**検証**:
- [ ] 開発環境で全てのログが出力される
- [ ] 本番環境でデバッグログが出力されない
- [ ] 本番環境でパスワードがマスクされる

---

## 🟠 Phase 2: パフォーマンス改善（2週間）

### ✅ タスク2.1: calculateInventoryの最適化（8時間）

**目的**: O(n³) → O(n)に計算複雑度を削減

**手順**は`COMPREHENSIVE_REVIEW_REPORT.md`の「6.2 パフォーマンス改善」を参照

---

## 🟡 Phase 3 & 4: 詳細は別ドキュメント

Phase 3（コード品質向上）とPhase 4（アーキテクチャ改善）の詳細な実装手順は、Phase 1-2完了後に作成することを推奨します。

---

## 📊 進捗管理

### チェックリスト

#### Phase 1: 緊急対応
- [ ] タスク1.1: Next.jsアップデート
- [ ] タスク1.2: 管理者権限チェック
- [ ] タスク1.3: セキュリティヘッダー
- [ ] タスク1.4: RLSポリシー修正
- [ ] タスク1.5: 本番ログ改善

#### Phase 2: パフォーマンス改善
- [ ] タスク2.1: calculateInventory最適化
- [ ] タスク2.2: イベントハンドラーメモ化
- [ ] タスク2.3: useEffect cleanup
- [ ] タスク2.4: React.memo適用
- [ ] タスク2.5: useReducer統合

---

## 🆘 トラブルシューティング

### Next.jsアップデート後にビルドエラー

**問題**: `npm run build`でエラーが発生

**対処**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

### RLSポリシー適用後にデータが取得できない

**問題**: 403エラーが発生

**対処**:
1. Supabase Dashboardでポリシーを確認
2. `auth.uid()`が正しく返っているか確認
3. `is_admin`カラムが存在するか確認

### CSPエラーでスタイルが適用されない

**問題**: `Content-Security-Policy`違反エラー

**対処**:
- `style-src 'unsafe-inline'`を確認
- Tailwind CSSには`'unsafe-inline'`が必要

---

## 📞 サポート

質問や問題が発生した場合:
1. `COMPREHENSIVE_REVIEW_REPORT.md`を確認
2. GitHub Issuesに質問を投稿
3. 開発チームに相談

---

**作成日**: 2026-02-07
**対象プロジェクト**: chinotnapp
**次回レビュー**: Phase 1完了後（1週間後）

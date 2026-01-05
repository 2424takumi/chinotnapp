# 小じゃみチントン生産管理システム（MVP）

小じゃみチントンの生産実績を記録・管理するWebアプリケーション。

## 主な機能

### 作業者向け（スマホ）
- **作業記録入力**：作業者・部品・工程・作業時間・数量・ロス数を記録
- **ボタン操作中心**：タップだけで入力完了
- **工程の表記揺れ防止**：マスタから選択する仕組み

### 管理者向け（PC）
- **実績一覧**：フィルタ・検索・CSV出力・削除
- **グラフ可視化**：日別・作業者別・工程別の集計グラフ
- **マスタ管理**：作業者・部品・工程の管理

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL)
- **グラフ**: Recharts
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで以下を実行：
   - `supabase/schema.sql`（テーブル作成）
   - `supabase/seed.sql`（初期マスタデータ投入）

### 3. 環境変数の設定

`.env.local`ファイルを作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

## デプロイ（Vercel）

1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
4. デプロイ

## ディレクトリ構成

```
chinotnapp/
├── app/
│   ├── page.tsx              # スマホ入力画面（ホーム）
│   ├── admin/
│   │   ├── page.tsx          # 実績一覧
│   │   ├── charts/           # グラフ
│   │   └── masters/          # マスタ管理
├── lib/
│   ├── supabase.ts           # Supabase接続
│   └── types/
│       └── database.ts       # 型定義
├── supabase/
│   ├── schema.sql            # DBスキーマ
│   └── seed.sql              # 初期データ
└── README.md
```

## データベーススキーマ

### workers（作業者マスタ）
- worker_id, name, order_index, active

### parts（部品マスタ）
- part_id, name, order_index, active

### operations（工程マスタ）
- operation_id, part_id, name, order_index, active, category

### work_logs（作業ログ）
- log_id, worker_id, part_id, operation_id, duration_minutes, quantity, loss_quantity, note, is_deleted, created_at, updated_at, updated_by

## 重要な設計ポイント

1. **工程の手入力禁止**：表記揺れを防ぐため、マスタから選択
2. **論理削除**：is_deletedフラグで削除（物理削除しない）
3. **履歴管理**：updated_at/updated_byで更新履歴を記録
4. **指標定義**：
   - 良品数 = quantity - loss_quantity
   - 分/個 = duration_minutes / quantity
   - 分/良品 = duration_minutes / (quantity - loss_quantity)

## 今後の拡張予定

- Supabase Authによるログイン機能
- Row Level Security（RLS）による権限管理
- 管理画面のURL保護（PIN認証など）
- 発注・予測機能
- 在庫管理機能

## ライセンス

Private

# セットアップガイド

## 前提条件

- Node.js 18以上
- Supabaseアカウント
- Vercelアカウント（デプロイ時）

## 手順

### ステップ1: Supabaseプロジェクトの作成

1. https://supabase.com にアクセス
2. 「New Project」をクリック
3. プロジェクト名を入力（例: chinotnapp）
4. データベースパスワードを設定
5. リージョンを選択（推奨: Tokyo）
6. 「Create new project」をクリック
7. プロジェクト作成完了まで待機（1〜2分）

### ステップ2: データベースのセットアップ

1. Supabaseダッシュボードで「SQL Editor」を開く
2. 「New query」をクリック
3. `supabase/schema.sql`の内容を貼り付け
4. 「Run」をクリックしてテーブル作成
5. 成功を確認
6. 再度「New query」をクリック
7. `supabase/seed.sql`の内容を貼り付け
8. 「Run」をクリックして初期データ投入
9. 成功を確認

### ステップ3: 環境変数の取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下をコピー：
   - Project URL（NEXT_PUBLIC_SUPABASE_URL）
   - anon public（NEXT_PUBLIC_SUPABASE_ANON_KEY）

### ステップ4: ローカル環境の設定

1. プロジェクトルートで`.env.local`を作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```

2. 依存関係をインストール：

```bash
npm install
```

3. 開発サーバーを起動：

```bash
npm run dev
```

4. ブラウザで http://localhost:3000 を開く

### ステップ5: 動作確認

#### スマホ入力画面の確認

1. http://localhost:3000 を開く
2. 作業者「西村」をタップ
3. 部品「胴」をタップ
4. 工程「製材（サイズ切り）」をタップ
5. 作業時間「1時間0分」、数量「10」、ロス数「0」を入力
6. 「保存」をタップ
7. 「保存しました」というメッセージが表示されることを確認

#### 管理画面の確認

1. http://localhost:3000/admin を開く
2. 実績一覧に先ほど入力したデータが表示されることを確認
3. 「グラフ」タブをクリック
4. グラフが表示されることを確認
5. 「マスタ管理」タブをクリック
6. 作業者・部品・工程のマスタが表示されることを確認

### ステップ6: Vercelへのデプロイ

1. GitHubにコードをプッシュ：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/chinotnapp.git
git push -u origin main
```

2. https://vercel.com にアクセス
3. 「Import Project」をクリック
4. GitHubリポジトリを選択
5. 環境変数を設定：
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
6. 「Deploy」をクリック
7. デプロイ完了を待つ
8. 本番URLにアクセスして動作確認

## トラブルシューティング

### エラー: Supabase環境変数が設定されていません

`.env.local`ファイルが正しく作成されているか確認してください。
開発サーバーを再起動してください。

### エラー: テーブルが存在しない

`supabase/schema.sql`と`supabase/seed.sql`が正しく実行されているか確認してください。
SupabaseのTable Editorで、workers, parts, operations, work_logsテーブルが存在するか確認してください。

### グラフが表示されない

Rechartsがインストールされているか確認してください：

```bash
npm list recharts
```

### スマホでの表示が崩れる

Tailwind CSSが正しくビルドされているか確認してください。
ブラウザのキャッシュをクリアしてください。

## セキュリティ設定（推奨）

### 管理画面の保護

現在、管理画面は誰でもアクセスできます。以下のいずれかで保護することを推奨します：

1. **Vercel Password Protection**（最も簡単）
   - Vercelダッシュボードで「Settings」→「Environment Variables」
   - `VERCEL_PASSWORD`を設定

2. **Supabase Auth導入**（本格的）
   - Supabase Authでログイン機能を実装
   - Row Level Security（RLS）を設定

### データベースのバックアップ

Supabaseダッシュボードで定期的にバックアップを取得してください：
- 「Settings」→「Backups」

## 次のステップ

- 実際の作業データを入力して運用開始
- グラフを見てボトルネックを特定
- 必要に応じてマスタデータを追加
- ログイン機能の追加を検討

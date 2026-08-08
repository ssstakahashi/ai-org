# ai-org

AI従業員が動く「会社」の司令塔。Cloudflare 上の Next.js アプリで、業務タスク台帳・X投稿・画像・担当エージェントを管理します。

## 構成

| 役割 | 技術 |
|---|---|
| アプリ | Next.js 16 + OpenNext (`@opennextjs/cloudflare`) |
| DB | Cloudflare D1（`DB`） |
| 画像 | Cloudflare R2（`MEDIA` / bucket: `ai-org-media`） |

初期従業員（Obsidian `115_組織/AI従業員` 準拠）:

- 高橋昌兵（代表）
- 経営企画AI
- 開発AI
- 会計税務AI
- 受託サービスAI
- コンテンツAI
- 政治活動AI

データは用途で分離しています。

| 画面 | テーブル | 用途 |
|---|---|---|
| 業務台帳 `/` | `tasks` | AI従業員の各種業務タスク |
| X投稿スケジュール `/x-schedule` | `x_posts` | 投稿文・画像・予約・投稿結果 |

## 開発

```bash
cd ~/Developer/ai-org/00_private/ai-org
npm install
npx wrangler d1 migrations apply ai-org --local
npm run dev
```

http://localhost:3000

本番 D1 をローカルへ上書きコピー（Cloudflare ログイン必須）:

```bash
npm run db:pull
# ダンプ SQL を残す場合: npm run db:pull -- --keep
```

ローカル D1 を本番へ上書きコピー（本番データが消えるので注意）:

```bash
npm run db:push
# 確認スキップ: npm run db:push -- --yes
# ダンプ SQL を残す場合: npm run db:push -- --keep
```

※ いずれも相手側の D1 は全消ししてから入れ直します。R2 の画像はコピーしません。

Workers 実行環境での確認:

```bash
npm run preview
```

## 認証

Cloudflare Access（メールOTP）で保護しています。

アプリ側でも `Cf-Access-Jwt-Assertion` を検証します（`src/middleware.ts`）。
ローカル `npm run dev` では JWT 検証をスキップします。

ログアウトはヘッダーの「ログアウト」から `TEAM_DOMAIN/cdn-cgi/access/logout` へ遷移します。

| 変数 | 内容 |
|---|---|
| `TEAM_DOMAIN` | `https://studiofoods.cloudflareaccess.com` |
| `POLICY_AUD` | Access アプリの AUD |

## 自動化の集約（外部 push）

別サーバーのアプリ（例: agri-next-backend）は、ジョブ完了時に次へ POST します。

`POST /api/internal/automation-ingest`

| 変数 | 内容 |
|---|---|
| `AUTOMATION_INGEST_SECRET` | push 認証用共有シークレット |

```bash
npx wrangler secret put AUTOMATION_INGEST_SECRET
```

Cloudflare Access ではこのパスを Bypass（または Service Auth）にしてください。アプリ側はシークレットのみ検証します。

対象パス:

- `POST /api/internal/automation-ingest` — 外部アプリからの自動化カタログ push
- `GET /api/internal/requirements` — App 要件定義の export（Cursor Automation 用）

### App 要件定義 export

承認済み要件を Markdown で取得します（Cursor Automation が読み取る）。

```bash
curl -sS \
  -H "Authorization: Bearer $AUTOMATION_INGEST_SECRET" \
  "https://<ai-org-host>/api/internal/requirements?all=1"
```

| クエリ | 説明 |
|---|---|
| `all=1` | 全 App |
| `app_name_id=<id>` | App マスタ id で絞り込み |
| `app=<名前>` | App 名で絞り込み |
| `status=approved` | デフォルト（`draft` 等も指定可） |

管理画面: `/apps/requirements`  
セットアップ手順: [docs/cursor-automation-app-requirements.md](./docs/cursor-automation-app-requirements.md)

agri 側の適用手順: [integrations/agri-next-backend/README.md](./integrations/agri-next-backend/README.md)

一覧: `/automations`

## X 自動投稿

予約ステータスかつ `scheduled_at` を過ぎた `x_posts` を、毎分の Cron で投稿します。

| 変数 | 内容 |
|---|---|
| `X_API_KEY` | Consumer Key（API Key） |
| `X_API_SECRET` | Consumer Secret |
| `X_ACCESS_TOKEN` | Access Token（Read and write） |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret |
| `X_BEARER_TOKEN` | 任意（読み取り用） |

ローカルは `.dev.vars`、本番は Secrets:

```bash
npx wrangler secret put X_API_KEY
npx wrangler secret put X_API_SECRET
npx wrangler secret put X_ACCESS_TOKEN
npx wrangler secret put X_ACCESS_TOKEN_SECRET
```

`/x-schedule` から「予約分をいま投稿」または行の「Xへ投稿」でも実行できます。

## X投稿 → Google スプレッドシート転記

`/x-schedule` で投稿を作成・更新・削除・ステータス変更・X投稿完了すると、指定の Google スプレッドシートへ自動転記します。

転記先（固定）: [スプレッドシート](https://docs.google.com/spreadsheets/d/1a1ZZgAgHoxgoG6y2FB_SVFRb9YBlIFiW7rm1IlJeIvI/edit?gid=1053570355)

| 変数 | 内容 |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account の client_email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service Account の private_key（PEM。`\n` エスケープ可） |
| `APP_PUBLIC_URL` | 任意。画像 URL を絶対パスで書き込むときのサイト URL |

セットアップ:

1. Google Cloud で **Google Sheets API** を有効化し、Service Account を作成
2. 転記先シートを SA のメールアドレスに **編集者** で共有
3. 1行目に `ID` 列が必要（空シートなら初回同期時にヘッダーを自動作成）

ローカルは `.dev.vars`、本番は Secrets:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npx wrangler secret put APP_PUBLIC_URL   # 任意
```

転記列（デフォルト）: ID / タイトル / 投稿文 / ステータス / 予約日時 / メモ / 画像URL / X投稿ID / X投稿URL / エラー / 作成日時 / 更新日時

## デプロイ

D1 `ai-org` と R2 `ai-org-media` は作成済みです。リモートへ出すとき:

```bash
npx wrangler d1 migrations apply ai-org --remote   # 未適用時のみ

# Server Action ID をデプロイ間で安定させる（ビルド時に必須）
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
# 以降のデプロイでも同じ値を使うこと

npm run deploy
```

### Server Action エラー（`Failed to find Server Action`）

デプロイ後にブラウザが古い JS を保持していると、新規タスク保存などでこのエラーが出ます。

| 対策 | 内容 |
|---|---|
| 即時 | ページを再読み込み（Cmd+Shift+R） |
| ビルド | 上記 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` を毎回同じ値で設定 |
| 恒久（推奨） | Skew Protection を有効化（下記） |

Skew Protection（OpenNext）を有効にすると、デプロイ直後も古いタブから Server Action を呼べます。

```bash
# Cloudflare API トークン（Workers Scripts: Read 権限）を発行し、
# ダッシュボードの workers.dev URL からプレビュードメインを確認
export CF_PREVIEW_DOMAIN="ai-org.<account-subdomain>.workers.dev"
export CF_WORKERS_SCRIPTS_API_TOKEN="..."
export ENABLE_SKEW_PROTECTION=1
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="..."   # 固定キー

npm run deploy
```

`CF_WORKER_NAME` と `CF_ACCOUNT_ID` は `wrangler.jsonc` に設定済みです。

## これから足すもの

- 従業員ごとのダッシュボード
- AI エージェントからの API 更新

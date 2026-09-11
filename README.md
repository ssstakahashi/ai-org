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
| ブログ下書き `/blog-drafts` | `blog_posts` | AI作成の公式ブログ下書きの確認・承認 |

## 開発

```bash
cd ~/Developer/ai-org/00_private/ai-org
npm install
npx wrangler d1 migrations apply ai-org --local
npm run dev
```

http://localhost:3000

音声入力（タスク登録・編集）をローカルで試す場合は、Cloudflare Access 経由の AI バインディングではなく REST API を使います。`.dev.vars` に次を追加してください（`CF_ACCOUNT_ID` は `wrangler.jsonc` に設定済み）。

```bash
# Cloudflare ダッシュボード > Workers AI > Use REST API で作成
CF_API_TOKEN=...
```

本番 Worker では `AI` バインディングをそのまま利用します（トークン不要）。

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

アプリ内のパスワード認証で保護しています（`/login`）。

`src/middleware.ts` がセッション Cookie（`ai-org-session`）を検証します。ローカル `npm run dev` では認証をスキップします。

ログアウトはヘッダーの「ログアウト」から `/api/auth/logout` へ遷移します。

| 変数 | 内容 |
|---|---|
| `APP_AUTH_PASSWORD` | ログインパスワード（wrangler secret） |
| `APP_AUTH_SECRET` | セッション署名用シークレット（wrangler secret） |

```bash
npx wrangler secret put APP_AUTH_PASSWORD
npx wrangler secret put APP_AUTH_SECRET
```

**Cloudflare Access は外してください。** Zero Trust のアプリ保護を有効のままにすると、Access とアプリ認証が二重になりログインが不安定になります。

## 自動化の集約（外部 push）

別サーバーのアプリ（例: agri-next-backend）は、ジョブ完了時に次へ POST します。

`POST /api/internal/automation-ingest`

| 変数 | 内容 |
|---|---|
| `AUTOMATION_INGEST_SECRET` | push 認証用共有シークレット |

```bash
npx wrangler secret put AUTOMATION_INGEST_SECRET
```

アプリ側は共有シークレットのみ検証します（middleware では認証をスキップ）。

対象パス:

- `POST /api/internal/automation-ingest` — 外部アプリからの自動化カタログ push
- `GET /api/internal/requirements` — App 要件定義の export（Cursor Automation 用）
- `POST /api/internal/blog-drafts` — 公式ブログ下書きの投入（Grok Bot 用）
- `GET /api/internal/blog-drafts` — 下書き一覧（`status` で絞り込み可）
- `GET /api/internal/spark-automations` — Google Spark 自動化の現在値
- `POST /api/internal/spark-automations` — スプレッドシートから Spark 自動化を再取得

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

## ブログ下書きの確認・承認

AI（Grok Bot）が作成した公式ブログの下書きを `/blog-drafts` で確認し、承認します。承認はステータス変更のみで、studiofoods-public への公開（コミット／push／デプロイ）は別作業です。

| ステータス | 意味 |
|---|---|
| 下書き | 確認待ち |
| 承認済 | 人が内容を承認した |
| 公開済 | サイトへ反映済み |
| 差戻し | 修正が必要 |

投入（認証は `AUTOMATION_INGEST_SECRET`）:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $AUTOMATION_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"記事タイトル","slug":"example-slug","body":"本文","category":"経営","tags":["AI","DX"]}' \
  "https://<ai-org-host>/api/internal/blog-drafts"
```

同じ `slug`（または `id`）で再投入すると下書きに戻して上書きします。承認済み一覧の取得は `GET /api/internal/blog-drafts?status=approved` です。

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

## Google Spark 自動化の取得

Spark（Gemini）は ai-org を直接編集できないため、指定スプレッドシートの内容を `/automations` へ取り込みます。人はシートを直接編集できます。

取得元（固定）: [Spark_自動化一覧](https://docs.google.com/spreadsheets/d/1yAQXXH7yYkZ9Xm89tGKoUwqnDFXOZ6XfdXm0T1pQZwA/edit?gid=0#gid=0)

列: `ID` / `自動化タイトル` / `ステータス` / `実行タイミング` / `処理内容・プロンプト`

X投稿転記と同じ `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` を使い、シートを Service Account に **閲覧者** で共有してください。

`/automations` を開いたとき、および「スプレッドシートから取得」ボタンで再取得します。

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $AUTOMATION_INGEST_SECRET" \
  "https://<ai-org-host>/api/internal/spark-automations"
```

## Google Tasks ↔ 業務台帳

`/` の業務台帳と Google Tasks を双方向同期します（10分ごと Cron、または画面の「Google Tasks と同期」）。

同期するフィールド: タイトル / 本文（Google の notes） / 完了状態 / 期日の日付（`end_at` の日付 ↔ Google `due`。時刻は Google API が持てない）。担当・カテゴリ・タグ・画像・繰り返しは ai-org 側のみです。

Google の完了は台帳の `done`、それ以外は Google では未完了です。Google で未完了に戻したとき、台帳が `done` なら `approved` に戻し、下書き・予約などは上書きしません。

対象リストは既定で名称 `ai-org`（無ければ作成）。`GOOGLE_TASKS_LIST_ID` で固定もできます。

認証は次のいずれかです。Sheets 用サービスアカウントを共有するだけでは Tasks に届きません。

| 変数 | 内容 |
|---|---|
| `GOOGLE_TASKS_CLIENT_ID` / `GOOGLE_TASKS_CLIENT_SECRET` / `GOOGLE_TASKS_REFRESH_TOKEN` | 個人 Gmail 向け OAuth（優先） |
| `GOOGLE_TASKS_IMPERSONATE_EMAIL` | Workspace ドメイン全体委任。既存の `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` でこのユーザーになりすます |
| `GOOGLE_TASKS_LIST_TITLE` | 任意。既定 `ai-org` |
| `GOOGLE_TASKS_LIST_ID` | 任意。指定時はリスト名を使わない |
| `GOOGLE_TASKS_DEFAULT_EMPLOYEE_ID` | Google から新規取込したときの担当。未設定なら `sort_order` 先頭の従業員 |

セットアップ:

1. Google Cloud で **Tasks API** を有効化
2. 個人 Google アカウントなら OAuth クライアントを作り、スコープ `https://www.googleapis.com/auth/tasks` のリフレッシュトークンを発行して Secrets に入れる
3. Google Workspace なら管理コンソールでサービスアカウントにドメイン全体委任（同じスコープ）を付け、なりすますユーザーのメールを `GOOGLE_TASKS_IMPERSONATE_EMAIL` に入れる
4. 初回は片方を空にして同期した方が、タイトルだけの重複が起きにくい

```bash
npx wrangler secret put GOOGLE_TASKS_CLIENT_ID
npx wrangler secret put GOOGLE_TASKS_CLIENT_SECRET
npx wrangler secret put GOOGLE_TASKS_REFRESH_TOKEN
# または Workspace:
npx wrangler secret put GOOGLE_TASKS_IMPERSONATE_EMAIL
```

## デプロイ

D1 `ai-org` と R2 `ai-org-media` は作成済みです。リモートへ出すとき:

```bash
npx wrangler d1 migrations apply ai-org --remote   # 未適用時のみ

# 初回のみ: Server Action ID をデプロイ間で安定させる（ビルド時に必須）
openssl rand -base64 32
# → .dev.vars に追記（値はパスワードマネージャー等に保管。git には入れない）
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...

bun run deploy   # 変更があれば commit → push → デプロイ。未設定なら check-build-env で失敗
# bun run deploy -- "コミットメッセージ"  でも可（省略時は deploy: YYYY-MM-DD HH:MM）
```

`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` は **ビルド時のみ** 使います。Workers の runtime secret（`wrangler secret put`）には不要です。

### Server Action エラー（`Failed to find Server Action`）

デプロイ後にブラウザが古い JS を保持していると、新規タスク保存などでこのエラーが出ます。

| 対策 | 内容 |
|---|---|
| 即時 | ページを再読み込み（Cmd+Shift+R） |
| ビルド | `.dev.vars` の `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` を固定値で維持 |
| 恒久（任意） | Skew Protection を有効化（下記） |

Skew Protection（OpenNext）を有効にすると、デプロイ直後も古いタブから Server Action を呼べます。

```bash
# .dev.vars に追記（Cloudflare API トークンは Workers Scripts: Read 権限）
# ENABLE_SKEW_PROTECTION=1
# CF_PREVIEW_DOMAIN=ai-org.<account-subdomain>.workers.dev
# CF_WORKERS_SCRIPTS_API_TOKEN=...

bun run deploy
```

`CF_WORKER_NAME` と `CF_ACCOUNT_ID` は `wrangler.jsonc` に設定済みです。

## これから足すもの

- 従業員ごとのダッシュボード
- AI エージェントからの API 更新

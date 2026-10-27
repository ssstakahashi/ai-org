# ai-org API ルール

自動処理ボット・外部アプリ向けの HTTP API 仕様。画面では **情報 → API ルール**（`/api-rules`）。同内容を API から取得する場合は `GET {{API_V1_BASE}}/spec`（`X-API-Key`、`reader` 以上）。`Accept: text/markdown` のときは Markdown 本文のみ返す。

OpenAPI / Swagger は無い。リポジトリ上の正本は `docs/api-rules.md`。画面ルート・Server Actions は [interfaces.md](./interfaces.md)。

## 認証

| 対象 | 認証 | 備考 |
|---|---|---|
| ブラウザ画面（本番） | Cookie `ai-org-session`（JWT） | 未ログインは `/login?next=…` |
| `localhost` / `127.0.0.1` | なし | `Host` がローカルのときのみ。Tunnel 経由の公開ホストは JWT 必須 |
| `/api/internal/*` | `Authorization: Bearer` または `x-automation-ingest-secret` | 値は `AUTOMATION_INGEST_SECRET`。**新規の自動処理は `/api/v1` を使う** |
| `/api/v1/*` | ヘッダー `X-API-Key` | ロール: `reader` / `reviewer` / `writer` / `publisher` / `admin`。`API_KEYS`（`名前\|role\|secret` をカンマ区切り）が空のときは `AUTOMATION_INGEST_SECRET` を `admin` として受け付ける |
| その他 `/api/*`（auth 以外） | セッション Cookie | 例: 文字起こし、メディア、リンクプレビュー |

- 認証シークレット未設定の本番は 500（`Auth configuration missing`）。
- Cloudflare Access は使わない。

## 共通（`/api/v1`）

- ベース URL: `{{API_V1_BASE}}`
- 形式: JSON（`Content-Type: application/json`）
- エラー: `{"error":{"code","message","detail"}}`
- 一覧: クエリ `limit`（既定 50、最大 200）、`cursor`、`updated_since`。レスポンスに `total` を含む場合あり
- 書き込み: ヘッダー `X-Request-Id` を履歴に残す（任意。未指定時はサーバー生成）

## Route Handlers（セッション or ingest secret）

| メソッド | パス | 概要 | 認証 |
|---|---|---|---|
| `POST` | `/api/auth/login` | パスワード検証 → セッション Cookie | なし（middleware バイパス） |
| `GET` / `POST` | `/api/auth/logout` | セッション削除 → `/login` | セッション |
| `GET` | `/api/link-preview` | URL の OGP 取得 | セッション |
| `POST` | `/api/transcribe` | 音声文字起こし（Workers AI REST、≤5MB） | セッション |
| `GET` | `/api/media/[...key]` | ローカルディスクのメディア配信 | セッション |
| `POST` | `/api/x-post/analyze-image` | 画像から X 投稿文を提案（Gemini） | セッション |
| `POST` | `/api/internal/automation-ingest` | 外部アプリから自動化カタログを push | ingest secret |
| `GET` | `/api/internal/requirements` | 承認済み App 要件を Markdown export | ingest secret |
| `GET` / `POST` | `/api/internal/blog-drafts` | ブログ下書きの一覧（コメント付き） / 外部投入 | ingest secret |
| `GET` / `POST` | `/api/internal/blog-comments` | ブログ下書きコメントの一覧 / 外部投入（公開済は拒否） | ingest secret |
| `GET` | `/api/internal/x-posts` | X投稿一覧（`status` / `destination` で絞り込み可。各投稿に `comments`） | ingest secret |
| `GET` / `POST` | `/api/internal/x-comments` | X投稿コメントの一覧 / 外部投入（投稿済は拒否） | ingest secret |
| `GET` / `POST` | `/api/internal/spark-automations` | Spark 自動化の取得 / シート pull | ingest secret |

## `/api/v1` エンドポイント

| メソッド | パス | ロール | 概要 |
|---|---|---|---|
| `GET` | `/spec` | reader 以上 | このドキュメント（JSON または Markdown） |
| `GET` | `/blog-posts` | reader 以上 | 一覧。`destination` `status` `slug` `tag` |
| `GET` | `/blog-posts/count` | reader 以上 | destination・status 別件数 |
| `GET` / `PUT` | `/blog-posts/{slug}` | reader / writer | 取得 / upsert。draft 以外の本文更新は 403。差戻し slug は 409 |
| `PATCH` | `/blog-posts/{slug}/status` | publisher | 状態遷移。`force=true` は admin の公開差し戻し |
| `GET` | `/blog-posts/{slug}/history` | reader 以上 | 更新前の行 |
| `GET` / `POST` | `/blog-posts/{slug}/comments` | reader / reviewer | コメント。API の `resolved` は DB の `done` |
| `PATCH` | `/comments/{id}` | reviewer | open → resolved、`decision_status` |
| `GET` / `PUT` | `/blog-ideas` と `/blog-ideas/{id}` | reader / writer | ネタ。`GET /blog-ideas/count` |
| `GET` / `PUT` | `/x-posts` と `/x-posts/{id}` | reader / writer | 固定 ID。更新は `base_updated_at`。`posted` は DB の `done`。`GET /x-posts/count` |
| `GET` / `PUT` | `/board/links` | reader / writer | 既存リンクを残して追加。VERSION を返す |
| `GET` / `PUT` | `/employees` | reader / admin | 名簿。ID 維持 |
| `GET` / `PUT` | `/apps/names`、`/apps/requirements` | reader / writer | アプリ名と要件 |
| `GET` / `PUT` | `/apps/test-plans` | reader / writer | App ごとのテスト計画（1 App 1 件。`PUT` は `app_name_id` と `body`。配列は `plans`） |
| `GET` / `PUT` / `DELETE` | `/apps/test-results`、`/apps/test-results/{id}` | reader / writer | テスト結果の一覧・登録・更新・削除。`outcome` は `pass` / `fail` / `partial` / `blocked` / `skipped` / `info`。一覧は `app_name_id`・`limit`・`cursor`・`updated_since`（`recorded_at` 基準） |
| `GET` / `PUT` | `/ledger/tasks`、`/ledger/tasks/{id}` | reader / publisher | 業務台帳。公開タスクを done にする |
| `GET` | `/export` | reader 以上 | 全件 JSON |
| `POST` | `/ingest-reports` | writer | `accepted: 0` のとき理由つきで通知 |

## このアプリ外の API

ブログ画像 API（`mieru-storage-backend` の `/api/v1/blog_images`）は ai-org では変更しない。

App 要件 export のクエリと手順: [cursor-automation-app-requirements.md](./cursor-automation-app-requirements.md)。

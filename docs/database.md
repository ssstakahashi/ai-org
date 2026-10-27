# データモデル設計

関連: [overview.md](./overview.md) · [architecture.md](./architecture.md) · [interfaces.md](./interfaces.md)

正本は `migrations/pg/*.sql`（PostgreSQL 14）。初期スキーマは `0001_schema.sql`。旧 `migrations/*.sql`（SQLite、0001〜0041）は履歴で、Ubuntu では適用しない。型の要約は [src/lib/types.ts](../src/lib/types.ts)。ORM / Prisma はない。

テーブル数は 29。日時は TEXT のまま（`app_now()` は UTC の `YYYY-MM-DD HH:MM:SS`。アプリが書く ISO 文字列も同じ列に入る）。ID はアプリ側で `prefix_uuid`。`sort_order` / `is_active` / `ok` は INTEGER の 0/1。外部キーは `DEFERRABLE`。

## 1. ER図

### 業務台帳

```mermaid
erDiagram
  employees ||--o{ tasks : assigns
  categories ||--o{ tasks : classifies
  categories ||--o{ pages : classifies
  task_groups ||--o{ tasks : groups
  tasks ||--o{ task_tags : has
  tags ||--o{ task_tags : tagged
  tasks ||--o{ task_links : has
  pages ||--o{ page_tags : has
  tags ||--o{ page_tags : tagged
  tasks ||--o| google_task_sync : maps
```

`tasks.recurrence_series_id` は同一シリーズの論理グループで、自己参照 FK はない。

### X・ブログ

```mermaid
erDiagram
  employees ||--o{ blog_post_comments : authors
  employees ||--o{ x_post_comments : authors
  blog_posts ||--o{ blog_post_comments : has
  x_posts ||--o{ x_post_comments : has
  blog_ideas ||--o{ blog_idea_uses : reused
  blog_ideas ||--o{ blog_idea_tags : has
  tags ||--o{ blog_idea_tags : tagged
```

`tags` は業務台帳と同じマスタ。

Sheets 同期は DB 外（後述）。

### App 管理

```mermaid
erDiagram
  app_groups ||--o{ app_names : groups
  app_types ||--o{ app_names : types
  app_groups ||--o{ apps : groups
  app_types ||--o{ apps : types
  app_names ||--o{ apps : named
  app_names ||--o{ app_requirements : requires
  app_names ||--o| app_test_plans : plans
  app_names ||--o{ app_test_results : tests
  app_crons
```

`app_crons` に apps への FK はない。

### 自動化

```mermaid
erDiagram
  remote_automations ||--o{ automation_runs : logical
  google_task_sync_state
  org_rules
```

`automation_runs` から `remote_automations` への宣言 FK はない。`org_rules` は独立。

## 2. 主要エンティティ定義

### 組織・業務

- **employees**: AI従業員。`name`, `role`, `area`, `authority`, 色、`sort_order`。
- **categories** / **tags** / **task_groups**: 分類マスタ。
- **tasks**: 業務タスク。`status` は `draft` / `approved` / `scheduled` / `done` / `failed`。期間は `start_at` / `end_at`。
- **task_tags** / **task_links**: タスクのタグと関連 URL。
- **pages** / **page_tags**: アプリ内ページ台帳。
- **org_rules**: 組織ルール。職務権限表の固定 id は `rule-authority-matrix`。

`tasks` にはレガシー列 `scheduled_at`, `x_post_id`, `last_error` が残るが、アプリの INSERT / 型では未使用（X は `x_posts` へ分離済み）。

### X投稿・ブログ

- **x_posts**: 投稿文・画像キー・予約。`destination` は `studiofoods`（表示名: @MIERUagri_漫画、既定）/ `agri`（表示名: @MIERUagri）/ `mieru`（表示名: @MIERUkaikei）/ `mieru_manga`（表示名: @MIERUkaikei_漫画）/ `studiofoods_official`（表示名: @studio_foods）。
- **x_post_comments**: 投稿済以外の X 投稿への AI コメント。1記事に複数AI・複数件。`employee_id` は任意（AI従業員）。`status` は `open`（未対応）/ `done`（対応済）。投稿済（`done`）への投入は拒否。
- **blog_posts**: 公式ブログ下書き。`status` は `draft` / `approved` / `published` / `rejected`。`destination` は `studiofoods_hp` / `agri_lp`。`category` / `tags` はマスタ FK ではなく TEXT。画像は `thumbnail_key` と `figure_keys`（JSON）。`thumbnail_origin` は `r2` / `blog_image_api`。`body_hash`、`version`、`external_check_date`、`external_check_result`、`rewrite_mark`（notes から切り出した「最終構成」「広報」）、`published_at`、`published_url` を持つ。
- **blog_post_comments**: 未公開下書きへのコメント。1記事に複数。`status` は DB 上 `open` / `done`。`/api/v1` では `done` を `resolved` と出す。`target_body_hash`、`verdict`、`quote`、`reason`、`suggestion`、`resolved_by`、`decision_status`（`needs_decision` / `decided`）を持つ。公開済への投入は拒否。
- **blog_post_audit**: 更新前の行 JSON。`request_id` と `actor` を残す。
- **blog_post_release_checks**: 公開前のサムネ、OGP、カテゴリ確認。
- **blog_site_categories**: 承認を許すカテゴリ名。既存記事の category から初期投入する。
- **ops_alerts**: API 失敗、0 件取り込み、照合の差。`read_at` が空のものを掲示板に出す。
- **board_links**: 掲示板に足したリンク。組み込みのシートリンクは消さない。
- **blog_ideas**: ネタ。`topic` は `sidebusiness` / `agri` / `tax` / `dx` / `process` / `ma` / `admin` / `compare`。本文以外の列は `details`（JSON）。CSV アップロードが入力で、同じ `topic` + `no`（No. が空ならタイトル）は上書きする。
- **blog_idea_uses**: ネタの転用先。`medium` は `blog` / `x`。`destination` はブログなら `studiofoods_hp` / `agri_lp`、X なら `studiofoods` / `agri` / `mieru` / `mieru_manga` / `studiofoods_official`。同一ネタに複数可。`(idea_id, medium, destination)` は一意。
- **blog_idea_tags**: ネタとタグマスタ（`tags`。タスク・ページと共通）の中間。CSV の同じ No. 上書きでは残る。

### App 管理

- **app_groups** / **app_types** / **app_names**: マスタ。`app_names` は FK に加え TEXT の冗長カラム（`app_group`, `app_type`）を持つ。
- **apps**: デプロイ先・スタックメモ（`dev_folder`, `frontend`, `db`, URL 等）。同様に TEXT 冗長カラムあり。
- **app_crons**: Cron 登録（論理的に App 関連、FK なし）。
- **app_requirements**: App 名に紐づく要件。`status` は `draft` / `approved` / `in_progress` / `done` / `cancelled`。
- **app_test_plans**: App ごとのテスト計画（1 App 1 行、`body` は Markdown 想定の自由記述）。
- **app_test_results**: テスト結果の時系列記録。`outcome` は `pass` / `fail` / `partial` / `blocked` / `skipped` / `info`。`recorded_at` で並べる。

### 自動化・Google Tasks

- **remote_automations**: 複合 PK `(source, id)`。`runner` は `program` / `cursor` / `manual`。
- **automation_runs**: 実行履歴。
- **google_task_sync**: `tasks.id` ↔ Google Task。`last_source` は `ai-org` / `google`。
- **google_task_sync_state**: 行は `id='default'` のみ。OAuth リフレッシュトークンを保持。

## 3. Google Sheets（DB 外）

定数は [src/lib/bulletin-board.ts](../src/lib/bulletin-board.ts)、[src/lib/x-post-sheets-sync.ts](../src/lib/x-post-sheets-sync.ts)、[src/lib/spark-sheet-sync.ts](../src/lib/spark-sheet-sync.ts)。

| 用途 | 定数 | DB との関係 |
|---|---|---|
| X投稿転記 | `X_POST_SHEET_ID` | `x_posts` と双方向 |
| ブログ投稿管理（SF HP） | `STUDIOFOODS_HP_BLOG_SHEET_ID` | `blog_posts`（`studiofoods_hp`）と同期 |
| ブログ投稿管理（Agri LP） | `AGRI_LP_BLOG_SHEET_ID` | `blog_posts`（`agri_lp`）と同期 |
| Spark 自動化 | `SPARK_SHEET_ID` | 行 → `remote_automations`（`source=spark`） |

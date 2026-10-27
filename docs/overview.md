# サービス概要

関連: [architecture.md](./architecture.md) · [database.md](./database.md) · [interfaces.md](./interfaces.md)

社内司令塔アプリ **ai-org** の目的と機能の正本。公開 SaaS ではない。

## 1. 目的・コアバリュー

- **誰のどんな課題**: 代表と AI 従業員の業務（タスク、X 投稿、ブログ、自動化、App 要件）が散らばると、承認と進捗が見えなくなる。
- **コアバリュー**: Ubuntu 上の Web コンソールに業務を集約し、人が承認し、AI / Bot / Cron が実行する。

### 主要なユースケース（ペルソナ）

- **代表（高橋昌兵）**: 業務台帳の承認、ブログ下書きの承認、組織ルールの参照。
- **AI 従業員**（経営企画 / 開発 / 会計税務 / 受託サービス / コンテンツ / 政治活動）: 担当タスクの実行と記録。
- **コンテンツ / 広報（Grok Bot 含む）**: X 投稿の作成・予約、ブログ下書きの投入。
- **開発AI**: App 要件の登録と、export API 経由の実装。

初期従業員マスタは Obsidian `115_組織/AI従業員` に準拠する。

## 2. 機能一覧（Feature Matrix）

| 機能名 | 概要 | ステータス | 対象ユーザー |
|---|---|---|---|
| 認証 | 共有パスワード + JWT Cookie。localhost はスキップ | 稼働中 | 全体 |
| 業務台帳 | カレンダー / ガント / 看板。担当・期間・カテゴリ・タグ（追加・編集時は名前で検索）・繰り返し | 稼働中 | 全体 |
| Google Tasks 同期 | 業務台帳と双方向（10分 Cron / 手動）。全リストを取得し、新規の台帳タスクはリスト `ai-org` へ | 稼働中 | 全体 |
| X投稿スケジュール | 投稿文・画像・予約。投稿先 `studiofoods`（表示名: @MIERUagri_漫画）/ `agri`（表示名: @MIERUagri）/ `mieru`（表示名: @MIERUkaikei）/ `mieru_manga`（表示名: @MIERUkaikei_漫画）/ `studiofoods_official`（表示名: @studio_foods）。一覧のステータスは下書き・承認済・予約・完了・失敗をボタンで出し、ワンクリックで更新する。投稿済以外への AI コメント（複数AI・複数件、未対応／対応済）を確認。ナビは「投稿」 | 稼働中 | コンテンツ |
| X API 自動投稿 | Cron からの X API 投稿 | 停止中 | — |
| X ブラウザ投稿 | Grok Bot がブラウザ経由で投稿 | 稼働中 | コンテンツ |
| ブログ下書き | 確認・承認。投稿先 `studiofoods_hp` / `agri_lp`。Sheets 双方向同期はデフォルト無効（環境変数 `BLOG_DRAFTS_SHEET_AUTO_SYNC=1` で有効化）。一覧表に使用予定画像（TOP / 図表）を表示。確認ポップアップでは本文中のインライン SVG を画像として表示。未公開記事への AI コメント（複数AI・複数件、未対応／対応済）を確認。notes に「本番へは出さない」を含む行は同期時の削除から保護（hold 保護）。ナビは「投稿」 | 稼働中 | コンテンツ |
| ネタ | タブ SideBusiness / Agri / 税務 / DX / 業務プロセス改革 / M＆A / 労務 / 3社比較。CSV を PostgreSQL へアップロードする。各ネタにブログ（HP / 農業日誌アプリLP）と X（@MIERUagri_漫画 / @MIERUagri / @MIERUkaikei / @MIERUkaikei_漫画 / @studio_foods）の転用先を記録する。一覧の「下書き」列で未転用 / ブログ下書き / X下書き / 両方を示す。各ネタにページ台帳と同じタグを付けられる。SideBusiness は一覧の上に、副業時の月収中央値（縦）と参入難易度（横）の4象限を出し、点を押すと詳細ダイアログを開く。ナビは「投稿」 | 稼働中 | コンテンツ |
| 掲示板 | 投稿管理シートへのリンク、追加リンク、VERSION 履歴、未読の障害通知。ナビは「情報」 | 稼働中 | 全体 |
| Web分析 | Cloudflare GraphQL Analytics でゾーンの HTTP トラフィックを表示（`CF_API_TOKEN`、任意で `CF_ANALYTICS_ZONE_NAMES`）。ナビは「情報」 | 稼働中 | 全体 |
| OpenClaw | 情報メニューから別 PC の Control UI へ遷移（`OPENCLAW_CONTROL_UI_URL`。OpenClaw 側は Cloudflare Tunnel 等で HTTPS 公開を想定） | 稼働中 | 全体 |
| API ルール | HTTP API 仕様（`docs/api-rules.md` と同期）。ナビは「情報」。ボットは `GET /api/v1/spec` | 稼働中 | 自動処理 |
| 会計マニュアル | 法人税の決算・申告手順の目次（No.1〜62、4章）。目次から各項目ページへ遷移 | 稼働中 | 全体 |
| 自動化カタログ | 自アプリ静的一覧 + 外部 ingest + Spark シート | 稼働中 | 全体 |
| App 管理・要件 | マスタ、デプロイ情報、要件定義、テスト計画・結果、Markdown export | 稼働中 | 開発 |
| 従業員・組織ルール | AI従業員マスタ、職務権限表 | 稼働中 | 全体 |
| ページ管理 | アプリ内ページ台帳（カテゴリ・タグ） | 稼働中 | 全体 |
| 従業員ダッシュボード | 従業員ごとの集約画面 | 予定 | 全体 |
| API v1 | `/api/v1`。記事・コメント・ネタ・X・従業員・アプリ（要件・テスト計画・テスト結果）・業務台帳の upsert と件数。`GET /spec` でルール全文。キー認証。失敗は掲示板へ通知 | 稼働中 | 自動処理 |

## 3. 非機能要件

- **想定トラフィック**: 社内数名 + Cron / Bot。高負荷の公開サービスではない。
- **レスポンス目標**: p95 は未定義（計測していない）。
- **対応環境**: デスクトップ Web 推奨。ネイティブ iOS / Android アプリはない。
- **実行基盤**: outside-local-ubuntu の `/home/s-takahashi/development/ai-org` で `next dev` と PostgreSQL 14。開発と稼働は同じディレクトリ。認証シークレット未設定なら、localhost 以外は 500。
- **観測**: `console`。Sentry 等の APM は未導入。
- **データ保全**: 正本は PostgreSQL。画像はローカルディスク。Google Sheets / Tasks は同期先であり DB の代替ではない。

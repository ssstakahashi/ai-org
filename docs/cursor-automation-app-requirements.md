# Cursor Automation: App 要件定義の自動実装

App管理の「要件定義」タブで **承認済** にした要件を、Cursor Automation（Cloud Agent）が読み取り、`dev_folder` のリポで実装するための手順です。

## 前提

- ai-org に App マスタと要件が登録されていること
- App リスト行に `dev_folder` が設定されていること（export に含まれる）
- 本番 Worker に `AUTOMATION_INGEST_SECRET` が設定されていること
- `/api/internal/requirements` は middleware で認証スキップ（`automation-ingest` と同様）。共有シークレットで保護

## Export API

```http
GET /api/internal/requirements?all=1
Authorization: Bearer <AUTOMATION_INGEST_SECRET>
```

| クエリ | 説明 |
|---|---|
| `all=1` | 全 App の対象要件 |
| `app_name_id=<id>` | 特定 App のみ |
| `app=<名前>` | App 名で指定（例: `app=ai-org`） |
| `status=approved` | デフォルト。`draft` / `in_progress` / `done` 等も指定可 |

レスポンスは `text/markdown`。App 名、`dev_folder`、スタック情報、要件本文が含まれます。

### ローカル確認

```bash
curl -sS \
  -H "Authorization: Bearer $AUTOMATION_INGEST_SECRET" \
  "http://localhost:3000/api/internal/requirements?all=1"
```

## Cursor Automation プロンプト例

Automation の Instructions に次を設定します（URL とシークレットは環境に合わせて置換）。

```markdown
1. 次の URL から承認済み要件を Markdown で取得する:
   GET https://<ai-org-host>/api/internal/requirements?all=1
   Authorization: Bearer <AUTOMATION_INGEST_SECRET>

2. 各 App セクションの dev_folder を作業ディレクトリとして使う。
   要件ごとに実装し、既存コード規約に従う。

3. 実装前に要件 id とタイトルを短く要約してから着手する。

4. 完了した要件は ai-org の /apps/requirements で status を「完了」に更新する
   （Phase 1.5 で PATCH API 追加予定。現時点は手動更新）。

5. 変更内容をコミットメッセージに要件 id を含めて記録する。
```

## 運用フロー

1. `/apps/requirements` で App を選び、要件を追加（下書き）
2. 内容を確認したらステータスを **承認済** に変更
3. Cursor Automation を手動実行、またはスケジュール（例: 平日 9:00）
4. Agent が export を読み、`dev_folder` で実装
5. 完了後、要件ステータスを **完了** に更新

## 関連

- 管理画面: `/apps/requirements`
- 自動化一覧: `/automations`（id: `app-requirements-cursor`）
- 認証: `AUTOMATION_INGEST_SECRET`（[README](../README.md) の自動化セクション）

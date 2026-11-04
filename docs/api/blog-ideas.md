# Blog Ideas API

外部スクリプト（Google Gemini等）がブログアイデア（ネタ）を ai-org へ直接投稿するための API 仕様。

## 認証

すべてのエンドポイントは `X-API-Key` ヘッダーによる認証が必要です。

```bash
X-API-Key: your-api-key-here
```

API キーの設定方法については `docs/api-rules.md` を参照してください。

## Base URL

```
https://ai-org.studiofoods.net/api/v1
```

## エンドポイント

### POST /api/v1/blog-ideas

ブログアイデアをバッチで作成・更新します。`external_id` による upsert（既存は更新、新規は作成）をサポートします。

**権限**: `writer` 以上

**リクエストボディ**:

```json
{
  "ideas": [
    {
      "external_id": "obsidian/090_ネタ/tax/example-2024-01.md",
      "title": "法人税の節税テクニック5選",
      "summary": "中小企業が知っておくべき法人税の節税方法を解説します",
      "body": "# 法人税の節税テクニック5選\n\n1. ...",
      "destination": "studiofoods_hp",
      "tags": ["税務", "節税", "法人税"],
      "source": "gemini",
      "source_url": "obsidian://vault/090_ネタ/tax/example-2024-01.md"
    }
  ]
}
```

**フィールド**:

- `ideas` (required, array): アイデアの配列（最大50件）
  - `external_id` (required, string): 外部システムでの一意識別子（ファイルパス等）。同じ `external_id` での再送信は更新となり、重複作成されません
  - `title` (required, string): アイデアのタイトル
  - `summary` (optional, string): 概要
  - `body` (optional, string): 本文（Markdown形式）
  - `destination` (required, string): 投稿先
    - ブログ: `studiofoods_hp`, `agri_lp`
    - X: `studiofoods`, `agri`, `mieru`, `mieru_manga`, `studiofoods_official`
  - `tags` (optional, array of strings): タグ（存在しないタグは自動作成）
  - `source` (optional, string): ソース識別子（既定: `gemini`）
  - `source_url` (optional, string): ソースへのリンク（Obsidian URI等）

**レスポンス** (201 Created):

```json
{
  "results": [
    {
      "external_id": "obsidian/090_ネタ/tax/example-2024-01.md",
      "id": "idea_abc123",
      "status": "created"
    }
  ]
}
```

- `status`: `created` (新規作成) または `updated` (既存更新)

**エラー**:

- `400`: バリデーションエラー（必須フィールド欠落等）
- `401`: API キー未提供
- `413`: バッチサイズ超過（50件まで）

**curl 例**:

```bash
curl -X POST https://ai-org.studiofoods.net/api/v1/blog-ideas \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "ideas": [
      {
        "external_id": "gemini/tax/2024-01.md",
        "title": "法人税の節税テクニック5選",
        "summary": "中小企業向けの節税方法",
        "body": "# 本文\n\n詳細...",
        "destination": "studiofoods_hp",
        "tags": ["税務", "節税"],
        "source": "gemini"
      }
    ]
  }'
```

---

### GET /api/v1/blog-ideas

ブログアイデアの一覧を取得します（重複チェック用）。

**権限**: `reader` 以上

**クエリパラメータ**:

- `source` (optional): ソースでフィルタ（例: `gemini`）
- `topic` (optional): トピックでフィルタ（`sidebusiness`, `agri`, `tax`, `dx`, `process`, `ma`, `admin`, `compare`）
- `tag` (optional): タグでフィルタ
- `since` (optional): 指定日時以降に更新されたものを取得（ISO 8601形式）
- `limit` (optional): 取得件数（既定: 50、最大: 200）
- `cursor` (optional): ページネーション用カーソル

**レスポンス** (200 OK):

```json
{
  "ideas": [
    {
      "id": "idea_abc123",
      "topic": "tax",
      "no": "",
      "title": "法人税の節税テクニック5選",
      "category": "",
      "summary": "中小企業向けの節税方法",
      "badge": "",
      "details": "[{\"label\":\"本文\",\"value\":\"# 本文\\n\\n詳細...\"}]",
      "external_id": "gemini/tax/2024-01.md",
      "source": "gemini",
      "source_url": "",
      "tags": ["税務", "節税"],
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    }
  ],
  "total": 1,
  "next_cursor": null
}
```

**curl 例**:

```bash
# 最近のアイデアを取得
curl https://ai-org.studiofoods.net/api/v1/blog-ideas?limit=10 \
  -H "X-API-Key: your-api-key"

# Gemini が作成したアイデアを取得
curl "https://ai-org.studiofoods.net/api/v1/blog-ideas?source=gemini" \
  -H "X-API-Key: your-api-key"

# 特定の日時以降のアイデアを取得（重複チェック用）
curl "https://ai-org.studiofoods.net/api/v1/blog-ideas?since=2024-01-01T00:00:00Z" \
  -H "X-API-Key: your-api-key"
```

---

### PATCH /api/v1/blog-ideas/{id}

既存のブログアイデアを部分更新します。

**権限**: `writer` 以上

**パスパラメータ**:

- `id`: アイデアの ID

**リクエストボディ** (すべて optional):

```json
{
  "title": "更新されたタイトル",
  "summary": "更新された概要",
  "category": "カテゴリ",
  "badge": "バッジ",
  "details": "[{\"label\":\"本文\",\"value\":\"更新された本文\"}]",
  "source": "gemini",
  "source_url": "obsidian://...",
  "tags": ["新しいタグ1", "新しいタグ2"]
}
```

**レスポンス** (200 OK):

```json
{
  "idea": {
    "id": "idea_abc123",
    "topic": "tax",
    "title": "更新されたタイトル",
    "summary": "更新された概要",
    ...
  }
}
```

**エラー**:

- `404`: アイデアが見つかりません
- `400`: バリデーションエラー

**curl 例**:

```bash
curl -X PATCH https://ai-org.studiofoods.net/api/v1/blog-ideas/idea_abc123 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "更新されたタイトル",
    "summary": "更新された概要"
  }'
```

---

## Google Gemini からの呼び出し例

### Function Calling スキーマ

```json
{
  "name": "upload_blog_ideas_to_ai_org",
  "description": "Upload blog idea entries to ai-org system for review and publication",
  "parameters": {
    "type": "object",
    "properties": {
      "ideas": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "external_id": {
              "type": "string",
              "description": "Unique identifier (e.g., Obsidian file path)"
            },
            "title": {
              "type": "string",
              "description": "Title of the blog idea"
            },
            "summary": {
              "type": "string",
              "description": "Brief summary"
            },
            "body": {
              "type": "string",
              "description": "Full content in Markdown format"
            },
            "destination": {
              "type": "string",
              "enum": ["studiofoods_hp", "agri_lp", "studiofoods", "agri", "mieru", "mieru_manga", "studiofoods_official"],
              "description": "Target destination for the content"
            },
            "tags": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "List of tags"
            }
          },
          "required": ["external_id", "title", "destination"]
        }
      }
    },
    "required": ["ideas"]
  }
}
```

### Python スクリプト例

```python
import requests
import json

API_BASE = "https://ai-org.studiofoods.net/api/v1"
API_KEY = "your-api-key-here"

def upload_blog_ideas(ideas):
    """Upload blog ideas to ai-org"""
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    payload = {
        "ideas": [
            {
                "external_id": idea["file_path"],
                "title": idea["title"],
                "summary": idea.get("summary", ""),
                "body": idea.get("content", ""),
                "destination": idea["destination"],
                "tags": idea.get("tags", []),
                "source": "gemini",
                "source_url": f"obsidian://vault/{idea['file_path']}"
            }
            for idea in ideas
        ]
    }
    
    response = requests.post(
        f"{API_BASE}/blog-ideas",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 201:
        results = response.json()["results"]
        for result in results:
            status = "作成" if result["status"] == "created" else "更新"
            print(f"{status}: {result['external_id']} (ID: {result['id']})")
        return True
    else:
        print(f"エラー: {response.status_code}")
        print(response.text)
        return False

# 使用例
ideas_to_upload = [
    {
        "file_path": "090_ネタ/税務/法人税節税2024.md",
        "title": "法人税の節税テクニック5選",
        "summary": "中小企業向けの節税方法",
        "content": "# 法人税の節税テクニック5選\n\n詳細な内容...",
        "destination": "studiofoods_hp",
        "tags": ["税務", "節税", "法人税"]
    }
]

upload_blog_ideas(ideas_to_upload)
```

---

## 注意事項

1. **重複防止**: `external_id` を一意に保つことで、同じファイルの再送信は更新として扱われ、重複作成されません
2. **バッチサイズ**: 一度に最大50件まで処理できます
3. **destination によるトピック自動判定**: 
   - `agri` または `agri_lp` → トピック `agri`
   - その他 → トピック `sidebusiness`
4. **タグの自動作成**: 存在しないタグ名を指定すると、自動的に作成されます
5. **既存データの保護**: external_id で管理されるため、既存の CSV アップロード由来のアイデアとは独立して管理されます

---

## デプロイとマイグレーション

### 1. データベースマイグレーション

```bash
# Ubuntu サーバー上で実行
cd /home/s-takahashi/development/ai-org
npm run pg:migrate
```

マイグレーションスクリプト: `migrations/pg/0004_blog_ideas_external.sql`

### 2. アプリケーションデプロイ

```bash
# Ubuntu サーバー上で実行
npm run deploy
```

### 3. API キーの設定

`.env` ファイルに API キーを追加（未設定の場合）:

```bash
API_KEYS="gemini|writer|your-secret-key-here"
```

または、既存の `AUTOMATION_INGEST_SECRET` が `admin` 権限で利用可能です。

---

## トラブルシューティング

### 401 Unauthorized

- API キーが正しく設定されているか確認
- ヘッダー名が `X-API-Key` であることを確認（大文字小文字区別あり）

### 400 Validation Error

- 必須フィールド（`external_id`, `title`, `destination`）が含まれているか確認
- `destination` の値が有効な選択肢であることを確認

### 413 Payload Too Large

- `ideas` 配列のサイズを50件以下に分割

### データが /blog-ideas ページに表示されない

- `topic` が正しく設定されているか確認（destination から自動判定）
- ブラウザでページをリロード（`revalidatePath` によるキャッシュクリアが反映されるまで数秒かかる場合があります）

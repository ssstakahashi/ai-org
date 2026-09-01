# agri-next-backend → ai-org 自動化 push パッチ

## 適用先

```text
/home/s-takahashi/development/agri-next-backend
```

## 前提（ai-org 側）

1. `AUTOMATION_INGEST_SECRET` を設定してデプロイ済み
2. `https://<ai-org-host>/api/internal/automation-ingest` へ `AUTOMATION_INGEST_SECRET` で認証して POST
3. D1 マイグレーション `0007_automation_ingest.sql` 適用済み

## コピーするファイル

このディレクトリから Ubuntu 上へ:

| このリポ | Ubuntu |
|---|---|
| `src/lib/ai-org-automation-catalog.ts` | `src/lib/ai-org-automation-catalog.ts` |
| `src/lib/report-automation-to-ai-org.ts` | `src/lib/report-automation-to-ai-org.ts` |
| `scripts/fetch-daily-news.ts` | `scripts/fetch-daily-news.ts`（上書き） |
| `scripts/summarize-daily-news-queue.ts` | `scripts/summarize-daily-news-queue.ts`（上書き） |
| `src/routes/internal-jobs.ts` | `src/routes/internal-jobs.ts`（上書き。差分だけの場合は PATCH-internal-jobs.md） |

## `.env` に追加

```bash
AI_ORG_AUTOMATION_INGEST_URL=https://<your-ai-org-host>/api/internal/automation-ingest
AI_ORG_AUTOMATION_INGEST_SECRET=<ai-org と同じシークレット>
```

## 適用コマンド例（Ubuntu）

```bash
cd /home/s-takahashi/development/agri-next-backend

# 例: scp / rsync で integrations/agri-next-backend 配下を同期したあと
pm2 restart agri-next-backend

# 疎通確認（カタログ＋ダミー run）
bun -e "
import { reportAutomationToAiOrg } from './src/lib/report-automation-to-ai-org.ts';
await reportAutomationToAiOrg({
  automationId: 'daily-news-rss-ingest',
  ok: true,
  startedAt: new Date(),
  finishedAt: new Date(),
  meta: { smoke: true },
});
console.log('done');
"
```

ai-org の `/automations` に `source=agri-next-backend` の行と稼働状態が出れば成功です。

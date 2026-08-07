/**
 * ai-org に登録する agri-next-backend 側カタログ（固定）。
 * 適用先: /home/s-takahashi/development/agri-next-backend/src/lib/ai-org-automation-catalog.ts
 */

export const AGRI_AUTOMATION_CATALOG = [
  {
    id: 'daily-news-rss-ingest',
    name: '日次ニュース RSS 取り込み',
    runner: 'program' as const,
    status: 'active' as const,
    trigger: 'crontab（例: 0 */6 * * *）',
    summary: 'RSS を取得し daily_news_summarize_queue に未掲載 URL を投入する（LLM なし）。',
    location: 'scripts/fetch-daily-news.ts → ingestDailyNewsRssToQueue',
  },
  {
    id: 'daily-news-summarize-queue',
    name: '日次ニュース要約キュー消化',
    runner: 'program' as const,
    status: 'active' as const,
    trigger: 'crontab（例: */2 * * * *）',
    summary: 'キュー先頭1件を LLM 要約し daily_news へ移す。',
    location: 'scripts/summarize-daily-news-queue.ts → summarizeNextDailyNewsQueueItem',
  },
  {
    id: 'purge-expired-task-record-drafts',
    name: '作業記録下書き TTL パージ',
    runner: 'program' as const,
    status: 'active' as const,
    trigger: 'POST /api/internal/jobs/purge-expired-task-record-drafts または DRAFT_TASK_RECORD_PURGE_INTERVAL_MS',
    summary: 'TTL 超過の is_draft 作業記録を削除する。',
    location: 'src/routes/internal-jobs.ts → purgeExpiredTaskRecordDrafts',
  },
];

/**
 * RSS を取得し `daily_news_summarize_queue` にだけ投入する CLI（Gemini は呼ばない）。
 *
 * 【適用】Ubuntu の scripts/fetch-daily-news.ts をこの内容で置き換える
 * または既存 main に reportAutomationToAiOrg 呼び出しを足す。
 */
import { ingestDailyNewsRssToQueue } from '../src/lib/fetch-and-summarize-daily-news';
import { reportAutomationToAiOrg } from '../src/lib/report-automation-to-ai-org';

async function main(): Promise<void> {
  const startedAt = new Date();
  try {
    const result = await ingestDailyNewsRssToQueue();
    console.log(JSON.stringify(result, null, 2));
    await reportAutomationToAiOrg({
      automationId: 'daily-news-rss-ingest',
      ok: Boolean(result.ok),
      startedAt,
      finishedAt: new Date(),
      error: result.ok ? null : JSON.stringify(result).slice(0, 2000),
      meta: result as unknown as Record<string, unknown>,
    });
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    await reportAutomationToAiOrg({
      automationId: 'daily-news-rss-ingest',
      ok: false,
      startedAt,
      finishedAt: new Date(),
      error: message,
    });
    process.exit(1);
  }
}

void main();

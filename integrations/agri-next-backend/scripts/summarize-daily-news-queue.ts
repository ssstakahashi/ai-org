/**
 * 要約キューから先頭 1 件を LLM で要約し `daily_news` に移す CLI。
 *
 * 【適用】Ubuntu の scripts/summarize-daily-news-queue.ts をこの内容で置き換える
 */
import { summarizeNextDailyNewsQueueItem } from '../src/lib/fetch-and-summarize-daily-news';
import { reportAutomationToAiOrg } from '../src/lib/report-automation-to-ai-org';

async function main(): Promise<void> {
  const startedAt = new Date();
  try {
    const result = await summarizeNextDailyNewsQueueItem();
    console.log(JSON.stringify(result, null, 2));
    await reportAutomationToAiOrg({
      automationId: 'daily-news-summarize-queue',
      ok: Boolean(result.ok),
      startedAt,
      finishedAt: new Date(),
      error: result.ok ? null : JSON.stringify(result).slice(0, 2000),
      meta: result as unknown as Record<string, unknown>,
    });
    if (!result.ok) {
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    await reportAutomationToAiOrg({
      automationId: 'daily-news-summarize-queue',
      ok: false,
      startedAt,
      finishedAt: new Date(),
      error: message,
    });
    process.exit(1);
  }
}

void main();

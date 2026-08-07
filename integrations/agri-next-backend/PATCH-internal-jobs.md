/**
 * internal-jobs.ts への追記パッチ（全文置換ではなく差分ガイド）。
 *
 * 適用先: /home/s-takahashi/development/agri-next-backend/src/routes/internal-jobs.ts
 *
 * 1) import を追加:
 *    import { reportAutomationToAiOrg } from '../lib/report-automation-to-ai-org';
 *
 * 2) POST /purge-expired-task-record-drafts の成功直後（return の前）に:
 *    await reportAutomationToAiOrg({
 *      automationId: 'purge-expired-task-record-drafts',
 *      ok: true,
 *      startedAt,
 *      finishedAt,
 *      meta: data as unknown as Record<string, unknown>,
 *    });
 *
 * 3) catch 内（Google Chat 通知のあと）に:
 *    await reportAutomationToAiOrg({
 *      automationId: 'purge-expired-task-record-drafts',
 *      ok: false,
 *      startedAt,
 *      finishedAt,
 *      error: fatalError,
 *    });
 *
 * 4) scheduleTaskRecordDraftPurgeIfEnabled の tick 成功 then 内に同様の ok:true report、
 *    catch 内に ok:false report。
 */
export {};

/**
 * 内部専用ジョブ API（Firebase 認証の外にマウントする）。
 *
 * 【適用】Ubuntu の src/routes/internal-jobs.ts をこのファイルで置き換え可能
 * （バックアップ時点の内容 + ai-org report 呼び出し）。
 *
 * Responsibility: スケジューラ・運用ツールから Bearer シークレットで起動するメンテナンス処理を提供する。
 */
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { notifyDraftPurgeGoogleChat } from '../lib/notify-draft-purge-google-chat';
import { purgeExpiredTaskRecordDrafts } from '../lib/purge-expired-task-record-drafts';
import { reportAutomationToAiOrg } from '../lib/report-automation-to-ai-org';

const internalJobsApp = new Hono();

/**
 * @description 下書きパージ用シークレットを返す。`INTERNAL_JOB_SECRET` を優先し、なければ `TASK_RECORD_DRAFT_PURGE_SECRET`。
 * @returns 非空文字列または undefined
 */
function getInternalJobSecret(): string | undefined {
  const a = process.env.INTERNAL_JOB_SECRET?.trim();
  if (a) return a;
  const b = process.env.TASK_RECORD_DRAFT_PURGE_SECRET?.trim();
  return b || undefined;
}

/**
 * @description Authorization Bearer または `X-Internal-Job-Secret` が環境変数と一致するか検証する。
 * @param c Hono コンテキスト
 * @returns 一致すれば true
 */
function verifyInternalJobAuth(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const secret = getInternalJobSecret();
  if (!secret) return false;
  const auth = c.req.header('Authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const x = c.req.header('X-Internal-Job-Secret')?.trim();
  const token = bearer || x;
  return token === secret;
}

/** 内部ジョブ共通。シークレット未設定は 503。不一致は 401。 */
const internalJobSecretMiddleware = createMiddleware(async (c, next) => {
  if (!getInternalJobSecret()) {
    return c.json(
      {
        error:
          'Server misconfiguration: set INTERNAL_JOB_SECRET (or TASK_RECORD_DRAFT_PURGE_SECRET) for internal jobs',
      },
      503
    );
  }
  if (!verifyInternalJobAuth(c)) {
    return c.json({ error: 'Unauthorized: invalid internal job credentials' }, 401);
  }
  await next();
});

internalJobsApp.use('*', internalJobSecretMiddleware);

/**
 * POST /purge-expired-task-record-drafts
 * TTL 超過の下書き作業記録を削除（ファイル→task_records）。詳細は `purgeExpiredTaskRecordDrafts`。
 */
internalJobsApp.post('/purge-expired-task-record-drafts', async (c) => {
  const startedAt = new Date();
  try {
    const data = await purgeExpiredTaskRecordDrafts();
    const finishedAt = new Date();
    await notifyDraftPurgeGoogleChat({
      trigger: 'api',
      startedAt,
      finishedAt,
      result: data,
    });
    await reportAutomationToAiOrg({
      automationId: 'purge-expired-task-record-drafts',
      ok: true,
      startedAt,
      finishedAt,
      meta: data as unknown as Record<string, unknown>,
    });
    return c.json({
      message: 'Purge completed',
      data,
    });
  } catch (err) {
    const finishedAt = new Date();
    const fatalError = err instanceof Error ? err.message : String(err);
    console.error('[internal-jobs] purge-expired-task-record-drafts failed:', err);
    await notifyDraftPurgeGoogleChat({
      trigger: 'api',
      startedAt,
      finishedAt,
      fatalError,
    });
    await reportAutomationToAiOrg({
      automationId: 'purge-expired-task-record-drafts',
      ok: false,
      startedAt,
      finishedAt,
      error: fatalError,
    });
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * @description 環境変数 `DRAFT_TASK_RECORD_PURGE_INTERVAL_MS`（ミリ秒、最低 60_000）が有効なとき、プロセス内でパージを定期実行する。
 * @description 複数レプリカでは二重実行になり得るため、本番は Cloud Scheduler 等で 1 回だけ叩く運用を推奨。
 */
export function scheduleTaskRecordDraftPurgeIfEnabled(): void {
  const raw = process.env.DRAFT_TASK_RECORD_PURGE_INTERVAL_MS?.trim();
  if (!raw) return;
  const ms = parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 60_000) {
    console.warn(
      '[internal-jobs] DRAFT_TASK_RECORD_PURGE_INTERVAL_MS is invalid or < 60000; skipping in-process scheduler'
    );
    return;
  }
  if (!getInternalJobSecret()) {
    console.warn(
      '[internal-jobs] DRAFT_TASK_RECORD_PURGE_INTERVAL_MS set but no INTERNAL_JOB_SECRET; skipping in-process scheduler'
    );
    return;
  }

  const tick = () => {
    const startedAt = new Date();
    void purgeExpiredTaskRecordDrafts()
      .then(async (result) => {
        const finishedAt = new Date();
        await notifyDraftPurgeGoogleChat({
          trigger: 'scheduler',
          startedAt,
          finishedAt,
          result,
        });
        await reportAutomationToAiOrg({
          automationId: 'purge-expired-task-record-drafts',
          ok: true,
          startedAt,
          finishedAt,
          meta: result as unknown as Record<string, unknown>,
        });
      })
      .catch(async (e) => {
        const finishedAt = new Date();
        const fatalError = e instanceof Error ? e.message : String(e);
        console.error('[internal-jobs] scheduled purge-expired-task-record-drafts error:', e);
        await notifyDraftPurgeGoogleChat({
          trigger: 'scheduler',
          startedAt,
          finishedAt,
          fatalError,
        });
        await reportAutomationToAiOrg({
          automationId: 'purge-expired-task-record-drafts',
          ok: false,
          startedAt,
          finishedAt,
          error: fatalError,
        });
      });
  };

  console.log('[internal-jobs] scheduling purge-expired-task-record-drafts every', ms, 'ms');
  setInterval(tick, ms);
  void tick();
}

export default internalJobsApp;

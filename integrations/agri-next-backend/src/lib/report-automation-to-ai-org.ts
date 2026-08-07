/**
 * ai-org へ自動化カタログ／実行結果を push する。
 * 適用先: /home/s-takahashi/development/agri-next-backend/src/lib/report-automation-to-ai-org.ts
 *
 * env:
 *   AI_ORG_AUTOMATION_INGEST_URL  … 例 https://ai-org.example.com/api/internal/automation-ingest
 *   AI_ORG_AUTOMATION_INGEST_SECRET … ai-org の AUTOMATION_INGEST_SECRET と同じ値
 */

import { AGRI_AUTOMATION_CATALOG } from './ai-org-automation-catalog';

export type AiOrgAutomationRun = {
  automationId: string;
  ok: boolean;
  startedAt: Date | string;
  finishedAt: Date | string;
  error?: string | null;
  meta?: Record<string, unknown>;
};

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * 失敗してもジョブ本体は落とさない（ログのみ）。
 */
export async function reportAutomationToAiOrg(run?: AiOrgAutomationRun): Promise<void> {
  const url = process.env.AI_ORG_AUTOMATION_INGEST_URL?.trim();
  const secret = process.env.AI_ORG_AUTOMATION_INGEST_SECRET?.trim();
  if (!url || !secret) {
    return;
  }

  const body: Record<string, unknown> = {
    source: 'agri-next-backend',
    automations: AGRI_AUTOMATION_CATALOG,
  };
  if (run) {
    body.run = {
      automationId: run.automationId,
      ok: run.ok,
      startedAt: toIso(run.startedAt),
      finishedAt: toIso(run.finishedAt),
      error: run.error ?? null,
      meta: run.meta,
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[ai-org-ingest] failed', res.status, text.slice(0, 500));
    }
  } catch (error) {
    console.error('[ai-org-ingest] network error', error);
  }
}

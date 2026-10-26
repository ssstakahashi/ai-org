import { LOCAL_SOURCE, recordAutomationRun } from "@/lib/automation-ingest";
import { getBoundEnv } from "@/lib/db";
import {
	isGoogleTasksSyncConfigured,
	syncGoogleTasks,
} from "@/lib/google-tasks-sync";

/**
 * @automation
 * id: x-due-cron
 * name: X 予約投稿（API・停止中）
 * runner: program
 * status: none
 * trigger: systemd timer（毎分）※API投稿は無効
 * summary: 有料X APIを使わない方針のため、CronからのAPI投稿は停止。予約分はスタジオフーズ広報（Grok Bot）がブラウザ経由で投稿する。
 * location: scripts/run-cron.ts → runXDueCron（no-op） / Grok Bot ルーチン「Xブラウザ投稿」
 * href: /x-schedule
 */
export async function runXDueCron() {
	const env = await getBoundEnv();
	const startedAt = new Date().toISOString();
	console.log("x-due-cron skipped: browser posting via Grok Bot (no X API)");
	await recordAutomationRun(env.DB, {
		source: LOCAL_SOURCE,
		automationId: "x-due-cron",
		ok: true,
		startedAt,
		finishedAt: new Date().toISOString(),
		error: null,
		meta: { skipped: true, reason: "browser_posting" },
	});
}

/**
 * @automation
 * id: google-tasks-sync-cron
 * name: Google Tasks と業務台帳を同期
 * runner: program
 * status: active
 * trigger: systemd timer（10分ごと）
 * summary: Google Tasks（全リストを取得、新規の台帳タスクはリスト ai-org へ）と業務台帳を双方向同期する。認証未設定なら何もしない。
 * location: scripts/run-cron.ts → runGoogleTasksCron → syncGoogleTasks
 * href: /
 */
export async function runGoogleTasksCron() {
	const env = await getBoundEnv();
	const startedAt = new Date().toISOString();
	if (!(await isGoogleTasksSyncConfigured(env))) {
		console.log("google-tasks-sync-cron skipped: auth not configured");
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "google-tasks-sync-cron",
			ok: true,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: null,
			meta: { skipped: true, reason: "not_configured" },
		});
		return;
	}

	try {
		const result = await syncGoogleTasks(env);
		const errorText = result.errors.join("; ").slice(0, 2000);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "google-tasks-sync-cron",
			ok: result.errors.length === 0,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: errorText || null,
			meta: {
				skipped: result.skipped,
				pulled: result.pulled,
				createdLocal: result.createdLocal,
				updatedLocal: result.updatedLocal,
				deletedLocal: result.deletedLocal,
				createdGoogle: result.createdGoogle,
				updatedGoogle: result.updatedGoogle,
				deletedGoogle: result.deletedGoogle,
				deferredGoogle: result.deferredGoogle,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("google-tasks-sync-cron failed", error);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "google-tasks-sync-cron",
			ok: false,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: message,
		});
	}
}

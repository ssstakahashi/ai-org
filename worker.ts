// OpenNext 生成ワーカーに scheduled を足すエントリ
// `.open-next/worker.js` はビルド時に生成される
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";
import { LOCAL_SOURCE, recordAutomationRun } from "./src/lib/automation-ingest";

export default {
	fetch: handler.fetch,

	/**
	 * @automation
	 * id: x-due-cron
	 * name: X 予約投稿（API・停止中）
	 * runner: program
	 * status: none
	 * trigger: Cloudflare Cron（毎分: * * * * *）※API投稿は無効
	 * summary: 有料X APIを使わない方針のため、CronからのAPI投稿は停止。予約分はスタジオフーズ広報（Grok Bot）がブラウザ経由で投稿する。
	 * location: worker.ts → scheduled（no-op） / Grok Bot ルーチン「Xブラウザ投稿」
	 * href: /x-schedule
	 */
	async scheduled(_controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
		ctx.waitUntil(
			(async () => {
				const startedAt = new Date().toISOString();
				// X API 投稿は停止。予約分は Grok Bot（スタジオフーズ広報）がブラウザで投稿する。
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
			})(),
		);
	},
} satisfies ExportedHandler<CloudflareEnv>;

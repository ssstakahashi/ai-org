// OpenNext 生成ワーカーに scheduled を足すエントリ
// `.open-next/worker.js` はビルド時に生成される
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";
import { LOCAL_SOURCE, recordAutomationRun } from "./src/lib/automation-ingest";
import { publishDueXPosts } from "./src/lib/publish-x-posts";

export default {
	fetch: handler.fetch,

	/**
	 * @automation
	 * id: x-due-cron
	 * name: X 予約投稿（期限到来分）
	 * runner: program
	 * status: active
	 * trigger: Cloudflare Cron（毎分: * * * * *）
	 * summary: status が「予約」かつ scheduled_at を過ぎた x_posts を最大20件、X API へ投稿する。成功で done、失敗で failed。
	 * location: worker.ts → publishDueXPosts / wrangler.jsonc triggers.crons
	 * href: /x-schedule
	 */
	async scheduled(_controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
		ctx.waitUntil(
			(async () => {
				const startedAt = new Date().toISOString();
				try {
					const result = await publishDueXPosts(env);
					console.log("publishDueXPosts", result);
					await recordAutomationRun(env.DB, {
						source: LOCAL_SOURCE,
						automationId: "x-due-cron",
						ok: result.failed === 0,
						startedAt,
						finishedAt: new Date().toISOString(),
						error:
							result.failed > 0
								? result.errors.map((e) => e.message).join("; ").slice(0, 2000)
								: null,
						meta: {
							attempted: result.attempted,
							succeeded: result.succeeded,
							failed: result.failed,
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.error("publishDueXPosts fatal", error);
					await recordAutomationRun(env.DB, {
						source: LOCAL_SOURCE,
						automationId: "x-due-cron",
						ok: false,
						startedAt,
						finishedAt: new Date().toISOString(),
						error: message,
					});
				}
			})(),
		);
	},
} satisfies ExportedHandler<CloudflareEnv>;

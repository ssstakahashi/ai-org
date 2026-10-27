/** middleware からも使えるよう、DB には接続しない。 */

const ENV_KEYS = [
	"APP_AUTH_PASSWORD",
	"APP_AUTH_SECRET",
	"X_API_KEY",
	"X_API_SECRET",
	"X_ACCESS_TOKEN",
	"X_ACCESS_TOKEN_SECRET",
	"X_BEARER_TOKEN",
	"AUTOMATION_INGEST_SECRET",
	"API_KEYS",
	"ALERT_WEBHOOK_URL",
	"BLOG_PUBLIC_INDEX_URL",
	"BLOG_PREAPPROVE_CHECKS",
	"BLOG_PUBLISH_GATE",
	"OLD_URL_REDIRECT_UNTIL",
	"GOOGLE_SERVICE_ACCOUNT_EMAIL",
	"GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
	"APP_PUBLIC_URL",
	"OPENCLAW_CONTROL_UI_URL",
	"CF_API_TOKEN",
	"CLOUDFLARE_API_TOKEN",
	"GEMINI_API_KEY",
	"GOOGLE_TASKS_IMPERSONATE_EMAIL",
	"GOOGLE_TASKS_CLIENT_ID",
	"GOOGLE_TASKS_CLIENT_SECRET",
	"GOOGLE_TASKS_REFRESH_TOKEN",
	"GOOGLE_TASKS_OAUTH_REDIRECT_URI",
	"GOOGLE_TASKS_LIST_ID",
	"GOOGLE_TASKS_LIST_TITLE",
	"GOOGLE_TASKS_DEFAULT_EMPLOYEE_ID",
	"BLOG_DRAFTS_SHEET_AUTO_SYNC",
	"CF_ACCOUNT_ID",
	"CF_ANALYTICS_ZONE_NAMES",
	"CF_ANALYTICS_ZONES",
	"CF_WORKER_NAME",
	"NEXTJS_ENV",
	"DATABASE_URL",
	"MEDIA_ROOT",
] as const satisfies readonly (keyof CloudflareEnv)[];

export function getAppEnv(): CloudflareEnv {
	const env: CloudflareEnv = {};
	for (const key of ENV_KEYS) {
		const value = process.env[key];
		if (value !== undefined) env[key] = value;
	}
	return env;
}

/** Workers の ctx.waitUntil の代わり。失敗はログだけ残す。 */
export function runInBackground(work: Promise<unknown>): void {
	void work.catch((error) => {
		console.error("background task failed", error);
	});
}

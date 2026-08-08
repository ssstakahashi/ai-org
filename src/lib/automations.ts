/**
 * 運用中の自動化カタログ。
 * Cursor Automations と、アプリ／インフラ側のプログラム実行を区別して管理する。
 *
 * 正本は各実装の `@automation` 注釈（規約: .cursor/rules/automation-annotation.mdc）。
 * 同期手順: .cursor/rules/automation-catalog-sync.mdc
 * 「自動化を抽出して」と依頼すると、注釈からこの配列を差分更新する。
 *
 * 外部アプリ分は D1 `remote_automations` に push され、表示時にマージする。
 */

export type AutomationRunner = "cursor" | "program" | "manual";

export type AutomationStatus = "active" | "none" | "manual";

export type AutomationEntry = {
	id: string;
	name: string;
	runner: AutomationRunner;
	status: AutomationStatus;
	/** 何がきっかけで動くか */
	trigger: string;
	/** 何をするか */
	summary: string;
	/** 実装・設定の所在 */
	location: string;
	/** 関連画面があれば */
	href?: string;
	/** 自アプリ固定カタログ用。リモート行は D1 の source を使う */
	source?: string;
};

export const LOCAL_AUTOMATION_SOURCE = "ai-org";

export const RUNNER_LABEL: Record<AutomationRunner, string> = {
	cursor: "Cursor 自動実行",
	program: "プログラム自動実行",
	manual: "手動実行（参考）",
};

export const RUNNER_HINT: Record<AutomationRunner, string> = {
	cursor:
		"Cursor Automations（Cloud Agent）。スケジュールや外部イベントでエージェントが起動し、指示どおり作業する。",
	program:
		"アプリ／インフラのコードが実行する。Cloudflare Workers Cron など、エージェントを介さない定型処理。",
	manual:
		"人が UI から明示的に押したときだけ動く。自動実行ではないが、同じ処理を手動で起動できる入口。",
};

export const STATUS_LABEL: Record<AutomationStatus, string> = {
	active: "稼働中",
	none: "未設定",
	manual: "手動のみ",
};

export const HEALTH_LABEL = {
	ok: "正常",
	degraded: "異常",
	unknown: "未実行",
} as const;

/**
 * @automation から同期される自アプリ一覧。
 * Cursor Automations はリポ外のため、未設定プレースホルダをここに置く。
 */
export const AUTOMATIONS: AutomationEntry[] = [
	{
		id: "x-due-cron",
		name: "X 予約投稿（期限到来分）",
		runner: "program",
		status: "active",
		trigger: "Cloudflare Cron（毎分: * * * * *）",
		summary:
			"status が「予約」かつ scheduled_at を過ぎた x_posts を最大20件、X API へ投稿する。成功で done、失敗で failed。",
		location: "worker.ts → publishDueXPosts / wrangler.jsonc triggers.crons",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	{
		id: "x-due-ui",
		name: "X 予約分をいま投稿",
		runner: "manual",
		status: "manual",
		trigger: "X投稿スケジュール画面のボタン",
		summary: "Cron と同じ publishDueXPosts を、人が押したタイミングで即実行する。",
		location: "RunDuePostsButton → runDueXPosts",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	{
		id: "x-sheet-sync-ui",
		name: "X 投稿をスプレッドシートへ同期",
		runner: "manual",
		status: "manual",
		trigger: "X投稿スケジュール画面のボタン",
		summary: "x_posts 全件を Google スプレッドシートへ upsert する（手動・一括同期）。",
		location: "SyncXPostsToSheetButton → syncXPostsToSheet",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	{
		id: "x-one-ui",
		name: "X へ単発投稿",
		runner: "manual",
		status: "manual",
		trigger: "予定一覧の行アクション「Xへ投稿」",
		summary: "指定の x_posts 1件を予約時刻を待たず投稿する（承認済・予約・失敗が対象）。",
		location: "XPostScheduleTable → postXPostNow → publishXPostNow",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	/**
	 * @automation
	 * id: cursor-automations
	 * name: Cursor Automations
	 * runner: cursor
	 * status: none
	 * trigger: 未設定（スケジュール／Git／Slack 等）
	 * summary: Cursor 上の Cloud Agent による自動実行。本リポジトリ向け Automation は現時点で未登録。
	 * location: Cursor Dashboard → Automations（リポジトリ外の設定）
	 */
	{
		id: "cursor-automations",
		name: "Cursor Automations",
		runner: "cursor",
		status: "none",
		trigger: "未設定（スケジュール／Git／Slack 等）",
		summary:
			"Cursor 上の Cloud Agent による自動実行。本リポジトリ向け Automation は現時点で未登録。追加する場合は Cursor の Automations から設定する。",
		location: "Cursor Dashboard → Automations（リポジトリ外の設定）",
		source: LOCAL_AUTOMATION_SOURCE,
	},
];

export function localAutomationsWithSource() {
	return AUTOMATIONS.map((entry) => ({
		...entry,
		source: entry.source ?? LOCAL_AUTOMATION_SOURCE,
	}));
}

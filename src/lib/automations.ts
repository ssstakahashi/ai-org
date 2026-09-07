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
		name: "X 予約投稿（API・停止中）",
		runner: "program",
		status: "none",
		trigger: "Cloudflare Cron（毎分）※API投稿は無効",
		summary:
			"有料X APIを使わない方針のため停止。予約分はスタジオフーズ広報（Grok Bot）がブラウザ経由で投稿する。",
		location: "worker.ts → scheduled（no-op） / Grok Bot ルーチン「Xブラウザ投稿」",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	{
		id: "x-due-ui",
		name: "X 予約分をいま投稿",
		runner: "manual",
		status: "manual",
		trigger: "X投稿スケジュール画面のボタン",
		summary: "API投稿停止中。押しても X API は呼ばない。予約はブラウザ投稿ルーチンが処理する。",
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
		summary: "API投稿停止中。予約はブラウザ投稿ルーチンが処理する。",
		location: "PostXPostNowButton → postXPostNow → publishXPostNow",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	{
		id: "app-requirements-cursor",
		name: "App 要件定義の自動実装",
		runner: "cursor",
		status: "none",
		trigger: "手動 / スケジュール（Cursor Automations で設定）",
		summary:
			"GET /api/internal/requirements から承認済み要件を Markdown で取得し、各 App の dev_folder リポで実装する。",
		location:
			"src/app/api/internal/requirements/route.ts → docs/cursor-automation-app-requirements.md",
		href: "/apps/requirements",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	/**
	 * @automation
	 * id: grokbot-x-browser-post
	 * name: X 予約投稿（ブラウザ・スタジオフーズ広報）
	 * runner: cursor
	 * status: active
	 * trigger: Grok Bot ルーチン（毎日 6:30・1日1回）
	 * summary: ai-org の x_posts で status=予約かつ scheduled_at 到来分を、ブラウザ操作で X に投稿し done にする。X API は使わない。
	 * location: Grok Bot ルーチン「Xブラウザ投稿」 + skill post-x-via-browser
	 * href: /x-schedule
	 */
	{
		id: "grokbot-x-browser-post",
		name: "X 予約投稿（ブラウザ・スタジオフーズ広報）",
		runner: "cursor",
		status: "active",
		trigger: "Grok Bot ルーチン（毎日 6:30・1日1回）",
		summary:
			"ai-org の x_posts で status=予約かつ scheduled_at 到来分を、ブラウザ操作で X に投稿し done にする。X API は使わない。",
		location:
			"Grok Bot ルーチン「Xブラウザ投稿」 → skill post-x-via-browser → /x-schedule",
		href: "/x-schedule",
		source: LOCAL_AUTOMATION_SOURCE,
	},
	/**
	 * @automation
	 * id: grokbot-studiofoods-blog-draft
	 * name: スタジオフーズ公式ブログ下書き（月水金）
	 * runner: cursor
	 * status: active
	 * trigger: Grok Bot ルーチン（毎週 月・水・金 9:00 JST）
	 * summary: テーマを5本一巡（AI社員→MIERU→SODATE→農業DX→バックオフィス）で選び、下書きまで進める。公開（コミット／push／デプロイ）前のみ確認。
	 * location: Grok Bot ルーチン「ブログ下書き（月水金）」 / studiofoods-public
	 * href: /apps/requirements
	 */
	{
		id: "grokbot-studiofoods-blog-draft",
		name: "スタジオフーズ公式ブログ下書き（月水金）",
		runner: "cursor",
		status: "active",
		trigger: "Grok Bot ルーチン（毎週 月・水・金 9:00 JST）",
		summary:
			"テーマを5本一巡（AI社員→MIERU→SODATE→農業DX→バックオフィス）で選び、下書きまで進める。公開（コミット／push／デプロイ）前のみ確認。次の1本は「AI社員に問い合わせ以外を任せる範囲の決め方」。",
		location:
			"Grok Bot ルーチン「ブログ下書き（月水金）」 → /Users/user/developer/01_Static_Site/studiofoods-public",
		href: "/apps/requirements",
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

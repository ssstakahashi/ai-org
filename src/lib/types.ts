export type TaskStatus = "draft" | "approved" | "scheduled" | "done" | "failed";

export type Employee = {
	id: string;
	name: string;
	role: string;
	/** 担当領域 */
	area: string;
	/** 職務権限 */
	authority: string;
	/** #rrggbb。空文字はデフォルト表示 */
	color: string;
	sort_order: number;
	created_at: string;
};

export type Category = {
	id: string;
	name: string;
	/** #rrggbb。空文字はデフォルト表示 */
	color: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type Tag = {
	id: string;
	name: string;
	/** #rrggbb。空文字はデフォルト表示 */
	color: string;
	created_at: string;
};

/** ページ台帳（カテゴリ・タグで分類） */
export type Page = {
	id: string;
	title: string;
	path: string;
	body: string;
	category_id: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type PageWithCategory = Page & {
	category_name: string | null;
	category_color: string | null;
	tags: Tag[];
};

/** 組織ルール（マスタ） */
export type OrgRule = {
	id: string;
	title: string;
	body: string;
	sort_order: number;
	/** 0=無効, 1=有効 */
	is_active: number;
	created_at: string;
	updated_at: string;
};

/** 職務権限表として固定表示する組織ルールの id */
export const AUTHORITY_ORG_RULE_ID = "rule-authority-matrix";

export type Task = {
	id: string;
	employee_id: string;
	title: string;
	body: string;
	image_key: string | null;
	status: TaskStatus;
	start_at: string | null;
	end_at: string | null;
	notes: string;
	category_id: string | null;
	created_at: string;
	updated_at: string;
};

export type TaskWithEmployee = Task & {
	employee_name: string;
	employee_role: string;
	employee_color: string;
	category_name: string | null;
	category_color: string | null;
	tags: Tag[];
};

/** X投稿（業務タスクとは別テーブル） */
export type XPost = {
	id: string;
	title: string;
	body: string;
	image_key: string | null;
	status: TaskStatus;
	scheduled_at: string | null;
	notes: string;
	x_post_id: string | null;
	last_error: string;
	created_at: string;
	updated_at: string;
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
	draft: "下書き",
	approved: "承認済",
	scheduled: "予約",
	done: "完了",
	failed: "失敗",
};

export const X_POST_STATUS_LABEL = TASK_STATUS_LABEL;

/** アプリケーション名マスタ */
export type AppName = {
	id: string;
	name: string;
	/** 背景色 #rrggbb。空文字はデフォルト表示 */
	color: string;
	/** テキスト色 #rrggbb。空文字は背景色またはデフォルト */
	text_color: string;
	/** 先頭表示用アイコン。空文字はなし */
	icon: string;
	app_group_id: string | null;
	app_group: string;
	app_group_color: string;
	app_group_text_color: string;
	app_group_icon: string;
	app_type_id: string | null;
	app_type: string;
	app_type_color: string;
	app_type_text_color: string;
	app_type_icon: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

/** アプリグループマスタ */
export type AppGroup = {
	id: string;
	name: string;
	/** 背景色 #rrggbb。空文字はデフォルト表示 */
	color: string;
	/** テキスト色 #rrggbb。空文字は背景色またはデフォルト */
	text_color: string;
	/** 先頭表示用アイコン。空文字はなし */
	icon: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

/** AppType マスタ */
export type AppType = {
	id: string;
	name: string;
	/** 背景色 #rrggbb。空文字はデフォルト表示 */
	color: string;
	/** テキスト色 #rrggbb。空文字は背景色またはデフォルト */
	text_color: string;
	/** 先頭表示用アイコン。空文字はなし */
	icon: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

/** アプリケーション開発・デプロイ App管理の1行 */
export type AppEntry = {
	id: string;
	sort_order: number;
	app_group_id: string | null;
	app_group: string;
	app_group_color: string;
	app_group_text_color: string;
	app_group_icon: string;
	app_name_id: string | null;
	name: string;
	name_color: string;
	name_text_color: string;
	name_icon: string;
	app_type_id: string | null;
	app_type: string;
	app_type_color: string;
	app_type_text_color: string;
	app_type_icon: string;
	dev_policy: string;
	dev_folder: string;
	frontend: string;
	css: string;
	backend: string;
	db: string;
	storage: string;
	port: string;
	auth: string;
	staging_url: string;
	hosting: string;
	production_url: string;
	owner: string;
	last_deployed_at: string;
	notes: string;
	created_at: string;
	updated_at: string;
};

export type AppCron = {
	id: string;
	sort_order: number;
	environment: string;
	schedule: string;
	kind: string;
	target: string;
	notes: string;
	created_at: string;
	updated_at: string;
};

export const APP_TYPE_OPTIONS = ["App", "個別App", "HP", "ブログ"] as const;
export const DEV_POLICY_OPTIONS = [
	"優先",
	"継続",
	"保留",
	"停止",
	"削除",
] as const;

export type DevPolicyOption = (typeof DEV_POLICY_OPTIONS)[number];

export type DevPolicyMeta = {
	icon: string;
	color: string;
	background: string;
};

export const DEV_POLICY_META: Record<DevPolicyOption, DevPolicyMeta> = {
	優先: { icon: "▲", color: "#9a3412", background: "#ffedd5" },
	継続: { icon: "●", color: "#166534", background: "#dcfce7" },
	保留: { icon: "■", color: "#854d0e", background: "#fef9c3" },
	停止: { icon: "◆", color: "#334155", background: "#e2e8f0" },
	削除: { icon: "×", color: "#991b1b", background: "#fee2e2" },
};

export function getDevPolicyMeta(value: string): DevPolicyMeta {
	if ((DEV_POLICY_OPTIONS as readonly string[]).includes(value)) {
		return DEV_POLICY_META[value as DevPolicyOption];
	}
	return { icon: "○", color: "#64748b", background: "#f1f5f9" };
}

/** アプリ名・グループ・AppType マスタで選べるアイコン */
export const APP_MASTER_ICONS = [
	"●",
	"○",
	"◆",
	"◇",
	"▲",
	"△",
	"■",
	"□",
	"★",
	"☆",
	"▶",
	"◀",
	"◎",
	"✦",
	"⬡",
	"⬢",
	"⌂",
	"⚙",
	"⚡",
	"☁",
] as const;

export function normalizeAppMasterIcon(raw: unknown): string {
	const value = String(raw ?? "").trim();
	if (!value) return "";
	if ((APP_MASTER_ICONS as readonly string[]).includes(value)) {
		return value;
	}
	throw new Error("アイコンの選択が不正です");
}

export function formatMasterLabel(name: string, icon?: string | null) {
	const mark = String(icon ?? "").trim();
	return mark ? `${mark} ${name}` : name;
}

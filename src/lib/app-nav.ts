export type AppNavLinkItem = {
	kind: "link";
	href: string;
	label: string;
	matchRoot?: boolean;
};

export type AppNavGroupItem = {
	kind: "group";
	id: string;
	label: string;
	children: AppNavLinkItem[];
};

export type AppNavItem = AppNavLinkItem | AppNavGroupItem | { kind: "apps" };

export type AppNavLayout = "bar" | "drawer";

export const APP_NAV: AppNavItem[] = [
	{ kind: "link", href: "/", label: "業務台帳", matchRoot: true },
	{ kind: "link", href: "/x-schedule", label: "X投稿スケジュール" },
	{ kind: "link", href: "/blog-drafts", label: "ブログ下書き" },
	{
		kind: "group",
		id: "info",
		label: "情報",
		children: [
			{ kind: "link", href: "/board", label: "掲示板" },
			{ kind: "link", href: "/accounting-manual", label: "会計マニュアル" },
		],
	},
	{ kind: "apps" },
	{
		kind: "group",
		id: "org",
		label: "組織",
		children: [
			{ kind: "link", href: "/employees", label: "従業員" },
			{ kind: "link", href: "/org-rules", label: "組織ルール" },
			{ kind: "link", href: "/automations", label: "自動化一覧" },
		],
	},
	{ kind: "link", href: "/pages", label: "ページ管理" },
];

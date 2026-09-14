export type AppNavItem =
	| { kind: "link"; href: string; label: string; matchRoot?: boolean }
	| { kind: "apps" };

export const APP_NAV: AppNavItem[] = [
	{ kind: "link", href: "/", label: "業務台帳", matchRoot: true },
	{ kind: "link", href: "/x-schedule", label: "X投稿スケジュール" },
	{ kind: "link", href: "/blog-drafts", label: "ブログ下書き" },
	{ kind: "link", href: "/board", label: "掲示板" },
	{ kind: "link", href: "/automations", label: "自動化一覧" },
	{ kind: "apps" },
	{ kind: "link", href: "/employees", label: "従業員" },
	{ kind: "link", href: "/org-rules", label: "組織ルール" },
	{ kind: "link", href: "/pages", label: "ページ管理" },
];

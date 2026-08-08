"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
	{ href: "/pages", label: "一覧", match: "exact" as const },
	{ href: "/pages/categories", label: "カテゴリ", match: "prefix" as const },
	{ href: "/pages/tags", label: "タグ", match: "prefix" as const },
];

export function PagesTabs() {
	const pathname = usePathname();

	return (
		<div className="view-tabs pages-tabs" role="tablist" aria-label="ページ管理の表示切替">
			{TABS.map((tab) => {
				const active =
					tab.match === "exact"
						? pathname === tab.href
						: pathname === tab.href || pathname.startsWith(`${tab.href}/`);
				return (
					<Link
						key={tab.href}
						href={tab.href}
						role="tab"
						aria-selected={active}
						className={active ? "view-tab active" : "view-tab"}
					>
						{tab.label}
					</Link>
				);
			})}
		</div>
	);
}

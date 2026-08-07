"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
	{ href: "/org-rules", label: "ルール一覧", match: "exact" as const },
	{
		href: "/org-rules/authority",
		label: "職務権限",
		match: "prefix" as const,
	},
];

export function OrgRulesTabs() {
	const pathname = usePathname();

	return (
		<div className="view-tabs apps-tabs" role="tablist" aria-label="組織ルールの表示切替">
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

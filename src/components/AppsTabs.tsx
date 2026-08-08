"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
	{ href: "/apps", label: "リスト", match: "exact" as const },
	{ href: "/apps/groups", label: "AppGroup", match: "prefix" as const },
	{ href: "/apps/names", label: "App", match: "prefix" as const },
	{ href: "/apps/types", label: "AppType", match: "prefix" as const },
];

export function AppsTabs() {
	const pathname = usePathname();

	return (
		<div className="view-tabs apps-tabs" role="tablist" aria-label="App管理の表示切替">
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

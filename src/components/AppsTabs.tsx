"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { APPS_TABS, saveAppsTab } from "@/lib/apps-tabs";

export function AppsTabs() {
	const pathname = usePathname();

	useEffect(() => {
		saveAppsTab(pathname);
	}, [pathname]);

	return (
		<div className="view-tabs apps-tabs" role="tablist" aria-label="App管理の表示切替">
			{APPS_TABS.map((tab) => {
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

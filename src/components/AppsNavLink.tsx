"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSavedAppsTab, isAppsSectionPath, saveAppsTab } from "@/lib/apps-tabs";

export function AppsNavLink() {
	const pathname = usePathname();
	const [href, setHref] = useState("/apps");

	useEffect(() => {
		setHref(getSavedAppsTab());
	}, []);

	useEffect(() => {
		if (!isAppsSectionPath(pathname)) return;
		saveAppsTab(pathname);
		setHref(getSavedAppsTab());
	}, [pathname]);

	const active = isAppsSectionPath(pathname);

	return (
		<Link
			href={href}
			className={active ? "app-nav-link active" : "app-nav-link"}
			aria-current={active ? "page" : undefined}
		>
			App管理
		</Link>
	);
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AppNavLink } from "@/components/AppNavLink";
import type { AppNavGroupItem, AppNavLayout } from "@/lib/app-nav";

type Props = {
	item: AppNavGroupItem;
	layout: AppNavLayout;
};

function pathMatches(pathname: string, href: string, matchRoot?: boolean) {
	if (matchRoot) return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavGroup({ item, layout }: Props) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const submenuId = useId();
	const active = item.children.some((child) =>
		pathMatches(pathname, child.href, child.matchRoot),
	);

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open || layout !== "bar") return;

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
		};

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKey, true);
		};
	}, [open, layout]);

	const links = item.children.map((child) => (
		<AppNavLink
			key={child.href}
			href={child.href}
			matchRoot={Boolean(child.matchRoot)}
		>
			{child.label}
		</AppNavLink>
	));

	if (layout === "drawer") {
		return (
			<div className="app-nav-group">
				<p className="app-nav-group-label">{item.label}</p>
				<div className="app-nav-submenu">{links}</div>
			</div>
		);
	}

	return (
		<div className="app-nav-group" ref={rootRef}>
			<button
				type="button"
				className={active ? "app-nav-link active" : "app-nav-link"}
				aria-expanded={open}
				aria-controls={submenuId}
				aria-haspopup="true"
				onClick={() => setOpen((value) => !value)}
			>
				{item.label}
			</button>
			{open ? (
				<div className="app-nav-submenu" id={submenuId}>
					{links}
				</div>
			) : null}
		</div>
	);
}

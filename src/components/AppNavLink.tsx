"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
	href: string;
	matchRoot: boolean;
	children: ReactNode;
};

export function AppNavLink({ href, matchRoot, children }: Props) {
	const pathname = usePathname();
	const active = matchRoot
		? pathname === href
		: pathname === href || pathname.startsWith(`${href}/`);

	return (
		<Link
			href={href}
			className={active ? "app-nav-link active" : "app-nav-link"}
			aria-current={active ? "page" : undefined}
		>
			{children}
		</Link>
	);
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppNavItems } from "@/components/AppNavItems";
import { LogoutButton } from "@/components/LogoutButton";
import { APP_VERSION } from "@/lib/app-version";

type Props = {
	logoutHref: string;
};

export function AppTopNav({ logoutHref }: Props) {
	const [open, setOpen] = useState(false);
	const drawerId = "app-sidedrawer";
	const navRef = useRef<HTMLDivElement>(null);
	const toggleRef = useRef<HTMLButtonElement>(null);
	const drawerRef = useRef<HTMLElement>(null);

	useLayoutEffect(() => {
		const nav = navRef.current;
		if (!nav) return;
		const sync = () => {
			document.documentElement.style.setProperty(
				"--app-topnav-height",
				`${nav.offsetHeight}px`,
			);
		};
		sync();
		const observer = new ResizeObserver(sync);
		observer.observe(nav);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!open) return;

		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			toggleRef.current?.focus();
		};

		document.addEventListener("keydown", onKey, true);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const first = drawerRef.current?.querySelector<HTMLElement>(
			"a.app-nav-link, button, a",
		);
		first?.focus();

		return () => {
			document.removeEventListener("keydown", onKey, true);
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	function closeMenu(restoreFocus = true) {
		setOpen(false);
		if (restoreFocus) {
			toggleRef.current?.focus();
		}
	}

	return (
		<>
			<div className="app-topnav" ref={navRef}>
				<div className="app-topnav-inner">
					<div className="app-topnav-start">
						<button
							ref={toggleRef}
							type="button"
							className={open ? "app-menu-toggle is-open" : "app-menu-toggle"}
							aria-expanded={open}
							aria-controls={drawerId}
							aria-label={open ? "メニューを閉じる" : "メニューを開く"}
							onClick={() => setOpen((value) => !value)}
						>
							<MenuIcon open={open} />
						</button>
						<div className="brand-wrap">
							<p className="brand">ai-org</p>
							<span className="brand-version">ver {APP_VERSION}</span>
						</div>
					</div>
					<div className="hero-actions">
						<nav className="app-nav" aria-label="主要メニュー">
							<AppNavItems />
						</nav>
						<LogoutButton href={logoutHref} />
					</div>
				</div>
			</div>
			<div
				className={
					open ? "app-sidedrawer-backdrop is-open" : "app-sidedrawer-backdrop"
				}
				onClick={() => closeMenu()}
				aria-hidden
			/>
			<aside
				ref={drawerRef}
				id={drawerId}
				className={open ? "app-sidedrawer is-open" : "app-sidedrawer"}
				aria-hidden={!open}
				aria-label="サイドメニュー"
				{...(!open ? { inert: true } : {})}
			>
				<div className="app-sidedrawer-head">
					<p className="app-sidedrawer-title">メニュー</p>
					<button
						type="button"
						className="app-menu-toggle"
						aria-label="メニューを閉じる"
						onClick={() => closeMenu()}
					>
						<MenuIcon open />
					</button>
				</div>
				<nav
					className="app-sidedrawer-nav"
					onClick={(event) => {
						const target = event.target as HTMLElement | null;
						if (target?.closest("a")) {
							closeMenu(false);
						}
					}}
				>
					<AppNavItems />
				</nav>
				<div className="app-sidedrawer-foot">
					<LogoutButton href={logoutHref} />
				</div>
			</aside>
		</>
	);
}

function MenuIcon({ open }: { open: boolean }) {
	return (
		<svg
			className="app-menu-icon"
			width={16}
			height={16}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			aria-hidden
		>
			{open ? (
				<>
					<path d="M4.5 4.5l7 7" />
					<path d="M11.5 4.5l-7 7" />
				</>
			) : (
				<>
					<path d="M3.5 5h9" />
					<path d="M3.5 8h9" />
					<path d="M3.5 11h9" />
				</>
			)}
		</svg>
	);
}

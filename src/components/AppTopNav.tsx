import { AppNavLink } from "@/components/AppNavLink";
import { AppsNavLink } from "@/components/AppsNavLink";
import { LogoutButton } from "@/components/LogoutButton";
import { APP_VERSION } from "@/lib/app-version";

type NavItem =
	| { kind: "link"; href: string; label: string; matchRoot?: boolean }
	| { kind: "apps" };

const NAV: NavItem[] = [
	{ kind: "link", href: "/", label: "業務台帳", matchRoot: true },
	{ kind: "link", href: "/x-schedule", label: "X投稿スケジュール" },
	{ kind: "link", href: "/automations", label: "自動化一覧" },
	{ kind: "apps" },
	{ kind: "link", href: "/employees", label: "従業員" },
	{ kind: "link", href: "/org-rules", label: "組織ルール" },
	{ kind: "link", href: "/pages", label: "ページ管理" },
];

type Props = {
	logoutHref: string;
};

export function AppTopNav({ logoutHref }: Props) {
	return (
		<div className="app-topnav">
			<div className="app-topnav-inner">
				<div className="brand-wrap">
					<p className="brand">ai-org</p>
					<span className="brand-version">ver {APP_VERSION}</span>
				</div>
				<div className="hero-actions">
					<nav className="app-nav" aria-label="主要メニュー">
						{NAV.map((item) =>
							item.kind === "apps" ? (
								<AppsNavLink key="apps" />
							) : (
								<AppNavLink
									key={item.href}
									href={item.href}
									matchRoot={Boolean(item.matchRoot)}
								>
									{item.label}
								</AppNavLink>
							),
						)}
					</nav>
					<LogoutButton href={logoutHref} />
				</div>
			</div>
		</div>
	);
}

import { AppNavLink } from "@/components/AppNavLink";
import { LogoutButton } from "@/components/LogoutButton";
import { APP_VERSION } from "@/lib/app-version";

const NAV: { href: string; label: string; matchRoot?: boolean }[] = [
	{ href: "/", label: "業務台帳", matchRoot: true },
	{ href: "/x-schedule", label: "X投稿スケジュール" },
	{ href: "/automations", label: "自動化一覧" },
	{ href: "/apps", label: "App管理" },
	{ href: "/employees", label: "従業員" },
	{ href: "/org-rules", label: "組織ルール" },
	{ href: "/categories", label: "カテゴリ" },
	{ href: "/tags", label: "タグ" },
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
						{NAV.map((item) => (
							<AppNavLink
								key={item.href}
								href={item.href}
								matchRoot={Boolean(item.matchRoot)}
							>
								{item.label}
							</AppNavLink>
						))}
					</nav>
					<LogoutButton href={logoutHref} />
				</div>
			</div>
		</div>
	);
}

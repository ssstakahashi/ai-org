import { AppNavLink } from "@/components/AppNavLink";
import { AppsNavLink } from "@/components/AppsNavLink";
import { APP_NAV } from "@/lib/app-nav";

export function AppNavItems() {
	return (
		<>
			{APP_NAV.map((item) =>
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
		</>
	);
}

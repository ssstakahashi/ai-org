import { AppNavGroup } from "@/components/AppNavGroup";
import { AppNavLink } from "@/components/AppNavLink";
import { AppsNavLink } from "@/components/AppsNavLink";
import { APP_NAV, type AppNavLayout } from "@/lib/app-nav";

type Props = {
	layout: AppNavLayout;
};

export function AppNavItems({ layout }: Props) {
	return (
		<>
			{APP_NAV.map((item) => {
				if (item.kind === "apps") {
					return <AppsNavLink key="apps" />;
				}
				if (item.kind === "group") {
					return <AppNavGroup key={item.id} item={item} layout={layout} />;
				}
				return (
					<AppNavLink
						key={item.href}
						href={item.href}
						matchRoot={Boolean(item.matchRoot)}
					>
						{item.label}
					</AppNavLink>
				);
			})}
		</>
	);
}

import {
	listAppGroups,
	listAppNames,
	listApps,
	listAppTypes,
} from "@/app/actions";
import { AppsSheet } from "@/components/AppsSheet";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
	const [apps, appGroups, appNames, appTypes] = await Promise.all([
		listApps(),
		listAppGroups(),
		listAppNames(),
		listAppTypes(),
	]);

	return (
		<AppsSheet
			apps={apps}
			appGroups={appGroups}
			appNames={appNames}
			appTypes={appTypes}
		/>
	);
}

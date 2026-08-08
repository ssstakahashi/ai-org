import { listAppGroups, listAppNames, listAppTypes } from "@/app/actions";
import { AppNamesManager } from "@/components/AppNamesManager";

export const dynamic = "force-dynamic";

export default async function AppNamesPage() {
	const [appNames, appGroups, appTypes] = await Promise.all([
		listAppNames(),
		listAppGroups(),
		listAppTypes(),
	]);

	return (
		<AppNamesManager
			appNames={appNames}
			appGroups={appGroups}
			appTypes={appTypes}
		/>
	);
}

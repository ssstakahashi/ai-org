import {
	listAppNames,
	listAppRequirementComments,
	listAppRequirements,
	listApps,
	listAppTestResults,
	listEmployees,
	listTags,
} from "@/app/actions";
import { AppRequirementsManager } from "@/components/AppRequirementsManager";
import type { AppEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function pickAppEntryForName(
	apps: AppEntry[],
	appNameId: string,
): AppEntry | undefined {
	const rows = apps.filter((app) => app.app_name_id === appNameId);
	if (rows.length === 0) return undefined;
	const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
	const withFolder = sorted.find((row) => row.dev_folder.trim());
	return withFolder ?? sorted[0];
}

export default async function AppRequirementsPage() {
	const [appNames, requirements, apps, testResults, tags, comments, employees] =
		await Promise.all([
			listAppNames(),
			listAppRequirements(),
			listApps(),
			listAppTestResults(),
			listTags(),
			listAppRequirementComments(),
			listEmployees(),
		]);

	const appEntryByAppNameId: Record<string, AppEntry> = {};
	for (const appName of appNames) {
		const entry = pickAppEntryForName(apps, appName.id);
		if (entry) {
			appEntryByAppNameId[appName.id] = entry;
		}
	}

	return (
		<AppRequirementsManager
			appNames={appNames}
			requirements={requirements}
			comments={comments}
			employees={employees}
			testResults={testResults}
			tags={tags}
			appEntryByAppNameId={appEntryByAppNameId}
		/>
	);
}

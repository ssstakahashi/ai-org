import { listAppNames, listAppRequirements } from "@/app/actions";
import { AppRequirementsManager } from "@/components/AppRequirementsManager";

export const dynamic = "force-dynamic";

export default async function AppRequirementsPage() {
	const [appNames, requirements] = await Promise.all([
		listAppNames(),
		listAppRequirements(),
	]);

	return (
		<AppRequirementsManager appNames={appNames} requirements={requirements} />
	);
}

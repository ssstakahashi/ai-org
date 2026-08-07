import { listAppNames } from "@/app/actions";
import { AppNamesManager } from "@/components/AppNamesManager";

export const dynamic = "force-dynamic";

export default async function AppNamesPage() {
	const appNames = await listAppNames();

	return <AppNamesManager appNames={appNames} />;
}

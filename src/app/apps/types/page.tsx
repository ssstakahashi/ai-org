import { listAppTypes } from "@/app/actions";
import { AppTypesManager } from "@/components/AppTypesManager";

export const dynamic = "force-dynamic";

export default async function AppTypesPage() {
	const appTypes = await listAppTypes();

	return <AppTypesManager appTypes={appTypes} />;
}

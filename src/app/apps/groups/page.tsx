import { listAppGroups } from "@/app/actions";
import { AppGroupsManager } from "@/components/AppGroupsManager";

export const dynamic = "force-dynamic";

export default async function AppGroupsPage() {
	const appGroups = await listAppGroups();

	return <AppGroupsManager appGroups={appGroups} />;
}

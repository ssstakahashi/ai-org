import {
	createAppGroup,
	deleteAppGroup,
	reorderAppGroups,
	updateAppGroup,
} from "@/app/actions";
import { AppMasterSheet } from "@/components/AppMasterSheet";
import type { AppGroup } from "@/lib/types";

type Props = {
	appGroups: AppGroup[];
};

export function AppGroupsManager({ appGroups }: Props) {
	return (
		<AppMasterSheet
			title="アプリグループ"
			items={appGroups}
			addPlaceholder="新しいアプリグループ"
			nameAriaLabel="アプリグループ"
			enableColor
			enableIcon
			createAction={createAppGroup}
			updateAction={updateAppGroup}
			deleteAction={deleteAppGroup}
			reorderAction={reorderAppGroups}
		/>
	);
}

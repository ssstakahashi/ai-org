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
			title="AppGroup"
			items={appGroups}
			addPlaceholder="新しい AppGroup"
			nameAriaLabel="AppGroup"
			enableColor
			enableIcon
			createAction={createAppGroup}
			updateAction={updateAppGroup}
			deleteAction={deleteAppGroup}
			reorderAction={reorderAppGroups}
		/>
	);
}

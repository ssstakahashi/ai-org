import {
	createAppType,
	deleteAppType,
	reorderAppTypes,
	updateAppType,
} from "@/app/actions";
import { AppMasterSheet } from "@/components/AppMasterSheet";
import type { AppType } from "@/lib/types";

type Props = {
	appTypes: AppType[];
};

export function AppTypesManager({ appTypes }: Props) {
	return (
		<AppMasterSheet
			title="AppType"
			items={appTypes}
			addPlaceholder="新しい AppType"
			nameAriaLabel="AppType"
			enableColor
			enableIcon
			createAction={createAppType}
			updateAction={updateAppType}
			deleteAction={deleteAppType}
			reorderAction={reorderAppTypes}
		/>
	);
}

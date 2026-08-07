import {
	createAppName,
	deleteAppName,
	reorderAppNames,
	updateAppName,
} from "@/app/actions";
import { AppMasterSheet } from "@/components/AppMasterSheet";
import type { AppName } from "@/lib/types";

type Props = {
	appNames: AppName[];
};

export function AppNamesManager({ appNames }: Props) {
	return (
		<AppMasterSheet
			title="アプリケーション名"
			items={appNames}
			addPlaceholder="新しいアプリケーション名"
			nameAriaLabel="アプリケーション名"
			enableColor
			enableIcon
			createAction={createAppName}
			updateAction={updateAppName}
			deleteAction={deleteAppName}
			reorderAction={reorderAppNames}
		/>
	);
}

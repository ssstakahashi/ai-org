import {
	createAppName,
	deleteAppName,
	reorderAppNames,
	updateAppName,
} from "@/app/actions";
import { AppMasterSheet } from "@/components/AppMasterSheet";
import {
	formatMasterLabel,
	type AppGroup,
	type AppName,
	type AppType,
} from "@/lib/types";

type Props = {
	appNames: AppName[];
	appGroups: AppGroup[];
	appTypes: AppType[];
};

function GroupSelect({
	formId,
	appGroups,
	defaultValue = "",
	fallbackLabel = "",
}: {
	formId?: string;
	appGroups: AppGroup[];
	defaultValue?: string;
	fallbackLabel?: string;
}) {
	return (
		<select
			form={formId}
			name="app_group_id"
			defaultValue={defaultValue}
			aria-label="アプリグループ"
		>
			<option value="">（未設定）</option>
			{appGroups.map((group) => (
				<option key={group.id} value={group.id}>
					{formatMasterLabel(group.name, group.icon)}
				</option>
			))}
			{defaultValue && !appGroups.some((item) => item.id === defaultValue) ? (
				<option value={defaultValue}>{fallbackLabel || "(不明)"}</option>
			) : null}
		</select>
	);
}

function TypeSelect({
	formId,
	appTypes,
	defaultValue = "",
	fallbackLabel = "",
}: {
	formId?: string;
	appTypes: AppType[];
	defaultValue?: string;
	fallbackLabel?: string;
}) {
	return (
		<select
			form={formId}
			name="app_type_id"
			defaultValue={defaultValue}
			aria-label="AppType"
		>
			<option value="">（未設定）</option>
			{appTypes.map((type) => (
				<option key={type.id} value={type.id}>
					{formatMasterLabel(type.name, type.icon)}
				</option>
			))}
			{defaultValue && !appTypes.some((item) => item.id === defaultValue) ? (
				<option value={defaultValue}>{fallbackLabel || "(不明)"}</option>
			) : null}
		</select>
	);
}

function GroupTypeSelects({
	appGroups,
	appTypes,
}: {
	appGroups: AppGroup[];
	appTypes: AppType[];
}) {
	return (
		<>
			<GroupSelect appGroups={appGroups} />
			<TypeSelect appTypes={appTypes} />
		</>
	);
}

export function AppNamesManager({ appNames, appGroups, appTypes }: Props) {
	return (
		<AppMasterSheet
			title="App"
			items={appNames}
			addPlaceholder="新しい App"
			nameAriaLabel="App"
			enableColor
			enableIcon
			extraColumns={{
				headers: ["アプリグループ", "AppType"],
				renderCreate: () => (
					<GroupTypeSelects appGroups={appGroups} appTypes={appTypes} />
				),
				renderRow: (item, formId) => {
					const appName = item as AppName;
					return (
						<>
							<td>
								<GroupSelect
									formId={formId}
									appGroups={appGroups}
									defaultValue={appName.app_group_id ?? ""}
									fallbackLabel={appName.app_group}
								/>
							</td>
							<td>
								<TypeSelect
									formId={formId}
									appTypes={appTypes}
									defaultValue={appName.app_type_id ?? ""}
									fallbackLabel={appName.app_type}
								/>
							</td>
						</>
					);
				},
			}}
			createAction={createAppName}
			updateAction={updateAppName}
			deleteAction={deleteAppName}
			reorderAction={reorderAppNames}
		/>
	);
}

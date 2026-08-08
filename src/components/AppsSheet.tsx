"use client";

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import {
	createApp,
	deleteApp,
	reorderApps,
	updateApp,
} from "@/app/actions";
import {
	DEV_POLICY_OPTIONS,
	formatMasterLabel,
	getDevPolicyMeta,
	type AppEntry,
	type AppGroup,
	type AppName,
	type AppType,
} from "@/lib/types";
import { masterTintStyle } from "@/lib/colors";

type Props = {
	apps: AppEntry[];
	appGroups: AppGroup[];
	appNames: AppName[];
	appTypes: AppType[];
};

const APP_HEADERS = [
	"並び",
	"グループ",
	"App",
	"AppType",
	"開発方針",
	"開発フォルダ",
	"フロント",
	"css",
	"バックエンド",
	"DB",
	"Storage",
	"PORT",
	"認証",
	"ステージングURL",
	"Hosting",
	"本番URL",
	"担当",
	"最終デプロイ日",
	"備考",
	"操作",
] as const;

const ALL = "__all__";
const EMPTY = "__empty__";

function withSortOrders<T extends { id: string; sort_order: number }>(items: T[]): T[] {
	return items.map((item, index) => ({
		...item,
		sort_order: (index + 1) * 10,
	}));
}

type FilterRowProps = {
	label: string;
	options: { value: string; label: string }[];
	value: string;
	onChange: (value: string) => void;
	renderOption?: (option: { value: string; label: string }) => ReactNode;
	optionStyle?: (option: { value: string; label: string }) => CSSProperties | undefined;
};

function FilterRow({
	label,
	options,
	value,
	onChange,
	renderOption,
	optionStyle,
}: FilterRowProps) {
	if (options.length === 0) return null;

	return (
		<div className="apps-filter-row">
			<p className="apps-filter-label">{label}</p>
			<div className="view-tabs" role="group" aria-label={label}>
				<button
					type="button"
					className={value === ALL ? "view-tab active" : "view-tab"}
					aria-pressed={value === ALL}
					onClick={() => onChange(ALL)}
				>
					すべて
				</button>
				{options.map((option) => {
					const active = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							className={active ? "view-tab active" : "view-tab"}
							aria-pressed={active}
							style={optionStyle?.(option)}
							onClick={() => onChange(option.value)}
						>
							{renderOption ? renderOption(option) : option.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

type DevPolicyFieldProps = {
	formId?: string;
	name?: string;
	defaultValue?: string;
	required?: boolean;
	className?: string;
};

function DevPolicyField({
	formId,
	name = "dev_policy",
	defaultValue = "",
	required = false,
	className,
}: DevPolicyFieldProps) {
	const [value, setValue] = useState(defaultValue);
	const meta = getDevPolicyMeta(value);

	return (
		<label
			className={["dev-policy-field", className].filter(Boolean).join(" ")}
			style={{ color: meta.color, background: meta.background }}
		>
			<span className="dev-policy-icon" aria-hidden="true">
				{meta.icon}
			</span>
			<select
				form={formId}
				name={name}
				required={required}
				value={value}
				aria-label="開発方針"
				onChange={(event) => setValue(event.target.value)}
			>
				<option value="">（未設定）</option>
				{DEV_POLICY_OPTIONS.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}

type AppNameSelectProps = {
	formId?: string;
	appNames: AppName[];
	defaultValue?: string;
	fallbackLabel?: string;
	required?: boolean;
	placeholder?: string;
};

function AppNameSelect({
	formId,
	appNames,
	defaultValue = "",
	fallbackLabel,
	required = false,
	placeholder = "アプリケーション名（必須）",
}: AppNameSelectProps) {
	const [value, setValue] = useState(defaultValue);
	const selected = appNames.find((item) => item.id === value);
	const icon = selected?.icon || "";

	return (
		<select
			form={formId}
			name="app_name_id"
			required={required}
			value={value}
			aria-label="App"
			style={masterTintStyle(selected?.color, selected?.text_color)}
			onChange={(event) => setValue(event.target.value)}
		>
			{!value ? (
				<option value="" disabled={required}>
					{placeholder}
				</option>
			) : null}
			{appNames.map((appName) => (
				<option key={appName.id} value={appName.id}>
					{formatMasterLabel(appName.name, appName.icon)}
				</option>
			))}
			{value && !appNames.some((item) => item.id === value) ? (
				<option value={value}>
					{formatMasterLabel(fallbackLabel || "(不明)", icon)}
				</option>
			) : null}
		</select>
	);
}

function MasterReadonlyCell({
	name,
	icon,
	color,
	textColor,
	fallback = "（未設定）",
}: {
	name: string;
	icon?: string;
	color?: string;
	textColor?: string;
	fallback?: string;
}) {
	if (!name) {
		return <span className="apps-master-readonly muted">{fallback}</span>;
	}
	return (
		<span
			className="apps-master-readonly"
			style={masterTintStyle(color, textColor)}
		>
			{formatMasterLabel(name, icon)}
		</span>
	);
}

export function AppsSheet({
	apps: initialApps,
	appGroups,
	appNames,
	appTypes,
}: Props) {
	const [apps, setApps] = useState(initialApps);
	const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
	const [dropTargetAppId, setDropTargetAppId] = useState<string | null>(null);
	const [reorderingApps, setReorderingApps] = useState(false);
	const [groupFilter, setGroupFilter] = useState(ALL);
	const [appTypeFilter, setAppTypeFilter] = useState(ALL);
	const [devPolicyFilter, setDevPolicyFilter] = useState(ALL);

	useEffect(() => {
		setApps(initialApps);
	}, [initialApps]);

	const groupOptions = useMemo(
		() => [
			...appGroups.map((group) => ({
				value: group.id,
				label: formatMasterLabel(group.name, group.icon),
			})),
			...(apps.some((app) => !app.app_group_id)
				? [{ value: EMPTY, label: "(未設定)" }]
				: []),
		],
		[appGroups, apps],
	);

	const appTypeOptions = useMemo(
		() => [
			...appTypes.map((type) => ({
				value: type.id,
				label: formatMasterLabel(type.name, type.icon),
			})),
			...(apps.some((app) => !app.app_type_id)
				? [{ value: EMPTY, label: "(未設定)" }]
				: []),
		],
		[appTypes, apps],
	);

	const devPolicyOptions = useMemo(() => {
		const seen = new Set<string>();
		const values: string[] = [];
		for (const option of DEV_POLICY_OPTIONS) {
			seen.add(option);
			values.push(option);
		}
		for (const app of apps) {
			const raw = app.dev_policy.trim();
			if (!raw || seen.has(raw)) continue;
			seen.add(raw);
			values.push(raw);
		}
		if (apps.some((app) => !app.dev_policy.trim())) {
			values.push("");
		}
		return values.map((value) => ({
			value: value === "" ? EMPTY : value,
			label: value === "" ? "(未設定)" : value,
		}));
	}, [apps]);

	const visibleApps = useMemo(() => {
		return apps.filter((app) => {
			if (groupFilter !== ALL) {
				if (groupFilter === EMPTY) {
					if (app.app_group_id) return false;
				} else if (app.app_group_id !== groupFilter) {
					return false;
				}
			}
			if (appTypeFilter !== ALL) {
				if (appTypeFilter === EMPTY) {
					if (app.app_type_id) return false;
				} else if (app.app_type_id !== appTypeFilter) {
					return false;
				}
			}
			if (devPolicyFilter !== ALL) {
				if (devPolicyFilter === EMPTY) {
					if (app.dev_policy.trim()) return false;
				} else if (app.dev_policy.trim() !== devPolicyFilter) {
					return false;
				}
			}
			return true;
		});
	}, [apps, groupFilter, appTypeFilter, devPolicyFilter]);

	const isFiltered =
		groupFilter !== ALL || appTypeFilter !== ALL || devPolicyFilter !== ALL;

	async function moveApp(sourceId: string, targetId: string) {
		if (sourceId === targetId || reorderingApps) return;

		const fromIndex = apps.findIndex((app) => app.id === sourceId);
		const toIndex = apps.findIndex((app) => app.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...apps];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		const ordered = withSortOrders(next);
		setApps(ordered);
		setReorderingApps(true);
		try {
			await reorderApps(ordered.map((app) => app.id));
		} catch (error) {
			setApps(initialApps);
			throw error;
		} finally {
			setReorderingApps(false);
		}
	}

	function onAppDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingAppId(id);
	}

	function onAppDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetAppId !== id) setDropTargetAppId(id);
	}

	async function onAppDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
		event.preventDefault();
		const sourceId = event.dataTransfer.getData("text/plain") || draggingAppId;
		setDraggingAppId(null);
		setDropTargetAppId(null);
		if (!sourceId) return;
		await moveApp(sourceId, targetId);
	}

	function onAppDragEnd() {
		setDraggingAppId(null);
		setDropTargetAppId(null);
	}

	return (
		<div className="master-grid">
			<section className="panel">
				<div className="panel-head">
					<h2>
						リスト（
						{isFiltered
							? `${visibleApps.length} / ${apps.length}`
							: apps.length}
						）
					</h2>
				</div>

				<div className="apps-filters">
					<FilterRow
						label="グループ"
						options={groupOptions}
						value={groupFilter}
						onChange={setGroupFilter}
						optionStyle={(option) => {
							if (option.value === EMPTY) return undefined;
							const group = appGroups.find((item) => item.id === option.value);
							return masterTintStyle(group?.color, group?.text_color);
						}}
					/>
					<FilterRow
						label="AppType"
						options={appTypeOptions}
						value={appTypeFilter}
						onChange={setAppTypeFilter}
						optionStyle={(option) => {
							if (option.value === EMPTY) return undefined;
							const type = appTypes.find((item) => item.id === option.value);
							return masterTintStyle(type?.color, type?.text_color);
						}}
					/>
					<FilterRow
						label="開発方針"
						options={devPolicyOptions}
						value={devPolicyFilter}
						onChange={setDevPolicyFilter}
						optionStyle={(option) => {
							if (option.value === EMPTY) return undefined;
							const meta = getDevPolicyMeta(option.value);
							return {
								color: meta.color,
								background: meta.background,
								borderColor: `color-mix(in srgb, ${meta.color} 30%, var(--line))`,
							};
						}}
						renderOption={(option) => {
							if (option.value === EMPTY) return option.label;
							const meta = getDevPolicyMeta(option.value);
							return (
								<span className="dev-policy-filter-label">
									<span aria-hidden="true">{meta.icon}</span>
									{option.label}
								</span>
							);
						}}
					/>
				</div>

				<form action={createApp} className="inline-add-form">
					<AppNameSelect appNames={appNames} required />
					<DevPolicyField className="dev-policy-field-inline" />
					<button type="submit" className="primary">
						行を追加
					</button>
				</form>
				<p className="field-hint apps-sheet-hint">
					グループと AppType は「アプリケーション名」タブで設定します。
				</p>

				{appNames.length === 0 ? (
					<p className="empty">
						先に「App」タブでマスタを追加してください。
					</p>
				) : apps.length === 0 ? (
					<p className="empty">
						まだアプリがありません。上のフォームから追加してください。
					</p>
				) : visibleApps.length === 0 ? (
					<p className="empty">条件に一致するアプリがありません。</p>
				) : (
					<div className="x-schedule-scroll">
						<p className="field-hint apps-sheet-hint">
							左のハンドルをドラッグして表示順を変更できます。
						</p>
						<table className="x-schedule-table apps-sheet-table">
							<thead>
								<tr>
									{APP_HEADERS.map((header) => (
										<th key={header}>{header}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{visibleApps.map((app) => {
									const formId = `app-edit-${app.id}`;
									const isDragging = draggingAppId === app.id;
									const isDropTarget =
										dropTargetAppId === app.id && draggingAppId !== app.id;
									return (
										<tr
											key={app.id}
											className={[
												isDragging ? "is-dragging" : "",
												isDropTarget ? "is-drop-target" : "",
											]
												.filter(Boolean)
												.join(" ")}
											onDragOver={(event) => onAppDragOver(event, app.id)}
											onDrop={(event) => void onAppDrop(event, app.id)}
											onDragLeave={() => {
												if (dropTargetAppId === app.id) setDropTargetAppId(null);
											}}
										>
											<td>
												<button
													type="button"
													className="apps-sheet-drag-handle"
													draggable={!reorderingApps}
													aria-label={`${app.name || "アプリ"} を並び替え`}
													title="ドラッグして並び替え"
													onDragStart={(event) => onAppDragStart(event, app.id)}
													onDragEnd={onAppDragEnd}
												>
													<span aria-hidden="true">⋮⋮</span>
												</button>
												<form id={formId} action={updateApp}>
													<input type="hidden" name="id" value={app.id} />
												</form>
											</td>
											<td>
												<MasterReadonlyCell
													name={app.app_group}
													icon={app.app_group_icon}
													color={app.app_group_color}
													textColor={app.app_group_text_color}
												/>
											</td>
											<td>
												<AppNameSelect
													formId={formId}
													appNames={appNames}
													defaultValue={app.app_name_id ?? ""}
													fallbackLabel={app.name || "(不明)"}
													required
													placeholder="選択してください"
												/>
											</td>
											<td>
												<MasterReadonlyCell
													name={app.app_type}
													icon={app.app_type_icon}
													color={app.app_type_color}
													textColor={app.app_type_text_color}
												/>
											</td>
											<td>
												<DevPolicyField
													formId={formId}
													defaultValue={app.dev_policy}
												/>
											</td>
											<td>
												<input
													form={formId}
													name="dev_folder"
													className="apps-sheet-wide"
													defaultValue={app.dev_folder}
													aria-label="開発フォルダ"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="frontend"
													defaultValue={app.frontend}
													aria-label="フロント"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="css"
													defaultValue={app.css}
													aria-label="css"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="backend"
													defaultValue={app.backend}
													aria-label="バックエンド"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="db"
													defaultValue={app.db}
													aria-label="DB"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="storage"
													defaultValue={app.storage}
													aria-label="Storage"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="port"
													className="apps-sheet-narrow"
													defaultValue={app.port}
													aria-label="PORT"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="auth"
													defaultValue={app.auth}
													aria-label="認証"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="staging_url"
													className="apps-sheet-wide"
													defaultValue={app.staging_url}
													aria-label="ステージングURL"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="hosting"
													defaultValue={app.hosting}
													aria-label="Hosting"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="production_url"
													className="apps-sheet-wide"
													defaultValue={app.production_url}
													aria-label="本番URL"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="owner"
													className="apps-sheet-narrow"
													defaultValue={app.owner}
													aria-label="担当"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="last_deployed_at"
													defaultValue={app.last_deployed_at}
													aria-label="最終デプロイ日"
												/>
											</td>
											<td>
												<input
													form={formId}
													name="notes"
													className="apps-sheet-wide"
													defaultValue={app.notes}
													aria-label="備考"
												/>
											</td>
											<td>
												<div className="task-actions">
													<button form={formId} type="submit">
														保存
													</button>
													<form action={deleteApp}>
														<input type="hidden" name="id" value={app.id} />
														<button type="submit" className="ghost">
															削除
														</button>
													</form>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}

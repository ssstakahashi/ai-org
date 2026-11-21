"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
	type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import {
	createAppRequirement,
	createAppTestResult,
	deleteAppRequirement,
	reorderAppNames,
	reorderAppRequirements,
	updateAppRequirement,
} from "@/app/actions";
import { masterTintStyle } from "@/lib/colors";
import { formatInAppTz } from "@/lib/timezone";
import { AppRequirementStatusButtons } from "@/components/AppRequirementStatusButtons";
import { AppRequirementStatusField } from "@/components/AppRequirementStatusField";
import {
	APP_TEST_OUTCOME_ICON,
	APP_TEST_OUTCOME_STYLE_CLASS,
	AppTestResultOutcomeField,
} from "@/components/AppTestResultOutcomeField";
import { AppRequirementComments } from "@/components/AppRequirementComments";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { StatusIcon } from "@/components/StatusIcon";
import {
	getAppRequirementsPrefs,
	saveAppRequirementsPrefs,
	type AppListSort,
	type RequirementListSort,
} from "@/lib/app-requirements-prefs";
import {
	APP_REQUIREMENT_STATUS_LABEL,
	formatMasterLabel,
	getDevPolicyMeta,
	APP_TEST_RESULT_OUTCOME_LABEL,
	type AppEntry,
	type AppName,
	type AppRequirementStatus,
	type AppRequirementComment,
	type AppRequirementWithApp,
	type AppTestResultWithApp,
	type Employee,
	type Tag,
	type TaskStatus,
} from "@/lib/types";

const REQUIREMENT_STATUS_CLASS: Record<AppRequirementStatus, string> = {
	draft: "status-draft",
	approved: "status-approved",
	in_progress: "status-scheduled",
	done: "status-done",
	cancelled: "status-failed",
};

const REQUIREMENT_STATUS_ICON: Record<AppRequirementStatus, TaskStatus> = {
	draft: "draft",
	approved: "approved",
	in_progress: "scheduled",
	done: "done",
	cancelled: "failed",
};

/** ステータス順: 未完了を上、完了・取消を下。同順位内は sort_order */
const REQUIREMENT_STATUS_SORT_RANK: Record<AppRequirementStatus, number> = {
	draft: 10,
	approved: 20,
	in_progress: 30,
	done: 80,
	cancelled: 90,
};

const STORED_UTC_RE =
	/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

function parseStoredUtc(value: string): Date | null {
	const trimmed = value.trim();
	const match = STORED_UTC_RE.exec(trimmed);
	if (match) {
		const [, year, month, day, hour, minute, second = "00"] = match;
		const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
		return Number.isNaN(date.getTime()) ? null : date;
	}
	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatRequirementTime(value: string | null): string {
	if (!value) return "";
	const date = parseStoredUtc(value);
	if (!date) return value;
	return formatInAppTz(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function sortRequirementsForDisplay(
	items: AppRequirementWithApp[],
	mode: RequirementListSort,
): AppRequirementWithApp[] {
	if (mode === "manual") return items;
	return [...items].sort((a, b) => {
		const byStatus =
			REQUIREMENT_STATUS_SORT_RANK[a.status] -
			REQUIREMENT_STATUS_SORT_RANK[b.status];
		if (byStatus !== 0) return byStatus;
		return a.sort_order - b.sort_order;
	});
}

function RequirementTagFields({
	requirement,
	tags,
}: {
	requirement?: AppRequirementWithApp;
	tags: Tag[];
}) {
	const selectedTagIds = new Set(requirement?.tags.map((tag) => tag.id) ?? []);

	return (
		<fieldset className="tag-fieldset">
			<legend>タグ</legend>
			{tags.length > 0 ? (
				<div className="tag-options">
					{tags.map((tag) => (
						<label
							key={tag.id}
							className="tag-option"
							style={masterTintStyle(tag.color, tag.text_color)}
						>
							<input
								type="checkbox"
								name="tag_ids"
								value={tag.id}
								defaultChecked={selectedTagIds.has(tag.id)}
							/>
							<span>{tag.name}</span>
						</label>
					))}
				</div>
			) : (
				<p className="field-hint">
					まだタグがありません。タグタブで追加するか、下の欄で新規作成できます。
				</p>
			)}
			<label className="new-tag-field">
				<span>新規タグ（カンマ区切りで追加）</span>
				<input name="new_tags" placeholder="例: UI, API" />
			</label>
		</fieldset>
	);
}

type Props = {
	appNames: AppName[];
	requirements: AppRequirementWithApp[];
	comments: AppRequirementComment[];
	employees: Employee[];
	testResults: AppTestResultWithApp[];
	tags: Tag[];
	appEntryByAppNameId: Record<string, AppEntry>;
};

export function AppRequirementsManager({
	appNames,
	requirements,
	comments,
	employees,
	testResults,
	tags,
	appEntryByAppNameId,
}: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
	const [detailing, setDetailing] = useState<AppRequirementWithApp | null>(null);
	const [editing, setEditing] = useState<AppRequirementWithApp | null>(null);
	const [orderedApps, setOrderedApps] = useState(appNames);
	const [selectedAppId, setSelectedAppId] = useState(
		appNames[0]?.id ?? "",
	);
	const [orderedItems, setOrderedItems] = useState<AppRequirementWithApp[]>([]);
	const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
	const [dropTargetAppId, setDropTargetAppId] = useState<string | null>(null);
	const [reorderingApps, setReorderingApps] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [reordering, setReordering] = useState(false);
	const [expandedAppDetailIds, setExpandedAppDetailIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [appListSort, setAppListSort] = useState<AppListSort>("manual");
	const [requirementListSort, setRequirementListSort] =
		useState<RequirementListSort>("status");
	const [hiddenAppIds, setHiddenAppIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [prefsReady, setPrefsReady] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const requirementCounts = useMemo(() => {
		const counts = new Map<
			string,
			{ total: number; done: number; open: number }
		>();
		for (const item of requirements) {
			const current = counts.get(item.app_name_id) ?? {
				total: 0,
				done: 0,
				open: 0,
			};
			current.total += 1;
			if (item.status === "done") {
				current.done += 1;
			} else {
				current.open += 1;
			}
			counts.set(item.app_name_id, current);
		}
		return counts;
	}, [requirements]);

	const testResultsByRequirementId = useMemo(() => {
		const grouped = new Map<string, AppTestResultWithApp[]>();
		for (const result of testResults) {
			if (!result.requirement_id) continue;
			const list = grouped.get(result.requirement_id) ?? [];
			list.push(result);
			grouped.set(result.requirement_id, list);
		}
		for (const list of grouped.values()) {
			list.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
		}
		return grouped;
	}, [testResults]);

	const commentsByRequirementId = useMemo(() => {
		const grouped = new Map<string, AppRequirementComment[]>();
		for (const comment of comments) {
			const list = grouped.get(comment.requirement_id) ?? [];
			list.push(comment);
			grouped.set(comment.requirement_id, list);
		}
		return grouped;
	}, [comments]);

	const canReorderApps = appListSort === "manual" && !reorderingApps;
	const canReorderRequirements =
		requirementListSort === "manual" && !reordering;

	const sortedApps = useMemo(() => {
		if (appListSort === "manual") return orderedApps;
		const indexById = new Map(
			orderedApps.map((app, index) => [app.id, index] as const),
		);
		const direction = appListSort === "count-desc" ? -1 : 1;
		return [...orderedApps].sort((a, b) => {
			const countDiff =
				(requirementCounts.get(a.id)?.total ?? 0) -
				(requirementCounts.get(b.id)?.total ?? 0);
			if (countDiff !== 0) return countDiff * direction;
			return (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0);
		});
	}, [appListSort, orderedApps, requirementCounts]);

	const displayedApps = useMemo(
		() => sortedApps.filter((app) => !hiddenAppIds.has(app.id)),
		[hiddenAppIds, sortedApps],
	);

	const hiddenCount = orderedApps.length - displayedApps.length;

	const filterGroups = useMemo(() => {
		const groups: { key: string; label: string; apps: AppName[] }[] = [];
		const index = new Map<string, { key: string; label: string; apps: AppName[] }>();
		for (const app of orderedApps) {
			const key = app.app_group_id ?? "__none__";
			let group = index.get(key);
			if (!group) {
				group = {
					key,
					label: app.app_group.trim() || "未分類",
					apps: [],
				};
				index.set(key, group);
				groups.push(group);
			}
			group.apps.push(app);
		}
		return groups;
	}, [orderedApps]);

	useEffect(() => {
		const prefs = getAppRequirementsPrefs();
		setAppListSort(prefs.sort);
		setRequirementListSort(prefs.requirementListSort);
		setHiddenAppIds(new Set(prefs.hiddenAppIds));
		setPrefsReady(true);
	}, []);

	useEffect(() => {
		if (!prefsReady) return;
		saveAppRequirementsPrefs(
			{
				sort: appListSort,
				requirementListSort,
				hiddenAppIds: [...hiddenAppIds],
			},
			orderedApps.map((app) => app.id),
		);
	}, [appListSort, requirementListSort, hiddenAppIds, orderedApps, prefsReady]);

	useEffect(() => {
		setOrderedApps(appNames);
	}, [appNames]);

	useEffect(() => {
		if (displayedApps.length === 0) return;
		if (!selectedAppId || !displayedApps.some((app) => app.id === selectedAppId)) {
			setSelectedAppId(displayedApps[0].id);
		}
	}, [displayedApps, selectedAppId]);

	const filteredFromProps = useMemo(
		() =>
			selectedAppId &&
			displayedApps.some((app) => app.id === selectedAppId)
				? requirements.filter((item) => item.app_name_id === selectedAppId)
				: [],
		[displayedApps, requirements, selectedAppId],
	);

	useEffect(() => {
		setOrderedItems(filteredFromProps);
	}, [filteredFromProps]);

	const displayedRequirementItems = useMemo(
		() => sortRequirementsForDisplay(orderedItems, requirementListSort),
		[orderedItems, requirementListSort],
	);

	const selectedApp = displayedApps.find((item) => item.id === selectedAppId);
	const selectedCount = selectedAppId
		? (requirementCounts.get(selectedAppId) ?? {
				total: 0,
				done: 0,
				open: 0,
			})
		: { total: 0, done: 0, open: 0 };

	function openCreateDialog() {
		setCreateFormKey((value) => value + 1);
		createDialogRef.current?.showModal();
	}

	function closeCreateDialog() {
		createDialogRef.current?.close();
	}

	const closeDetailDialog = useCallback(() => {
		detailDialogRef.current?.close();
		setDetailing(null);
	}, []);

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

	function openDetailDialog(item: AppRequirementWithApp) {
		flushSync(() => {
			setDetailing(item);
		});
		detailDialogRef.current?.showModal();
	}

	function openEditDialog(item: AppRequirementWithApp) {
		flushSync(() => {
			setEditing(item);
			setEditFormKey((value) => value + 1);
		});
		editDialogRef.current?.showModal();
	}

	function openEditFromDetail() {
		if (!detailing) return;
		const item = detailing;
		closeDetailDialog();
		openEditDialog(item);
	}

	const handleCreate = useCallback(
		async (formData: FormData) => {
			await createAppRequirement(formData);
			closeCreateDialog();
			router.refresh();
		},
		[router],
	);

	const handleUpdate = useCallback(
		async (formData: FormData) => {
			await updateAppRequirement(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	const handleDelete = useCallback(
		async (formData: FormData) => {
			await deleteAppRequirement(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	async function moveApp(sourceId: string, targetId: string) {
		if (sourceId === targetId || reorderingApps || appListSort !== "manual") return;

		const fromIndex = orderedApps.findIndex((item) => item.id === sourceId);
		const toIndex = orderedApps.findIndex((item) => item.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...orderedApps];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		setOrderedApps(next);
		setReorderingApps(true);
		try {
			await reorderAppNames(next.map((item) => item.id));
		} catch (error) {
			setOrderedApps(appNames);
			throw error;
		} finally {
			setReorderingApps(false);
		}
	}

	async function moveRequirement(sourceId: string, targetId: string) {
		if (
			sourceId === targetId ||
			reordering ||
			requirementListSort !== "manual"
		) {
			return;
		}

		const fromIndex = orderedItems.findIndex((item) => item.id === sourceId);
		const toIndex = orderedItems.findIndex((item) => item.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...orderedItems];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		setOrderedItems(next);
		setReordering(true);
		try {
			await reorderAppRequirements(next.map((item) => item.id));
		} catch (error) {
			setOrderedItems(filteredFromProps);
			throw error;
		} finally {
			setReordering(false);
		}
	}

	function onAppDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		if (appListSort !== "manual") {
			event.preventDefault();
			return;
		}
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingAppId(id);
	}

	function onAppDragOver(event: DragEvent<HTMLLIElement>, id: string) {
		if (appListSort !== "manual") return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetAppId !== id) setDropTargetAppId(id);
	}

	async function onAppDrop(event: DragEvent<HTMLLIElement>, targetId: string) {
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

	function onDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		if (requirementListSort !== "manual") {
			event.preventDefault();
			return;
		}
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingId(id);
	}

	function onDragOver(event: DragEvent<HTMLLIElement>, id: string) {
		if (requirementListSort !== "manual") return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetId !== id) setDropTargetId(id);
	}

	async function onDrop(event: DragEvent<HTMLLIElement>, targetId: string) {
		event.preventDefault();
		const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
		setDraggingId(null);
		setDropTargetId(null);
		if (!sourceId) return;
		await moveRequirement(sourceId, targetId);
	}

	function onDragEnd() {
		setDraggingId(null);
		setDropTargetId(null);
	}

	function toggleAppDetail(appId: string) {
		setExpandedAppDetailIds((current) => {
			const next = new Set(current);
			if (next.has(appId)) {
				next.delete(appId);
			} else {
				next.add(appId);
			}
			return next;
		});
	}

	function setAppVisible(appId: string, visible: boolean) {
		setHiddenAppIds((current) => {
			const next = new Set(current);
			if (visible) next.delete(appId);
			else next.add(appId);
			return next;
		});
	}

	function setGroupVisible(apps: AppName[], visible: boolean) {
		setHiddenAppIds((current) => {
			const next = new Set(current);
			for (const app of apps) {
				if (visible) next.delete(app.id);
				else next.add(app.id);
			}
			return next;
		});
	}

	function showAllApps() {
		setHiddenAppIds(new Set());
	}

	function hideAllApps() {
		setHiddenAppIds(new Set(orderedApps.map((app) => app.id)));
	}

	function applyRequirementStatusUpdate(
		id: string,
		status: AppRequirementStatus,
	) {
		setOrderedItems((items) =>
			items.map((item) => (item.id === id ? { ...item, status } : item)),
		);
	}

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<h2>
						要件定義
						{selectedApp ? (
							<span
								className="requirement-head-meta apps-master-readonly"
								style={masterTintStyle(
									selectedApp.color,
									selectedApp.text_color,
								)}
							>
								{formatMasterLabel(selectedApp.name, selectedApp.icon)}（
								{selectedCount.total === 0
									? "0件"
									: `未完了 ${selectedCount.open} / 完了 ${selectedCount.done}`}
								）
							</span>
						) : null}
					</h2>
					{selectedApp ? (
						<button type="button" className="primary" onClick={openCreateDialog}>
							新規登録
						</button>
					) : null}
				</div>
				<p className="panel-lede">
					左の App 一覧から選択して要件を編集します。タイトルをクリックすると詳細が開き、本文は
					Markdown プレビューで表示されます。フッターの編集から内容を変更できます。一覧ではステータスをボタンで直接変更できます。記録日時を出し、完了したものは完了日時も出します。完了と判定された要件には、その場でテスト結果を記載できます。
					ステータスが「承認済」の要件は Cursor Automation から export できます。要件一覧はデフォルトでステータス順（完了は下）に並びます。左の
					App 一覧は表示順・件数が多い順・少ない順で並び替えでき、絞り込みで表示する App
					を選べます。並び順と絞り込みはこのブラウザに保存されます。表示順のときは左のハンドルで
					App の表示順、一覧のハンドルで要件の表示順を変更できます。
				</p>

				{orderedApps.length === 0 ? (
					<p className="empty">
						App マスタがありません。先に App タブで App を登録してください。
					</p>
				) : (
					<div className="requirement-layout">
						<aside className="requirement-app-sidebar">
							<div className="requirement-sidebar-head">
								<p className="requirement-sidebar-label">App</p>
								<label className="requirement-app-sort-field">
									<span className="sr-only">並び替え</span>
									<select
										className="requirement-app-sort"
										value={appListSort}
										aria-label="Appの並び替え"
										onChange={(event) =>
											setAppListSort(event.target.value as AppListSort)
										}
									>
										<option value="manual">表示順</option>
										<option value="count-desc">件数が多い順</option>
										<option value="count-asc">件数が少ない順</option>
									</select>
								</label>
							</div>
							<div className="requirement-app-filter">
								<button
									type="button"
									className={
										filterOpen || hiddenCount > 0
											? "requirement-app-filter-toggle is-active"
											: "requirement-app-filter-toggle"
									}
									aria-expanded={filterOpen}
									aria-controls="requirement-app-filter-panel"
									onClick={() => setFilterOpen((open) => !open)}
								>
									<span>絞り込み</span>
									<span className="requirement-app-filter-summary">
										{displayedApps.length}/{orderedApps.length}
									</span>
								</button>
								{filterOpen ? (
									<div
										id="requirement-app-filter-panel"
										className="requirement-app-filter-panel"
									>
										<div className="requirement-app-filter-actions">
											<button type="button" onClick={showAllApps}>
												全選択
											</button>
											<button type="button" onClick={hideAllApps}>
												全解除
											</button>
											<button type="button" onClick={showAllApps}>
												リセット
											</button>
										</div>
										<ul className="requirement-app-filter-groups">
											{filterGroups.map((group) => {
												const visibleInGroup = group.apps.filter(
													(app) => !hiddenAppIds.has(app.id),
												).length;
												const groupChecked =
													visibleInGroup === group.apps.length;
												const groupIndeterminate =
													visibleInGroup > 0 &&
													visibleInGroup < group.apps.length;
												return (
													<li
														key={group.key}
														className="requirement-app-filter-group"
													>
														<label className="requirement-app-filter-group-label">
															<IndeterminateCheckbox
																checked={groupChecked}
																indeterminate={groupIndeterminate}
																ariaLabel={`${group.label} をまとめて表示`}
																onChange={(visible) =>
																	setGroupVisible(group.apps, visible)
																}
															/>
															<span>{group.label}</span>
															<span className="requirement-app-filter-group-count">
																{visibleInGroup}/{group.apps.length}
															</span>
														</label>
														<ul className="requirement-app-filter-apps">
															{group.apps.map((app) => {
																const visible = !hiddenAppIds.has(app.id);
																return (
																	<li key={app.id}>
																		<label className="requirement-app-filter-app">
																			<input
																				type="checkbox"
																				checked={visible}
																				onChange={(event) =>
																					setAppVisible(
																						app.id,
																						event.target.checked,
																					)
																				}
																			/>
																			<span
																				className="apps-master-readonly"
																				style={masterTintStyle(
																					app.color,
																					app.text_color,
																				)}
																			>
																				{formatMasterLabel(
																					app.name,
																					app.icon,
																				)}
																			</span>
																		</label>
																	</li>
																);
															})}
														</ul>
													</li>
												);
											})}
										</ul>
									</div>
								) : null}
							</div>
							{displayedApps.length === 0 ? (
								<p className="requirement-app-filter-empty">
									表示する App がありません。絞り込みを変更してください。
								</p>
							) : null}
							<ul
								className="requirement-app-list"
								role="tablist"
								aria-label="App の選択"
							>
								{displayedApps.map((app) => {
									const active = app.id === selectedAppId;
									const count = requirementCounts.get(app.id) ?? {
										total: 0,
										done: 0,
										open: 0,
									};
									const appEntry = appEntryByAppNameId[app.id];
									const devPolicy =
										appEntry?.dev_policy.trim() ?? "";
									const devPolicyMeta = devPolicy
										? getDevPolicyMeta(devPolicy)
										: null;
									const detailExpanded = expandedAppDetailIds.has(app.id);
									const isDragging = draggingAppId === app.id;
									const isDropTarget =
										dropTargetAppId === app.id && draggingAppId !== app.id;
									return (
										<li
											key={app.id}
											className={[
												"requirement-app-item",
												active ? "active" : "",
												isDragging ? "is-dragging" : "",
												isDropTarget ? "is-drop-target" : "",
												canReorderApps ? "" : "is-sort-locked",
											]
												.filter(Boolean)
												.join(" ")}
											onDragOver={(event) => onAppDragOver(event, app.id)}
											onDrop={(event) => void onAppDrop(event, app.id)}
											onDragLeave={() => {
												if (dropTargetAppId === app.id) {
													setDropTargetAppId(null);
												}
											}}
										>
											<button
												type="button"
												className="apps-sheet-drag-handle requirement-app-drag-handle"
												draggable={canReorderApps}
												disabled={!canReorderApps}
												aria-label={`${app.name} の表示順を変更`}
												title={
													canReorderApps
														? "ドラッグして App の表示順を変更"
														: "件数順のときは表示順に戻すとドラッグできます"
												}
												onDragStart={(event) => onAppDragStart(event, app.id)}
												onDragEnd={onAppDragEnd}
											>
												<span aria-hidden="true">⋮⋮</span>
											</button>
											<div className="requirement-app-content">
												<button
													type="button"
													role="tab"
													aria-selected={active}
													className="requirement-app-select"
													onClick={() => setSelectedAppId(app.id)}
												>
													<span
														className="requirement-app-name apps-master-readonly"
														style={masterTintStyle(app.color, app.text_color)}
													>
														{formatMasterLabel(app.name, app.icon)}
													</span>
													<span
														className="requirement-app-count"
														title={`未完了 ${count.open} / 完了 ${count.done}`}
														aria-label={`未完了 ${count.open}件、完了 ${count.done}件`}
													>
														{count.total === 0
															? "0"
															: `未${count.open}・完${count.done}`}
													</span>
												</button>
												{devPolicyMeta ? (
													<span
														className="requirement-app-dev-policy"
														style={{ color: devPolicyMeta.color }}
													>
														<span aria-hidden="true">
															{devPolicyMeta.icon}
														</span>
														{devPolicy}
													</span>
												) : null}
												<button
													type="button"
													className="requirement-app-accordion-toggle"
													aria-expanded={detailExpanded}
													aria-controls={`requirement-app-detail-${app.id}`}
													onClick={(event) => {
														event.stopPropagation();
														toggleAppDetail(app.id);
													}}
												>
													<span
														className="requirement-app-accordion-chevron"
														aria-hidden="true"
													>
														▶
													</span>
													<span>詳細</span>
												</button>
												{detailExpanded ? (
													<div
														id={`requirement-app-detail-${app.id}`}
														className="requirement-app-accordion-panel"
													>
														<RequirementAppDetailPanel
															app={app}
															entry={appEntry}
														/>
													</div>
												) : null}
											</div>
										</li>
									);
								})}
							</ul>
						</aside>

						<div className="requirement-main">
							{displayedApps.length === 0 ? (
								<p className="empty">
									表示する App がありません。左の絞り込みを変更してください。
								</p>
							) : null}

							{selectedApp && orderedItems.length === 0 ? (
								<p className="empty">
									{formatMasterLabel(selectedApp.name, selectedApp.icon)}{" "}
									の要件はまだありません。「新規登録」から追加してください。
								</p>
							) : null}

							{orderedItems.length > 0 ? (
								<div className="requirement-list-toolbar">
									<label className="requirement-app-sort-field">
										<span className="requirement-list-sort-label">要件の並び</span>
										<select
											className="requirement-app-sort"
											value={requirementListSort}
											aria-label="要件の並び替え"
											onChange={(event) =>
												setRequirementListSort(
													event.target.value as RequirementListSort,
												)
											}
										>
											<option value="status">
												ステータス順（完了は下）
											</option>
											<option value="manual">表示順</option>
										</select>
									</label>
								</div>
							) : null}

							{displayedRequirementItems.length > 0 ? (
								<ul className="requirement-item-list">
									{displayedRequirementItems.map((item) => {
										const isDragging = draggingId === item.id;
										const isDropTarget =
											dropTargetId === item.id && draggingId !== item.id;
										const isDone = item.status === "done";
										return (
											<li
												key={item.id}
												className={[
													"requirement-item",
													REQUIREMENT_STATUS_CLASS[item.status],
													isDone ? "requirement-item-is-done" : "",
													isDragging ? "is-dragging" : "",
													isDropTarget ? "is-drop-target" : "",
													canReorderRequirements ? "" : "is-sort-locked",
												]
													.filter(Boolean)
													.join(" ")}
												onDragOver={(event) => onDragOver(event, item.id)}
												onDrop={(event) => void onDrop(event, item.id)}
												onDragLeave={() => {
													if (dropTargetId === item.id) setDropTargetId(null);
												}}
											>
												<button
													type="button"
													className="apps-sheet-drag-handle requirement-item-drag-handle"
													draggable={canReorderRequirements}
													disabled={!canReorderRequirements}
													aria-label={`${item.title} を並び替え`}
													title={
														canReorderRequirements
															? "ドラッグして並び替え"
															: "表示順に切り替えるとドラッグできます"
													}
													onDragStart={(event) => onDragStart(event, item.id)}
													onDragEnd={onDragEnd}
												>
													<span aria-hidden="true">⋮⋮</span>
												</button>
												<div className="requirement-item-main">
													<AppRequirementStatusButtons
														requirement={item}
														onUpdated={applyRequirementStatusUpdate}
													/>
													<div className="requirement-item-title-row">
														<button
															type="button"
															className="requirement-item-title"
															onClick={() => openDetailDialog(item)}
															aria-label={`${item.title} の詳細を開く`}
														>
															{item.title}
														</button>
													</div>
													{item.tags.length > 0 ? (
														<ul className="requirement-item-tags" aria-label="タグ">
															{item.tags.map((tag) => (
																<li
																	key={tag.id}
																	className="tag-chip"
																	style={masterTintStyle(
																		tag.color,
																		tag.text_color,
																	)}
																>
																	{tag.name}
																</li>
															))}
														</ul>
													) : null}
													<p className="requirement-item-times">
														<time dateTime={item.created_at}>
															記録 {formatRequirementTime(item.created_at)}
														</time>
														{item.completed_at ? (
															<time dateTime={item.completed_at}>
																完了 {formatRequirementTime(item.completed_at)}
															</time>
														) : null}
													</p>
													{isDone ? (
														<RequirementTestResults
															requirement={item}
															results={
																testResultsByRequirementId.get(item.id) ?? []
															}
														/>
													) : null}
													<AppRequirementComments
														requirementId={item.id}
														comments={commentsByRequirementId.get(item.id) ?? []}
														employees={employees}
													/>
												</div>
											</li>
										);
									})}
								</ul>
							) : null}
						</div>
					</div>
				)}
			</section>

			<dialog
				ref={createDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === createDialogRef.current) closeCreateDialog();
				}}
			>
				<div className="task-dialog-panel">
					<div className="task-dialog-head">
						<h2>
							{selectedApp ? (
								<>
									<span
										className="apps-master-readonly"
										style={masterTintStyle(
											selectedApp.color,
											selectedApp.text_color,
										)}
									>
										{formatMasterLabel(selectedApp.name, selectedApp.icon)}
									</span>
									{" に要件を追加"}
								</>
							) : (
								"要件を追加"
							)}
						</h2>
						<button type="button" className="ghost" onClick={closeCreateDialog}>
							閉じる
						</button>
					</div>
					{selectedApp ? (
						<>
							<form
								id="requirement-create-form"
								key={createFormKey}
								action={handleCreate}
								className="employee-edit-form employee-dialog-form requirement-dialog-form"
							>
								<input type="hidden" name="app_name_id" value={selectedApp.id} />
								<label>
									<span>タイトル</span>
									<input
										name="title"
										required
										placeholder="新しい要件のタイトル"
									/>
								</label>
								<label>
									<span>本文</span>
									<textarea
										name="body"
										rows={4}
										className="requirement-body-textarea"
										placeholder="要件本文（Markdown 可）"
									/>
								</label>
								<AppRequirementStatusField />
								<RequirementTagFields tags={tags} />
							</form>
							<div className="task-actions task-dialog-footer">
								<button
									type="submit"
									form="requirement-create-form"
									className="primary"
								>
									追加
								</button>
							</div>
						</>
					) : null}
				</div>
			</dialog>

			<dialog
				ref={detailDialogRef}
				className="task-dialog task-dialog-docked"
				onClose={closeDetailDialog}
				onClick={(event) => {
					if (event.target === detailDialogRef.current) closeDetailDialog();
				}}
			>
				<div className="task-dialog-panel task-dialog-panel-docked">
					<div className="task-dialog-head">
						<h2>要件の詳細</h2>
						<button type="button" className="ghost" onClick={closeDetailDialog}>
							閉じる
						</button>
					</div>
					{detailing ? (
						<>
							<div className="task-detail task-dialog-scroll">
								<div className="task-meta">
									<span
										className={[
											"requirement-status-badge",
											"status-option",
											REQUIREMENT_STATUS_CLASS[detailing.status],
										].join(" ")}
									>
										<StatusIcon
											status={REQUIREMENT_STATUS_ICON[detailing.status]}
										/>
										<span>
											{APP_REQUIREMENT_STATUS_LABEL[detailing.status]}
										</span>
									</span>
									<span className="when">
										記録 {formatRequirementTime(detailing.created_at)}
									</span>
									{detailing.completed_at ? (
										<span className="when">
											完了 {formatRequirementTime(detailing.completed_at)}
										</span>
									) : null}
								</div>
								<h3 className="task-detail-title">{detailing.title}</h3>
								{detailing.tags.length > 0 ? (
									<ul
										className="requirement-item-tags"
										aria-label="タグ"
									>
										{detailing.tags.map((tag) => (
											<li
												key={tag.id}
												className="tag-chip"
												style={masterTintStyle(tag.color, tag.text_color)}
											>
												{tag.name}
											</li>
										))}
									</ul>
								) : null}
								{detailing.body.trim() ? (
									<MarkdownPreview markdown={detailing.body} />
								) : (
									<p className="notes">本文はありません</p>
								)}
							</div>
							<div className="task-actions task-dialog-footer task-detail-actions">
								<div className="task-detail-actions-end">
									<button
										type="button"
										className="task-detail-btn task-detail-btn-edit"
										onClick={openEditFromDetail}
									>
										<StatusIcon
											status="draft"
											className="task-detail-btn-icon"
										/>
										<span>編集</span>
									</button>
								</div>
							</div>
						</>
					) : null}
				</div>
			</dialog>

			<dialog
				ref={editDialogRef}
				className="task-dialog task-dialog-docked"
				onClose={closeEditDialog}
				onClick={(event) => {
					if (event.target === editDialogRef.current) closeEditDialog();
				}}
			>
				<div className="task-dialog-panel task-dialog-panel-docked requirement-edit-dialog-panel">
					<div className="task-dialog-head">
						<h2>要件を編集</h2>
						<button type="button" className="ghost" onClick={closeEditDialog}>
							閉じる
						</button>
					</div>
					{editing ? (
						<>
							<form
								id={`requirement-edit-form-${editing.id}`}
								key={editFormKey}
								action={handleUpdate}
								className="employee-edit-form employee-dialog-form requirement-dialog-form task-dialog-form-docked"
							>
								<input type="hidden" name="id" value={editing.id} />
								<input
									type="hidden"
									name="app_name_id"
									value={editing.app_name_id}
								/>
								<div className="task-dialog-scroll requirement-edit-dialog-body">
									<label>
										<span>タイトル</span>
										<input name="title" required defaultValue={editing.title} />
									</label>
									<label>
										<span>本文</span>
										<textarea
											name="body"
											rows={8}
											className="requirement-body-textarea"
											defaultValue={editing.body}
										/>
									</label>
									<AppRequirementStatusField selectedStatus={editing.status} />
									<RequirementTagFields requirement={editing} tags={tags} />
								</div>
							</form>
							<div
								className="task-actions task-dialog-footer requirement-edit-dialog-footer"
							>
								<form
									className="requirement-edit-delete-form"
									onSubmit={(event) => {
										event.preventDefault();
										void handleDelete(new FormData(event.currentTarget));
									}}
								>
									<input type="hidden" name="id" value={editing.id} />
									<button
										type="submit"
										className="x-schedule-action-btn x-action-delete requirement-edit-footer-btn"
									>
										<span className="x-schedule-action-icon">
											<DeleteIcon />
										</span>
										<span>削除</span>
									</button>
								</form>
								<button
									type="submit"
									form={`requirement-edit-form-${editing.id}`}
									className="x-schedule-action-btn x-action-complete requirement-edit-footer-btn"
								>
									<span className="x-schedule-action-icon">
										<StatusIcon
											status="done"
											className="x-schedule-action-svg"
										/>
									</span>
									<span>保存</span>
								</button>
							</div>
						</>
					) : null}
				</div>
			</dialog>
		</>
	);
}

type DetailRow = {
	label: string;
	value: string;
	href?: string;
};

function RequirementAppDetailPanel({
	app,
	entry,
}: {
	app: AppName;
	entry: AppEntry | undefined;
}) {
	const rows: DetailRow[] = [];

	if (app.app_group.trim()) {
		rows.push({
			label: "AppGroup",
			value: formatMasterLabel(app.app_group, app.app_group_icon),
		});
	}
	if (app.app_type.trim()) {
		rows.push({
			label: "AppType",
			value: formatMasterLabel(app.app_type, app.app_type_icon),
		});
	}

	if (!entry) {
		return (
			<p className="requirement-app-detail-empty">
				App 管理に未登録です。
			</p>
		);
	}

	const stackRows: DetailRow[] = [
		{ label: "開発フォルダ", value: entry.dev_folder.trim() },
		{ label: "フロント", value: entry.frontend.trim() },
		{ label: "css", value: entry.css.trim() },
		{ label: "バックエンド", value: entry.backend.trim() },
		{ label: "DB", value: entry.db.trim() },
		{ label: "Storage", value: entry.storage.trim() },
		{ label: "PORT", value: entry.port.trim() },
		{ label: "認証", value: entry.auth.trim() },
		{
			label: "ステージングURL",
			value: entry.staging_url.trim(),
			href: entry.staging_url.trim(),
		},
		{ label: "Hosting", value: entry.hosting.trim() },
		{
			label: "本番URL",
			value: entry.production_url.trim(),
			href: entry.production_url.trim(),
		},
		{ label: "担当", value: entry.owner.trim() },
		{ label: "最終デプロイ日", value: entry.last_deployed_at.trim() },
		{ label: "備考", value: entry.notes.trim() },
	];

	for (const row of stackRows) {
		if (row.value) rows.push(row);
	}

	if (rows.length === 0) {
		return (
			<p className="requirement-app-detail-empty">
				登録されている詳細情報はありません。
			</p>
		);
	}

	return (
		<dl className="requirement-app-detail-list">
			{rows.map((row) => (
				<div key={row.label} className="requirement-app-detail-row">
					<dt className="requirement-app-detail-label">{row.label}</dt>
					<dd className="requirement-app-detail-value">
						{row.href ? (
							<a href={row.href} target="_blank" rel="noreferrer">
								{row.value}
							</a>
						) : (
							row.value
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}

function RequirementTestResults({
	requirement,
	results,
}: {
	requirement: AppRequirementWithApp;
	results: AppTestResultWithApp[];
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setError("");
		try {
			await createAppTestResult(new FormData(event.currentTarget));
			setOpen(false);
			router.refresh();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "テスト結果を保存できませんでした",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="requirement-item-tests">
			{results.map((result) => (
				<div key={result.id} className="requirement-item-test">
					<span
						className={[
							"status-badge",
							"requirement-status-badge",
							APP_TEST_OUTCOME_STYLE_CLASS[result.outcome],
						].join(" ")}
					>
						<StatusIcon status={APP_TEST_OUTCOME_ICON[result.outcome]} />
						<span>{APP_TEST_RESULT_OUTCOME_LABEL[result.outcome]}</span>
					</span>
					<time dateTime={result.recorded_at}>
						{formatRequirementTime(result.recorded_at)}
					</time>
					{result.body ? (
						<p className="requirement-item-test-body">{result.body}</p>
					) : null}
				</div>
			))}
			{open ? (
				<form className="requirement-item-test-form" onSubmit={onSubmit}>
					<input type="hidden" name="app_name_id" value={requirement.app_name_id} />
					<input type="hidden" name="requirement_id" value={requirement.id} />
					<input type="hidden" name="title" value={requirement.title} />
					<label>
						<span>テスト結果</span>
						<textarea
							name="body"
							rows={4}
							required
							className="requirement-body-textarea"
							placeholder="確認した内容と結果"
						/>
					</label>
					<AppTestResultOutcomeField defaultOutcome="info" />
					{error ? <p className="requirement-item-test-error">{error}</p> : null}
					<div className="requirement-item-test-actions">
						<button type="button" onClick={() => setOpen(false)} disabled={saving}>
							キャンセル
						</button>
						<button type="submit" className="primary" disabled={saving}>
							保存
						</button>
					</div>
				</form>
			) : (
				<button type="button" onClick={() => setOpen(true)}>
					テスト結果を記載
				</button>
			)}
		</div>
	);
}

function IndeterminateCheckbox({
	checked,
	indeterminate,
	onChange,
	ariaLabel,
}: {
	checked: boolean;
	indeterminate: boolean;
	onChange: (checked: boolean) => void;
	ariaLabel: string;
}) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			aria-label={ariaLabel}
			onChange={(event) => onChange(event.target.checked)}
		/>
	);
}

function DeleteIcon() {
	return (
		<svg
			className="x-schedule-action-svg"
			width={14}
			height={14}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M3.5 4.5h9" />
			<path d="M6.2 4.5V3.2a.7.7 0 0 1 .7-.7h2.2a.7.7 0 0 1 .7.7v1.3" />
			<path d="M5.2 4.5v8.3a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1V4.5" />
			<path d="M6.8 7v4.8M9.2 7v4.8" />
		</svg>
	);
}

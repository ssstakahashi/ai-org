"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
} from "react";
import {
	createAppRequirement,
	deleteAppRequirement,
	reorderAppNames,
	reorderAppRequirements,
	updateAppRequirement,
} from "@/app/actions";
import { masterTintStyle } from "@/lib/colors";
import { AppRequirementStatusField } from "@/components/AppRequirementStatusField";
import { StatusIcon } from "@/components/StatusIcon";
import {
	formatMasterLabel,
	getDevPolicyMeta,
	APP_REQUIREMENT_STATUS_LABEL,
	type AppEntry,
	type AppName,
	type AppRequirementStatus,
	type AppRequirementWithApp,
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

type Props = {
	appNames: AppName[];
	requirements: AppRequirementWithApp[];
	appEntryByAppNameId: Record<string, AppEntry>;
};

export function AppRequirementsManager({
	appNames,
	requirements,
	appEntryByAppNameId,
}: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
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

	const requirementCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of requirements) {
			counts.set(item.app_name_id, (counts.get(item.app_name_id) ?? 0) + 1);
		}
		return counts;
	}, [requirements]);

	useEffect(() => {
		setOrderedApps(appNames);
	}, [appNames]);

	useEffect(() => {
		if (!selectedAppId && orderedApps[0]) {
			setSelectedAppId(orderedApps[0].id);
			return;
		}
		if (
			selectedAppId &&
			orderedApps.length > 0 &&
			!orderedApps.some((app) => app.id === selectedAppId)
		) {
			setSelectedAppId(orderedApps[0].id);
		}
	}, [orderedApps, selectedAppId]);

	const filteredFromProps = useMemo(
		() =>
			selectedAppId
				? requirements.filter((item) => item.app_name_id === selectedAppId)
				: [],
		[requirements, selectedAppId],
	);

	useEffect(() => {
		setOrderedItems(filteredFromProps);
	}, [filteredFromProps]);

	const selectedApp = orderedApps.find((item) => item.id === selectedAppId);
	const selectedCount = selectedAppId
		? requirementCounts.get(selectedAppId) ?? 0
		: 0;

	function openCreateDialog() {
		setCreateFormKey((value) => value + 1);
		createDialogRef.current?.showModal();
	}

	function closeCreateDialog() {
		createDialogRef.current?.close();
	}

	function openEditDialog(item: AppRequirementWithApp) {
		setEditing(item);
		setEditFormKey((value) => value + 1);
		editDialogRef.current?.showModal();
	}

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

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
		if (sourceId === targetId || reorderingApps) return;

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
		if (sourceId === targetId || reordering) return;

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
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingAppId(id);
	}

	function onAppDragOver(event: DragEvent<HTMLLIElement>, id: string) {
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
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingId(id);
	}

	function onDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetId !== id) setDropTargetId(id);
	}

	async function onDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
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

	function stopRowActivate(event: { stopPropagation: () => void }) {
		event.stopPropagation();
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
								{selectedCount}件）
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
					左の App 一覧から選択して要件を編集します。行をクリックすると編集ダイアログが開きます。
					ステータスが「承認済」の要件は Cursor Automation から export できます。左の
					ハンドルで App の表示順、表内のハンドルで要件の表示順を変更できます。
				</p>

				{orderedApps.length === 0 ? (
					<p className="empty">
						App マスタがありません。先に App タブで App を登録してください。
					</p>
				) : (
					<div className="requirement-layout">
						<aside className="requirement-app-sidebar">
							<p className="requirement-sidebar-label">App</p>
							<ul
								className="requirement-app-list"
								role="tablist"
								aria-label="App の選択"
							>
								{orderedApps.map((app) => {
									const active = app.id === selectedAppId;
									const count = requirementCounts.get(app.id) ?? 0;
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
												draggable={!reorderingApps}
												aria-label={`${app.name} の表示順を変更`}
												title="ドラッグして App の表示順を変更"
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
													<span className="requirement-app-count">{count}</span>
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
							{selectedApp && orderedItems.length === 0 ? (
								<p className="empty">
									{formatMasterLabel(selectedApp.name, selectedApp.icon)}{" "}
									の要件はまだありません。「新規登録」から追加してください。
								</p>
							) : null}

							{orderedItems.length > 0 ? (
								<div className="x-schedule-scroll">
									<table className="x-schedule-table apps-sheet-table requirement-sheet-table">
										<thead>
											<tr>
												<th>並び</th>
												<th>タイトル</th>
												<th>本文</th>
												<th>ステータス</th>
											</tr>
										</thead>
										<tbody>
											{orderedItems.map((item) => {
												const isDragging = draggingId === item.id;
												const isDropTarget =
													dropTargetId === item.id && draggingId !== item.id;
												return (
													<tr
														key={item.id}
														className={[
															"requirement-row",
															isDragging ? "is-dragging" : "",
															isDropTarget ? "is-drop-target" : "",
														]
															.filter(Boolean)
															.join(" ")}
														onClick={() => openEditDialog(item)}
														onKeyDown={(event) => {
															if (event.key === "Enter" || event.key === " ") {
																event.preventDefault();
																openEditDialog(item);
															}
														}}
														tabIndex={0}
														aria-label={`${item.title} を編集`}
														onDragOver={(event) => onDragOver(event, item.id)}
														onDrop={(event) => void onDrop(event, item.id)}
														onDragLeave={() => {
															if (dropTargetId === item.id) setDropTargetId(null);
														}}
													>
														<td onClick={stopRowActivate}>
															<div className="apps-sheet-cell">
																<button
																	type="button"
																	className="apps-sheet-drag-handle"
																	draggable={!reordering}
																	aria-label={`${item.title} を並び替え`}
																	title="ドラッグして並び替え"
																	onDragStart={(event) =>
																		onDragStart(event, item.id)
																	}
																	onDragEnd={onDragEnd}
																>
																	<span aria-hidden="true">⋮⋮</span>
																</button>
															</div>
														</td>
														<td>
															<div className="apps-sheet-cell requirement-row-title">
																{item.title}
															</div>
														</td>
														<td className="requirement-body-cell">
															<div className="requirement-body-preview">
																{item.body || "（本文なし）"}
															</div>
														</td>
														<td>
															<span
																className={[
																	"requirement-status-badge",
																	"status-option",
																	REQUIREMENT_STATUS_CLASS[item.status],
																].join(" ")}
															>
																<StatusIcon
																	status={REQUIREMENT_STATUS_ICON[item.status]}
																/>
																<span>
																	{APP_REQUIREMENT_STATUS_LABEL[item.status]}
																</span>
															</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
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
				ref={editDialogRef}
				className="task-dialog task-dialog-docked"
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

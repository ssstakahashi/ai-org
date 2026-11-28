"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
} from "react";
import { flushSync } from "react-dom";
import {
	createAppTestResult,
	deleteAppTestResult,
	reorderAppNames,
	saveAppTestPlan,
	updateAppTestResult,
} from "@/app/actions";
import {
	APP_TEST_OUTCOME_ICON,
	APP_TEST_OUTCOME_STYLE_CLASS,
	AppTestResultOutcomeField,
} from "@/components/AppTestResultOutcomeField";
import { AppTestResultOutcomeButtons } from "@/components/AppTestResultOutcomeButtons";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { StatusIcon } from "@/components/StatusIcon";
import type { AppListSort } from "@/lib/app-requirements-prefs";
import {
	getAppTestResultsPrefs,
	saveAppTestResultsPrefs,
} from "@/lib/app-test-results-prefs";
import { masterTintStyle } from "@/lib/colors";
import { formatInAppTz, toAppDateTimeLocal } from "@/lib/timezone";
import {
	APP_TEST_RESULT_OUTCOME_LABEL,
	APP_TEST_RESULT_OUTCOME_OPTIONS,
	formatMasterLabel,
	type AppName,
	type AppTestPlanWithApp,
	type AppTestResultOutcome,
	type AppTestResultWithApp,
} from "@/lib/types";

type Props = {
	appNames: AppName[];
	testPlans: AppTestPlanWithApp[];
	testResults: AppTestResultWithApp[];
};

function formatRecordedAt(value: string): string {
	return formatInAppTz(value, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function requirementPageHref(result: AppTestResultWithApp): string | null {
	if (!result.requirement_id) return null;
	return `/apps/requirements?app=${encodeURIComponent(result.app_name_id)}&req=${encodeURIComponent(result.requirement_id)}`;
}

/** 一覧で途中で切れる長文に「詳細で全文」の目印を付ける */
function ClampedBodyPreview({
	text,
	onOpenDetail,
}: {
	text: string;
	onOpenDetail: () => void;
}) {
	const ref = useRef<HTMLParagraphElement>(null);
	const [clamped, setClamped] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const measure = () => {
			setClamped(element.scrollHeight > element.clientHeight + 1);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [text]);

	return (
		<>
			<p ref={ref} className="requirement-body-preview">
				{text}
			</p>
			{clamped ? (
				<button
					type="button"
					className="requirement-body-more"
					onClick={onOpenDetail}
				>
					…詳細で全文を見る
				</button>
			) : null}
		</>
	);
}

export function AppTestResultsManager({
	appNames,
	testPlans,
	testResults,
}: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
	const [detailing, setDetailing] = useState<AppTestResultWithApp | null>(null);
	const [editing, setEditing] = useState<AppTestResultWithApp | null>(null);
	const [orderedApps, setOrderedApps] = useState(appNames);
	const [selectedAppId, setSelectedAppId] = useState(appNames[0]?.id ?? "");
	const [planBody, setPlanBody] = useState("");
	const [planDirty, setPlanDirty] = useState(false);
	const [editingPlan, setEditingPlan] = useState(false);
	const [savingPlan, setSavingPlan] = useState(false);
	const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
	const [dropTargetAppId, setDropTargetAppId] = useState<string | null>(null);
	const [reorderingApps, setReorderingApps] = useState(false);
	const [appListSort, setAppListSort] = useState<AppListSort>("manual");
	const [hiddenAppIds, setHiddenAppIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [outcomeFilter, setOutcomeFilter] = useState<Set<AppTestResultOutcome>>(
		() => new Set(),
	);
	const [prefsReady, setPrefsReady] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const planByAppId = useMemo(() => {
		const map = new Map<string, AppTestPlanWithApp>();
		for (const plan of testPlans) {
			map.set(plan.app_name_id, plan);
		}
		return map;
	}, [testPlans]);

	const resultCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of testResults) {
			counts.set(item.app_name_id, (counts.get(item.app_name_id) ?? 0) + 1);
		}
		return counts;
	}, [testResults]);

	const canReorderApps = appListSort === "manual" && !reorderingApps;

	const sortedApps = useMemo(() => {
		if (appListSort === "manual") return orderedApps;
		const indexById = new Map(
			orderedApps.map((app, index) => [app.id, index] as const),
		);
		const direction = appListSort === "count-desc" ? -1 : 1;
		return [...orderedApps].sort((a, b) => {
			const countDiff =
				(resultCounts.get(a.id) ?? 0) - (resultCounts.get(b.id) ?? 0);
			if (countDiff !== 0) return countDiff * direction;
			return (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0);
		});
	}, [appListSort, orderedApps, resultCounts]);

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

	const filteredResults = useMemo(
		() =>
			selectedAppId &&
			displayedApps.some((app) => app.id === selectedAppId)
				? testResults.filter((item) => item.app_name_id === selectedAppId)
				: [],
		[displayedApps, testResults, selectedAppId],
	);

	const outcomeCounts = useMemo(() => {
		const counts: Record<AppTestResultOutcome, number> = {
			pass: 0,
			fail: 0,
			partial: 0,
			blocked: 0,
			skipped: 0,
			info: 0,
		};
		for (const item of filteredResults) counts[item.outcome] += 1;
		return counts;
	}, [filteredResults]);

	const displayedResults = useMemo(
		() =>
			outcomeFilter.size === 0
				? filteredResults
				: filteredResults.filter((item) => outcomeFilter.has(item.outcome)),
		[filteredResults, outcomeFilter],
	);

	useEffect(() => {
		const prefs = getAppTestResultsPrefs();
		setAppListSort(prefs.sort);

		// ?app= のリンクで開いたときは、その App を選ぶ
		const linkedAppId =
			new URLSearchParams(window.location.search).get("app") ?? "";
		const hidden = new Set(prefs.hiddenAppIds);
		if (linkedAppId) {
			hidden.delete(linkedAppId);
			setSelectedAppId(linkedAppId);
		}
		setHiddenAppIds(hidden);
		setPrefsReady(true);
	}, []);

	useEffect(() => {
		if (!prefsReady || !selectedAppId) return;
		const url = new URL(window.location.href);
		if (url.searchParams.get("app") === selectedAppId) return;
		url.searchParams.set("app", selectedAppId);
		window.history.replaceState(null, "", url);
	}, [prefsReady, selectedAppId]);

	useEffect(() => {
		if (!prefsReady) return;
		saveAppTestResultsPrefs(
			{
				sort: appListSort,
				hiddenAppIds: [...hiddenAppIds],
			},
			orderedApps.map((app) => app.id),
		);
	}, [appListSort, hiddenAppIds, orderedApps, prefsReady]);

	useEffect(() => {
		setOrderedApps(appNames);
	}, [appNames]);

	useEffect(() => {
		if (displayedApps.length === 0) return;
		if (
			!selectedAppId ||
			!displayedApps.some((app) => app.id === selectedAppId)
		) {
			setSelectedAppId(displayedApps[0].id);
		}
	}, [displayedApps, selectedAppId]);

	useEffect(() => {
		if (!selectedAppId) {
			setPlanBody("");
			setPlanDirty(false);
			setEditingPlan(false);
			return;
		}
		const plan = planByAppId.get(selectedAppId);
		setPlanBody(plan?.body ?? "");
		setPlanDirty(false);
		setEditingPlan(false);
	}, [selectedAppId, planByAppId]);

	const selectedApp = displayedApps.find((item) => item.id === selectedAppId);
	const selectedCount = selectedAppId
		? resultCounts.get(selectedAppId) ?? 0
		: 0;

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

	function applyResultOutcomeUpdate(id: string, outcome: AppTestResultOutcome) {
		setDetailing((current) =>
			current?.id === id ? { ...current, outcome } : current,
		);
		setEditing((current) =>
			current?.id === id ? { ...current, outcome } : current,
		);
	}

	function openDetailDialog(item: AppTestResultWithApp) {
		flushSync(() => {
			setDetailing(item);
		});
		detailDialogRef.current?.showModal();
	}

	function openEditDialog(item: AppTestResultWithApp) {
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
			await createAppTestResult(formData);
			closeCreateDialog();
			router.refresh();
		},
		[router],
	);

	const handleUpdate = useCallback(
		async (formData: FormData) => {
			await updateAppTestResult(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	const handleDelete = useCallback(
		async (formData: FormData) => {
			await deleteAppTestResult(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	function startEditPlan() {
		setEditingPlan(true);
	}

	function cancelEditPlan() {
		const plan = selectedAppId ? planByAppId.get(selectedAppId) : undefined;
		setPlanBody(plan?.body ?? "");
		setPlanDirty(false);
		setEditingPlan(false);
	}

	async function handleSavePlan() {
		if (!selectedAppId || savingPlan) return;
		setSavingPlan(true);
		try {
			const formData = new FormData();
			formData.set("app_name_id", selectedAppId);
			formData.set("body", planBody);
			await saveAppTestPlan(formData);
			setPlanDirty(false);
			setEditingPlan(false);
			router.refresh();
		} finally {
			setSavingPlan(false);
		}
	}

	async function moveApp(sourceId: string, targetId: string) {
		if (sourceId === targetId || reorderingApps || appListSort !== "manual") {
			return;
		}

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

	function toggleOutcomeFilter(outcome: AppTestResultOutcome) {
		setOutcomeFilter((current) => {
			const next = new Set(current);
			if (next.has(outcome)) next.delete(outcome);
			else next.add(outcome);
			return next;
		});
	}

	function clearOutcomeFilter() {
		setOutcomeFilter(new Set());
	}

	function showAllApps() {
		setHiddenAppIds(new Set());
	}

	function hideAllApps() {
		setHiddenAppIds(new Set(orderedApps.map((app) => app.id)));
	}

	const defaultRecordedAt = toAppDateTimeLocal(new Date());
	const detailRequirementHref = detailing ? requirementPageHref(detailing) : null;

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<h2>
						テスト結果
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
							結果を追加
						</button>
					) : null}
				</div>
				<p className="panel-lede">
					左の App を選び、テスト計画の確認・編集と、テスト結果の記録ができます。結果は一覧のボタンで変更でき、タイトルをクリックすると詳細が開きます。並び順と絞り込みはこのブラウザに保存されます。
				</p>

				{orderedApps.length === 0 ? (
					<p className="empty">
						App マスタがありません。先に App タブで App を登録してください。
					</p>
				) : !prefsReady ? (
					<p className="empty" aria-live="polite">
						表示設定を読み込んでいます…
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
									aria-controls="test-results-app-filter-panel"
									onClick={() => setFilterOpen((open) => !open)}
								>
									<span>絞り込み</span>
									<span className="requirement-app-filter-summary">
										{displayedApps.length}/{orderedApps.length}
									</span>
								</button>
								{filterOpen ? (
									<div
										id="test-results-app-filter-panel"
										className="requirement-app-filter-panel"
									>
										<div className="requirement-app-filter-actions">
											<button type="button" onClick={showAllApps}>
												全選択
											</button>
											<button type="button" onClick={hideAllApps}>
												全解除
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
									const count = resultCounts.get(app.id) ?? 0;
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
													<span className="requirement-app-count">{count}</span>
												</button>
											</div>
										</li>
									);
								})}
							</ul>
						</aside>

						<div className="requirement-main">
							{selectedApp ? (
								<section className="app-test-plan-panel">
									<div className="panel-head app-test-plan-head">
										<h3>テスト計画</h3>
										{editingPlan ? (
											<div className="task-actions">
												<button
													type="button"
													className="ghost"
													disabled={savingPlan}
													onClick={cancelEditPlan}
												>
													キャンセル
												</button>
												<button
													type="button"
													className="primary"
													disabled={!planDirty || savingPlan}
													onClick={() => void handleSavePlan()}
												>
													{savingPlan ? "保存中…" : "計画を保存"}
												</button>
											</div>
										) : (
											<button
												type="button"
												className="ghost"
												onClick={startEditPlan}
											>
												編集
											</button>
										)}
									</div>
									<p className="panel-lede app-test-plan-lede">
										対象画面・観点・前提条件などを記載します。本文は Markdown
										プレビューで表示され、表組みは表として表示されます。編集からいつでも更新できます。
									</p>
									{editingPlan ? (
										<label className="full">
											<span className="sr-only">テスト計画の本文</span>
											<textarea
												className="requirement-body-textarea app-test-plan-textarea"
												value={planBody}
												rows={10}
												placeholder={`## テスト計画\n| No. | 観点 | 手順 | 期待結果 |\n| --- | --- | --- | --- |\n| 1 | … | … | … |`}
												onChange={(event) => {
													setPlanBody(event.target.value);
													setPlanDirty(true);
												}}
											/>
										</label>
									) : planBody.trim() ? (
										<MarkdownPreview
											markdown={planBody}
											className="app-test-plan-preview"
											inferPipeTables
										/>
									) : (
										<p className="notes">まだテスト計画はありません</p>
									)}
									{planByAppId.get(selectedAppId)?.updated_at ? (
										<p className="app-test-plan-meta">
											最終更新:{" "}
											{formatRecordedAt(
												planByAppId.get(selectedAppId)!.updated_at,
											)}
										</p>
									) : null}
								</section>
							) : null}

							{selectedApp && filteredResults.length === 0 ? (
								<p className="empty">
									{formatMasterLabel(selectedApp.name, selectedApp.icon)}{" "}
									のテスト結果はまだありません。「結果を追加」から記録してください。
								</p>
							) : null}

							{filteredResults.length > 0 ? (
								<div className="requirement-list-toolbar">
									<div className="requirement-item-status requirement-list-status-filter">
										<div
											className="status-options requirement-item-status-options"
											role="group"
											aria-label="結果で絞り込み"
										>
											{APP_TEST_RESULT_OUTCOME_OPTIONS.map((value) => {
												const active = outcomeFilter.has(value);
												return (
													<button
														key={value}
														type="button"
														className={`status-option ${APP_TEST_OUTCOME_STYLE_CLASS[value]}${
															active ? " is-current" : ""
														}`}
														aria-pressed={active}
														onClick={() => toggleOutcomeFilter(value)}
													>
														<StatusIcon status={APP_TEST_OUTCOME_ICON[value]} />
														<span>
															{APP_TEST_RESULT_OUTCOME_LABEL[value]}{" "}
															{outcomeCounts[value]}
														</span>
													</button>
												);
											})}
										</div>
										{outcomeFilter.size > 0 ? (
											<button type="button" onClick={clearOutcomeFilter}>
												絞り込み解除
											</button>
										) : null}
									</div>
								</div>
							) : null}

							{filteredResults.length > 0 && displayedResults.length === 0 ? (
								<p className="empty">
									選んだ結果のテスト結果はありません。{" "}
									<button type="button" onClick={clearOutcomeFilter}>
										絞り込み解除
									</button>
								</p>
							) : null}

							{displayedResults.length > 0 ? (
								<ul className="requirement-item-list">
									{displayedResults.map((item) => {
										const requirementHref = requirementPageHref(item);
										return (
											<li
												key={item.id}
												className="requirement-item app-test-result-item"
											>
												<div className="requirement-item-main">
													<AppTestResultOutcomeButtons
														result={item}
														onUpdated={applyResultOutcomeUpdate}
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
													{item.requirement_title ? (
														<p className="requirement-linked-label">
															要件:{" "}
															{requirementHref ? (
																<Link href={requirementHref}>
																	{item.requirement_title}
																</Link>
															) : (
																item.requirement_title
															)}
														</p>
													) : null}
													<p className="requirement-item-times">
														<time dateTime={item.recorded_at}>
															記録 {formatRecordedAt(item.recorded_at)}
														</time>
													</p>
													{item.body.trim() ? (
														<ClampedBodyPreview
															text={item.body}
															onOpenDetail={() => openDetailDialog(item)}
														/>
													) : null}
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
				onClose={closeCreateDialog}
				onClick={(event) => {
					if (event.target === createDialogRef.current) closeCreateDialog();
				}}
			>
				<div className="task-dialog-panel">
					<h3>テスト結果を追加</h3>
					<form
						key={createFormKey}
						id="app-test-result-create-form"
						className="task-dialog-form"
						onSubmit={(event) => {
							event.preventDefault();
							void handleCreate(new FormData(event.currentTarget));
						}}
					>
						<input type="hidden" name="app_name_id" value={selectedAppId} />
						<label className="full">
							<span>タイトル</span>
							<input name="title" required autoFocus />
						</label>
						<label className="full">
							<span>記録日時</span>
							<input
								type="datetime-local"
								name="recorded_at"
								defaultValue={defaultRecordedAt}
							/>
						</label>
						<label className="full">
							<span>内容</span>
							<textarea
								name="body"
								className="requirement-body-textarea"
								rows={8}
								placeholder="実施内容・観測結果・共有メモなど"
							/>
						</label>
						<AppTestResultOutcomeField defaultOutcome="info" />
					</form>
					<div className="task-actions task-dialog-footer">
						<button type="button" onClick={closeCreateDialog}>キャンセル</button>
						<button type="submit" form="app-test-result-create-form" className="primary">
							追加
						</button>
					</div>
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
						<h2>テスト結果の詳細</h2>
						<button type="button" className="ghost" onClick={closeDetailDialog}>
							閉じる
						</button>
					</div>
					{detailing ? (
						<>
							<div className="task-detail task-dialog-scroll">
								<AppTestResultOutcomeButtons
									result={detailing}
									onUpdated={applyResultOutcomeUpdate}
								/>
								<div className="task-meta">
									<span className="when">
										{formatRecordedAt(detailing.recorded_at)}
									</span>
									{detailing.requirement_title ? (
										<span>
											要件:{" "}
											{detailRequirementHref ? (
												<Link href={detailRequirementHref}>
													{detailing.requirement_title}
												</Link>
											) : (
												detailing.requirement_title
											)}
										</span>
									) : null}
								</div>
								<h3 className="task-detail-title">{detailing.title}</h3>
								{detailing.body ? (
									<MarkdownPreview markdown={detailing.body} />
								) : (
									<p className="notes">内容はありません</p>
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
				className="task-dialog"
				onClose={closeEditDialog}
				onClick={(event) => {
					if (event.target === editDialogRef.current) closeEditDialog();
				}}
			>
				<div className="task-dialog-panel">
					<h3>テスト結果を編集</h3>
					{editing ? (
						<>
							<form
								key={editFormKey}
								id={`app-test-result-edit-form-${editing.id}`}
								className="task-dialog-form"
								onSubmit={(event) => {
									event.preventDefault();
									void handleUpdate(new FormData(event.currentTarget));
								}}
							>
								<input type="hidden" name="id" value={editing.id} />
								<input type="hidden" name="app_name_id" value={editing.app_name_id} />
								<label className="full">
									<span>タイトル</span>
									<input name="title" required defaultValue={editing.title} />
								</label>
								<label className="full">
									<span>記録日時</span>
									<input
										type="datetime-local"
										name="recorded_at"
										required
										defaultValue={toAppDateTimeLocal(editing.recorded_at)}
									/>
								</label>
								<label className="full">
									<span>内容</span>
									<textarea
										name="body"
										className="requirement-body-textarea"
										rows={16}
										defaultValue={editing.body}
									/>
								</label>
								<AppTestResultOutcomeField selectedOutcome={editing.outcome} />
							</form>
							<div className="task-actions task-dialog-footer requirement-edit-dialog-footer">
								<button type="button" onClick={closeEditDialog}>
									閉じる
								</button>
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
										<span>削除</span>
									</button>
								</form>
								<button
									type="submit"
									form={`app-test-result-edit-form-${editing.id}`}
									className="x-schedule-action-btn x-action-complete requirement-edit-footer-btn"
								>
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

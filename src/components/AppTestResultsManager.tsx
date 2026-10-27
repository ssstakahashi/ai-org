"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	createAppTestResult,
	deleteAppTestResult,
	saveAppTestPlan,
	updateAppTestResult,
} from "@/app/actions";
import {
	APP_TEST_OUTCOME_ICON,
	APP_TEST_OUTCOME_STYLE_CLASS,
	AppTestResultOutcomeField,
} from "@/components/AppTestResultOutcomeField";
import { StatusIcon } from "@/components/StatusIcon";
import { masterTintStyle } from "@/lib/colors";
import { formatInAppTz, toAppDateTimeLocal } from "@/lib/timezone";
import {
	APP_TEST_RESULT_OUTCOME_LABEL,
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

export function AppTestResultsManager({
	appNames,
	testPlans,
	testResults,
}: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
	const [editing, setEditing] = useState<AppTestResultWithApp | null>(null);
	const [selectedAppId, setSelectedAppId] = useState(appNames[0]?.id ?? "");
	const [planBody, setPlanBody] = useState("");
	const [planDirty, setPlanDirty] = useState(false);
	const [savingPlan, setSavingPlan] = useState(false);

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

	const filteredResults = useMemo(
		() =>
			selectedAppId
				? testResults.filter((item) => item.app_name_id === selectedAppId)
				: [],
		[testResults, selectedAppId],
	);

	useEffect(() => {
		if (!selectedAppId && appNames[0]) {
			setSelectedAppId(appNames[0].id);
			return;
		}
		if (
			selectedAppId &&
			appNames.length > 0 &&
			!appNames.some((app) => app.id === selectedAppId)
		) {
			setSelectedAppId(appNames[0].id);
		}
	}, [appNames, selectedAppId]);

	useEffect(() => {
		if (!selectedAppId) {
			setPlanBody("");
			setPlanDirty(false);
			return;
		}
		const plan = planByAppId.get(selectedAppId);
		setPlanBody(plan?.body ?? "");
		setPlanDirty(false);
	}, [selectedAppId, planByAppId]);

	const selectedApp = appNames.find((item) => item.id === selectedAppId);
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

	function openEditDialog(item: AppTestResultWithApp) {
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

	async function handleSavePlan() {
		if (!selectedAppId || savingPlan) return;
		setSavingPlan(true);
		try {
			const formData = new FormData();
			formData.set("app_name_id", selectedAppId);
			formData.set("body", planBody);
			await saveAppTestPlan(formData);
			setPlanDirty(false);
			router.refresh();
		} finally {
			setSavingPlan(false);
		}
	}

	const defaultRecordedAt = toAppDateTimeLocal(new Date());

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
					左の App を選び、テスト計画を Markdown 風に保存し、テスト結果を時系列で追記します。
					行をクリックすると結果の編集ダイアログが開きます。
				</p>

				{appNames.length === 0 ? (
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
								{appNames.map((app) => {
									const active = app.id === selectedAppId;
									const count = resultCounts.get(app.id) ?? 0;
									return (
										<li
											key={app.id}
											className={[
												"requirement-app-item",
												active ? "active" : "",
											]
												.filter(Boolean)
												.join(" ")}
										>
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
										<button
											type="button"
											className="primary"
											disabled={!planDirty || savingPlan}
											onClick={() => void handleSavePlan()}
										>
											{savingPlan ? "保存中…" : "計画を保存"}
										</button>
									</div>
									<p className="panel-lede app-test-plan-lede">
										対象画面・観点・前提条件などを記載します。保存後もいつでも更新できます。
									</p>
									<label className="full">
										<span className="sr-only">テスト計画の本文</span>
										<textarea
											className="requirement-body-textarea app-test-plan-textarea"
											value={planBody}
											rows={10}
											placeholder={`## テスト計画\n- 対象: …\n- 観点: …`}
											onChange={(event) => {
												setPlanBody(event.target.value);
												setPlanDirty(true);
											}}
										/>
									</label>
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
								<div className="x-schedule-scroll">
									<table className="x-schedule-table apps-sheet-table requirement-sheet-table">
										<thead>
											<tr>
												<th>記録日時</th>
												<th>タイトル</th>
												<th>内容</th>
												<th>結果</th>
											</tr>
										</thead>
										<tbody>
											{filteredResults.map((item) => (
												<tr
													key={item.id}
													className="requirement-row"
													onClick={() => openEditDialog(item)}
													onKeyDown={(event) => {
														if (event.key === "Enter" || event.key === " ") {
															event.preventDefault();
															openEditDialog(item);
														}
													}}
													tabIndex={0}
													aria-label={`${item.title} を編集`}
												>
													<td>
														<div className="apps-sheet-cell">
															{formatRecordedAt(item.recorded_at)}
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
																APP_TEST_OUTCOME_STYLE_CLASS[item.outcome],
															].join(" ")}
														>
															<StatusIcon
																status={APP_TEST_OUTCOME_ICON[item.outcome]}
															/>
															<span>
																{APP_TEST_RESULT_OUTCOME_LABEL[item.outcome]}
															</span>
														</span>
													</td>
												</tr>
											))}
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
				onClose={closeCreateDialog}
			>
				<div className="task-dialog-inner">
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
				ref={editDialogRef}
				className="task-dialog"
				onClose={() => setEditing(null)}
			>
				<div className="task-dialog-inner">
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
										rows={8}
										defaultValue={editing.body}
									/>
								</label>
								<AppTestResultOutcomeField selectedOutcome={editing.outcome} />
							</form>
							<div className="task-actions task-dialog-footer requirement-edit-dialog-footer">
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

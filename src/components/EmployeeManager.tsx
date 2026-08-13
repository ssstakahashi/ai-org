"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type DragEvent,
	type FormEvent,
	type MouseEvent,
} from "react";
import {
	createEmployee,
	deleteEmployee,
	reorderEmployees,
	updateEmployee,
} from "@/app/actions";
import { StatusIcon } from "@/components/StatusIcon";
import { colorInputValue, employeeTintStyle, normalizeColor } from "@/lib/colors";
import type { Employee } from "@/lib/types";

type Props = {
	employees: Employee[];
};

function EmployeeColorFields({
	bgDefault = "",
	textDefault = "",
	controlled = false,
	onInput,
	onChange,
}: {
	bgDefault?: string;
	textDefault?: string;
	controlled?: boolean;
	onInput?: (event: FormEvent<HTMLInputElement>) => void;
	onChange?: (event: FormEvent<HTMLInputElement>) => void;
}) {
	const bgValue = colorInputValue(bgDefault);
	const textValue = colorInputValue(textDefault || bgDefault);
	return (
		<div className="app-master-color-fields">
			<label className="color-field">
				<span className="color-field-label">背景</span>
				<input
					type="color"
					name="color"
					onInput={onInput}
					onChange={onChange}
					{...(controlled
						? { value: bgValue }
						: { defaultValue: bgValue })}
				/>
			</label>
			<label className="color-field">
				<span className="color-field-label">文字</span>
				<input
					type="color"
					name="text_color"
					onInput={onInput}
					onChange={onChange}
					{...(controlled
						? { value: textValue }
						: { defaultValue: textValue })}
				/>
			</label>
		</div>
	);
}

export function EmployeeManager({ employees: initialEmployees }: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const colorSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);
	const [employees, setEmployees] = useState(initialEmployees);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [reordering, setReordering] = useState(false);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editing, setEditing] = useState<Employee | null>(null);
	const [editFormKey, setEditFormKey] = useState(0);

	useEffect(() => {
		setEmployees(initialEmployees);
	}, [initialEmployees]);

	async function moveEmployee(sourceId: string, targetId: string) {
		if (sourceId === targetId || reordering) return;

		const fromIndex = employees.findIndex((employee) => employee.id === sourceId);
		const toIndex = employees.findIndex((employee) => employee.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...employees];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		setEmployees(next);
		setReordering(true);
		try {
			await reorderEmployees(next.map((employee) => employee.id));
		} catch (error) {
			setEmployees(initialEmployees);
			throw error;
		} finally {
			setReordering(false);
		}
	}

	function onDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingId(id);
	}

	function onDragOver(event: DragEvent<HTMLLIElement>, id: string) {
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
		await moveEmployee(sourceId, targetId);
	}

	function onDragEnd() {
		setDraggingId(null);
		setDropTargetId(null);
	}

	function openCreateDialog() {
		setCreateFormKey((value) => value + 1);
		createDialogRef.current?.showModal();
	}

	function closeCreateDialog() {
		createDialogRef.current?.close();
	}

	function openEditDialog(employee: Employee) {
		setEditing(employee);
		setEditFormKey((value) => value + 1);
		editDialogRef.current?.showModal();
	}

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

	async function handleCreate(formData: FormData) {
		await createEmployee(formData);
		closeCreateDialog();
		router.refresh();
	}

	const handleUpdate = useCallback(
		async (formData: FormData) => {
			await updateEmployee(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	const handleDelete = useCallback(
		async (formData: FormData) => {
			await deleteEmployee(formData);
			closeEditDialog();
			router.refresh();
		},
		[closeEditDialog, router],
	);

	function stopCardActivate(event: MouseEvent) {
		event.stopPropagation();
	}

	const saveCardColor = useCallback(
		async (form: HTMLFormElement, employeeId: string) => {
			const formData = new FormData(form);
			const color = normalizeColor(formData.get("color"));
			const text_color = normalizeColor(formData.get("text_color"));
			const snapshot = employees;

			setEmployees((current) =>
				current.map((employee) =>
					employee.id === employeeId ? { ...employee, color, text_color } : employee,
				),
			);

			try {
				await updateEmployee(formData);
			} catch (error) {
				setEmployees(snapshot);
				throw error;
			}
		},
		[employees],
	);

	const scheduleCardColorSave = useCallback(
		(form: HTMLFormElement, employeeId: string) => {
			const timers = colorSaveTimersRef.current;
			const pending = timers.get(employeeId);
			if (pending) clearTimeout(pending);

			const colorInput = form.querySelector<HTMLInputElement>('input[name="color"]');
			const textColorInput = form.querySelector<HTMLInputElement>(
				'input[name="text_color"]',
			);
			const nextColor = colorInput?.value;
			const nextTextColor = textColorInput?.value;
			if (nextColor || nextTextColor) {
				setEmployees((current) =>
					current.map((employee) =>
						employee.id === employeeId
							? {
									...employee,
									...(nextColor ? { color: nextColor } : {}),
									...(nextTextColor ? { text_color: nextTextColor } : {}),
								}
							: employee,
					),
				);
			}

			timers.set(
				employeeId,
				setTimeout(() => {
					timers.delete(employeeId);
					void saveCardColor(form, employeeId);
				}, 250),
			);
		},
		[saveCardColor],
	);

	useEffect(() => {
		const timers = colorSaveTimersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<h2>従業員（{employees.length}）</h2>
					<button type="button" className="primary" onClick={openCreateDialog}>
						新規登録
					</button>
				</div>
				<p className="field-hint">
					「編集」で詳細の変更や削除ができます。背景色と文字色はカード上から直接設定できます。左のハンドルをドラッグして表示順を変更できます。タスクが残っている従業員は削除できません。
				</p>
				{employees.length === 0 ? (
					<p className="empty">従業員がいません。「新規登録」から追加してください。</p>
				) : (
					<ul className="master-list employee-card-list">
						{employees.map((employee) => {
							const isDragging = draggingId === employee.id;
							const isDropTarget =
								dropTargetId === employee.id && draggingId !== employee.id;
							return (
								<li
									key={employee.id}
									className={[
										"master-item",
										"employee-master-item",
										"employee-card",
										isDragging ? "is-dragging" : "",
										isDropTarget ? "is-drop-target" : "",
									]
										.filter(Boolean)
										.join(" ")}
									style={employeeTintStyle(employee.color, employee.text_color)}
									onDragOver={(event) => onDragOver(event, employee.id)}
									onDrop={(event) => void onDrop(event, employee.id)}
									onDragLeave={() => {
										if (dropTargetId === employee.id) setDropTargetId(null);
									}}
								>
									<div className="employee-card-header">
										<button
											type="button"
											className="employee-drag-handle"
											draggable={!reordering}
											aria-label={`${employee.name} を並び替え`}
											title="ドラッグして並び替え"
											onClick={stopCardActivate}
											onDragStart={(event) => onDragStart(event, employee.id)}
											onDragEnd={onDragEnd}
										>
											<span aria-hidden="true">⋮⋮</span>
										</button>
										<form
											className="employee-card-color-form"
											onClick={stopCardActivate}
										>
											<input type="hidden" name="id" value={employee.id} />
											<input type="hidden" name="name" value={employee.name} />
											<input type="hidden" name="role" value={employee.role} />
											<input type="hidden" name="area" value={employee.area} />
											<input type="hidden" name="authority" value={employee.authority} />
											<EmployeeColorFields
												bgDefault={employee.color}
												textDefault={employee.text_color}
												controlled
												onInput={(event) => {
													scheduleCardColorSave(
														event.currentTarget.form!,
														employee.id,
													);
												}}
												onChange={(event) => {
													const timers = colorSaveTimersRef.current;
													const pending = timers.get(employee.id);
													if (pending) {
														clearTimeout(pending);
														timers.delete(employee.id);
													}
													void saveCardColor(
														event.currentTarget.form!,
														employee.id,
													);
												}}
											/>
										</form>
									</div>
									<div className="employee-card-body">
										<p className="employee-card-name">{employee.name}</p>
										<div className="employee-card-field">
											<span className="employee-card-label">役割</span>
											<p className="employee-card-role">{employee.role}</p>
										</div>
										<div className="employee-card-field">
											<span className="employee-card-label">担当領域</span>
											<p className="employee-card-role">
												{employee.area || "未設定"}
											</p>
										</div>
										<div className="employee-card-field">
											<span className="employee-card-label">職務権限</span>
											<p className="employee-card-role">
												{employee.authority || "未設定"}
											</p>
										</div>
									</div>
									<div className="employee-card-actions" onClick={stopCardActivate}>
										<button
											type="button"
											className="x-schedule-action-btn x-action-edit"
											onClick={() => openEditDialog(employee)}
											aria-label={`${employee.name} を編集`}
										>
											<span className="x-schedule-action-icon">
												<StatusIcon
													status="draft"
													className="x-schedule-action-svg"
												/>
											</span>
											<span>編集</span>
										</button>
									</div>
								</li>
							);
						})}
					</ul>
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
						<h2>従業員を登録</h2>
						<button type="button" className="ghost" onClick={closeCreateDialog}>
							閉じる
						</button>
					</div>
					<form
						key={createFormKey}
						action={handleCreate}
						className="employee-edit-form employee-dialog-form"
					>
						<label>
							<span>名前</span>
							<input name="name" required placeholder="例: デザイン担当" />
						</label>
						<label>
							<span>役割</span>
							<textarea
								name="role"
								required
								rows={6}
								className="employee-role-textarea"
								placeholder="例: タスクの優先度付け、進捗会議の議事起案、部署横断の調整。"
								defaultValue="ops"
							/>
						</label>
						<label>
							<span>担当領域</span>
							<textarea
								name="area"
								rows={4}
								className="employee-role-textarea"
								placeholder="例: 経営企画、進捗管理、Inbox振り分け"
							/>
						</label>
						<label>
							<span>職務権限</span>
							<textarea
								name="authority"
								rows={4}
								className="employee-role-textarea"
								placeholder="例: 優先度の提案、議事起案、他部署への依頼調整"
							/>
						</label>
						<EmployeeColorFields />
						<button type="submit" className="primary">
							追加
						</button>
					</form>
				</div>
			</dialog>

			<dialog
				ref={editDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === editDialogRef.current) closeEditDialog();
				}}
			>
				<div className="task-dialog-panel requirement-edit-dialog-panel">
					<div className="task-dialog-head">
						<h2>従業員を編集</h2>
						<button type="button" className="ghost" onClick={closeEditDialog}>
							閉じる
						</button>
					</div>
					{editing ? (
						<>
							<form
								id={`employee-edit-form-${editing.id}`}
								key={editFormKey}
								action={handleUpdate}
								className="employee-edit-form employee-dialog-form"
							>
								<input type="hidden" name="id" value={editing.id} />
								<label>
									<span>名前</span>
									<input name="name" required defaultValue={editing.name} />
								</label>
								<label>
									<span>役割</span>
									<textarea
										name="role"
										required
										rows={6}
										className="employee-role-textarea"
										defaultValue={editing.role}
									/>
								</label>
								<label>
									<span>担当領域</span>
									<textarea
										name="area"
										rows={4}
										className="employee-role-textarea"
										defaultValue={editing.area}
									/>
								</label>
								<label>
									<span>職務権限</span>
									<textarea
										name="authority"
										rows={4}
										className="employee-role-textarea"
										defaultValue={editing.authority}
									/>
								</label>
								<EmployeeColorFields
									bgDefault={editing.color}
									textDefault={editing.text_color}
								/>
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
										<span className="x-schedule-action-icon">
											<DeleteIcon />
										</span>
										<span>削除</span>
									</button>
								</form>
								<button
									type="submit"
									form={`employee-edit-form-${editing.id}`}
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

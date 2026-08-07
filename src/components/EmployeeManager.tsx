"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type DragEvent,
	type KeyboardEvent,
	type MouseEvent,
} from "react";
import {
	createEmployee,
	deleteEmployee,
	reorderEmployees,
	updateEmployee,
} from "@/app/actions";
import { colorInputValue } from "@/lib/colors";
import type { Employee } from "@/lib/types";

type Props = {
	employees: Employee[];
};

export function EmployeeManager({ employees: initialEmployees }: Props) {
	const router = useRouter();
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [employees, setEmployees] = useState(initialEmployees);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [reordering, setReordering] = useState(false);
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

	function openEditDialog(employee: Employee) {
		setEditing(employee);
		setEditFormKey((value) => value + 1);
		editDialogRef.current?.showModal();
	}

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

	async function handleUpdate(formData: FormData) {
		await updateEmployee(formData);
		closeEditDialog();
		router.refresh();
	}

	function onCardActivate(employee: Employee) {
		if (draggingId) return;
		openEditDialog(employee);
	}

	function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>, employee: Employee) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onCardActivate(employee);
		}
	}

	function stopCardActivate(event: MouseEvent) {
		event.stopPropagation();
	}

	return (
		<>
			<section className="panel">
				<h2>従業員（{employees.length}）</h2>
				<form action={createEmployee} className="employee-add-form">
					<label>
						<span>名前</span>
						<input name="name" required placeholder="例: デザイン担当" />
					</label>
					<label>
						<span>役割</span>
						<textarea
							name="role"
							required
							rows={4}
							className="employee-role-textarea"
							placeholder="例: タスクの優先度付け、進捗会議の議事起案、部署横断の調整。"
							defaultValue="ops"
						/>
					</label>
					<label>
						<span>担当領域</span>
						<textarea
							name="area"
							rows={3}
							className="employee-role-textarea"
							placeholder="例: 経営企画、進捗管理、Inbox振り分け"
						/>
					</label>
					<label>
						<span>職務権限</span>
						<textarea
							name="authority"
							rows={3}
							className="employee-role-textarea"
							placeholder="例: 優先度の提案、議事起案、他部署への依頼調整"
						/>
					</label>
					<label className="color-field">
						<span>色</span>
						<input type="color" name="color" defaultValue={colorInputValue("")} />
					</label>
					<button type="submit" className="primary">
						追加
					</button>
				</form>
				<p className="field-hint">
					カードをクリックすると編集できます。左のハンドルをドラッグして表示順を変更できます。タスクが残っている従業員は削除できません。
				</p>
				{employees.length === 0 ? (
					<p className="empty">従業員がいません。上のフォームから追加してください。</p>
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
										<span
											className="color-swatch"
											style={{ background: colorInputValue(employee.color) }}
											title={employee.color || "未設定"}
											aria-hidden="true"
										/>
									</div>
									<div
										className="employee-card-body"
										role="button"
										tabIndex={0}
										aria-label={`${employee.name} を編集`}
										onClick={() => onCardActivate(employee)}
										onKeyDown={(event) => onCardKeyDown(event, employee)}
									>
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
									<form
										action={deleteEmployee}
										className="employee-card-actions"
										onClick={stopCardActivate}
									>
										<input type="hidden" name="id" value={employee.id} />
										<button type="submit" className="ghost">
											削除
										</button>
									</form>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<dialog
				ref={editDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === editDialogRef.current) closeEditDialog();
				}}
			>
				<div className="task-dialog-panel">
					<div className="task-dialog-head">
						<h2>従業員を編集</h2>
						<button type="button" className="ghost" onClick={closeEditDialog}>
							閉じる
						</button>
					</div>
					{editing ? (
						<form
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
							<label className="color-field">
								<span>色</span>
								<input
									type="color"
									name="color"
									defaultValue={colorInputValue(editing.color)}
								/>
							</label>
							<button type="submit" className="primary">
								保存
							</button>
						</form>
					) : null}
				</div>
			</dialog>
		</>
	);
}

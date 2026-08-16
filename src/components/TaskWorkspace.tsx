"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createTask } from "@/app/actions";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { TaskForm } from "@/components/TaskForm";
import { toAppDateTimeLocal } from "@/lib/timezone";
import type { Category, Employee, Tag, TaskGroup, TaskWithEmployee } from "@/lib/types";

type Props = {
	employees: Employee[];
	categories: Category[];
	taskGroups: TaskGroup[];
	tags: Tag[];
	tasks: TaskWithEmployee[];
};

function countSeriesTasks(tasks: TaskWithEmployee[], seriesId: string | null) {
	if (!seriesId) return 1;
	return tasks.filter((task) => task.recurrence_series_id === seriesId).length;
}

function countFutureSeriesTasks(tasks: TaskWithEmployee[], task: TaskWithEmployee) {
	if (!task.recurrence_series_id) return 1;
	return tasks.filter((candidate) => {
		if (candidate.recurrence_series_id !== task.recurrence_series_id) return false;
		if (task.start_at && candidate.start_at) return candidate.start_at >= task.start_at;
		if (task.start_at && !candidate.start_at) return false;
		if (!task.start_at) return candidate.created_at >= task.created_at;
		return true;
	}).length;
}

function toDateTimeLocal(dateKey: string, time: string) {
	return `${dateKey}T${time}`;
}

export function TaskWorkspace({ employees, categories, taskGroups, tags, tasks }: Props) {
	const router = useRouter();
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
	const [defaultStartAt, setDefaultStartAt] = useState("");
	const [defaultEndAt, setDefaultEndAt] = useState("");
	const [prefillTask, setPrefillTask] = useState<TaskWithEmployee | null>(null);
	const [detailing, setDetailing] = useState<TaskWithEmployee | null>(null);
	const [editing, setEditing] = useState<TaskWithEmployee | null>(null);

	function openCreateDialog(dateKey?: string) {
		if (dateKey) {
			setDefaultStartAt(toDateTimeLocal(dateKey, "09:00"));
			setDefaultEndAt(toDateTimeLocal(dateKey, "18:00"));
			setPrefillTask(null);
		} else {
			setDefaultStartAt("");
			setDefaultEndAt("");
			setPrefillTask(null);
		}
		setCreateFormKey((value) => value + 1);
		createDialogRef.current?.showModal();
	}

	function openDuplicateDialog(task: TaskWithEmployee) {
		closeDetailDialog();
		flushSync(() => {
			setPrefillTask(task);
			setDefaultStartAt(toAppDateTimeLocal(task.start_at));
			setDefaultEndAt(toAppDateTimeLocal(task.end_at));
			setCreateFormKey((value) => value + 1);
		});
		createDialogRef.current?.showModal();
	}

	function closeCreateDialog() {
		createDialogRef.current?.close();
		setPrefillTask(null);
	}

	const closeDetailDialog = useCallback(() => {
		detailDialogRef.current?.close();
		setDetailing(null);
	}, []);

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

	function openDetailDialog(task: TaskWithEmployee) {
		flushSync(() => {
			setDetailing(task);
		});
		detailDialogRef.current?.showModal();
	}

	function openEditFromDetail() {
		if (!detailing) return;
		const task = detailing;
		closeDetailDialog();
		flushSync(() => {
			setEditing(task);
			setEditFormKey((value) => value + 1);
		});
		editDialogRef.current?.showModal();
	}

	async function handleCreate(formData: FormData) {
		await createTask(formData);
		closeCreateDialog();
		router.refresh();
	}

	const handleEditSuccess = useCallback(() => {
		closeEditDialog();
		router.refresh();
	}, [closeEditDialog, router]);

	const handleApproveSuccess = useCallback(() => {
		setDetailing((current) => (current ? { ...current, status: "approved" } : null));
		router.refresh();
	}, [router]);

	const handleCompleteSuccess = useCallback(() => {
		setDetailing((current) => (current ? { ...current, status: "done" } : null));
		closeDetailDialog();
		router.refresh();
	}, [closeDetailDialog, router]);

	const handleDeleteSuccess = useCallback(() => {
		closeDetailDialog();
		router.refresh();
	}, [closeDetailDialog, router]);

	const detailingSeriesCount = detailing
		? countSeriesTasks(tasks, detailing.recurrence_series_id)
		: 1;
	const detailingFutureCount = detailing ? countFutureSeriesTasks(tasks, detailing) : 1;
	const editingSeriesCount = editing ? countSeriesTasks(tasks, editing.recurrence_series_id) : 1;
	const editingFutureCount = editing ? countFutureSeriesTasks(tasks, editing) : 1;

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<h2>タスク（{tasks.length}）</h2>
					<div className="task-actions">
						<Link href="/task-groups" className="ghost">
							タスクグループ
						</Link>
						<button type="button" className="primary" onClick={() => openCreateDialog()}>
							新規タスク
						</button>
					</div>
				</div>
				<p className="board-hint">
					カレンダーの日付をクリックすると追加、タスクをクリックすると詳細を表示します。
				</p>
				<TaskBoard
					tasks={tasks}
					onDayClick={openCreateDialog}
					onTaskClick={openDetailDialog}
				/>
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
						<h2>{prefillTask ? "タスクを複製" : "新規タスク"}</h2>
						<button type="button" className="ghost" onClick={closeCreateDialog}>
							閉じる
						</button>
					</div>
					<TaskForm
						key={createFormKey}
						employees={employees}
						categories={categories}
						taskGroups={taskGroups}
						tags={tags}
						prefillFrom={prefillTask ?? undefined}
						action={handleCreate}
						defaultStartAt={defaultStartAt}
						defaultEndAt={defaultEndAt}
					/>
				</div>
			</dialog>

			<dialog
				ref={detailDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === detailDialogRef.current) closeDetailDialog();
				}}
			>
				<div className="task-dialog-panel">
					<div className="task-dialog-head">
						<h2>タスクの詳細</h2>
						<button type="button" className="ghost" onClick={closeDetailDialog}>
							閉じる
						</button>
					</div>
					{detailing ? (
						<TaskDetailPanel
							task={detailing}
							seriesCount={detailingSeriesCount}
							futureCount={detailingFutureCount}
							onEdit={openEditFromDetail}
							onDuplicate={() => openDuplicateDialog(detailing)}
							onApproveSuccess={handleApproveSuccess}
							onCompleteSuccess={handleCompleteSuccess}
							onDeleteSuccess={handleDeleteSuccess}
						/>
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
						<h2>タスクを編集</h2>
						<button type="button" className="ghost" onClick={closeEditDialog}>
							閉じる
						</button>
					</div>
					{editing ? (
						<TaskForm
							key={editFormKey}
							employees={employees}
							categories={categories}
							taskGroups={taskGroups}
							tags={tags}
							task={editing}
							seriesCount={editingSeriesCount}
							futureCount={editingFutureCount}
							onSuccess={handleEditSuccess}
						/>
					) : null}
				</div>
			</dialog>
		</>
	);
}

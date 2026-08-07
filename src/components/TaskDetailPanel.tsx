"use client";

import { useState, useTransition } from "react";
import { StatusIcon } from "@/components/StatusIcon";
import { deleteTask, updateTaskStatus } from "@/app/actions";
import { tintStyle } from "@/lib/colors";
import { mediaUrl } from "@/lib/media-upload";
import { formatPeriodLabel } from "@/lib/task-views";
import { TASK_STATUS_LABEL, type TaskWithEmployee } from "@/lib/types";

type Props = {
	task: TaskWithEmployee;
	onEdit: () => void;
	onCompleteSuccess: () => void;
	onDeleteSuccess: () => void;
};

export function TaskDetailPanel({ task, onEdit, onCompleteSuccess, onDeleteSuccess }: Props) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const periodLabel = formatPeriodLabel(task);
	const isDone = task.status === "done";

	function handleComplete() {
		if (isDone || pending) return;
		setError(null);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", task.id);
				formData.set("status", "done");
				await updateTaskStatus(formData);
				onCompleteSuccess();
			} catch (err) {
				setError(err instanceof Error ? err.message : "完了の保存に失敗しました");
			}
		});
	}

	function handleDelete() {
		if (pending) return;
		if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
		setError(null);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", task.id);
				await deleteTask(formData);
				onDeleteSuccess();
			} catch (err) {
				setError(err instanceof Error ? err.message : "削除に失敗しました");
			}
		});
	}

	return (
		<div className="task-detail">
			<div className="task-meta">
				<span className={`badge status-${task.status}`}>{TASK_STATUS_LABEL[task.status]}</span>
				{task.category_name ? (
					<span className="badge badge-category" style={tintStyle(task.category_color)}>
						{task.category_name}
					</span>
				) : null}
				<span className="employee" style={tintStyle(task.employee_color)}>
					{task.employee_name}
				</span>
				{periodLabel ? <span className="when">{periodLabel}</span> : <span className="when">期間なし</span>}
			</div>
			{task.tags.length > 0 ? (
				<ul className="tag-list">
					{task.tags.map((tag) => (
						<li key={tag.id} className="tag-chip" style={tintStyle(tag.color)}>
							{tag.name}
						</li>
					))}
				</ul>
			) : null}
			<h3 className="task-detail-title">{task.title}</h3>
			{task.body ? <p className="body">{task.body}</p> : null}
			{task.notes ? <p className="notes">メモ: {task.notes}</p> : null}
			{task.image_key ? (
				<a
					href={mediaUrl(task.image_key)}
					target="_blank"
					rel="noreferrer"
					className="task-detail-image"
					title="画像を開く"
				>
					{/* eslint-disable-next-line @next/next/no-img-element -- R2 配信プレビュー */}
					<img src={mediaUrl(task.image_key)} alt={`${task.title} の画像`} loading="lazy" />
				</a>
			) : null}
			{error ? <p className="form-error">{error}</p> : null}
			<div className="task-actions task-detail-actions">
				{!isDone ? (
					<button
						type="button"
						className="primary task-detail-btn task-detail-btn-complete"
						disabled={pending}
						onClick={handleComplete}
					>
						<StatusIcon status="done" className="task-detail-btn-icon" />
						<span>{pending ? "保存中…" : "完了にする"}</span>
					</button>
				) : (
					<span className="badge status-done task-detail-done-badge">
						<StatusIcon status="done" className="task-detail-btn-icon" />
						完了
					</span>
				)}
				<button
					type="button"
					className="task-detail-btn task-detail-btn-edit"
					disabled={pending}
					onClick={onEdit}
				>
					<StatusIcon status="draft" className="task-detail-btn-icon" />
					<span>編集</span>
				</button>
				<button
					type="button"
					className="danger task-detail-btn task-detail-delete"
					disabled={pending}
					onClick={handleDelete}
				>
					<DeleteIcon />
					<span>{pending ? "処理中…" : "削除"}</span>
				</button>
			</div>
		</div>
	);
}

function DeleteIcon() {
	return (
		<svg
			className="task-detail-btn-icon"
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

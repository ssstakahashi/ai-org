"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createTask, deleteTask, updateTask } from "@/app/actions";
import { RecurrenceEditScopeFields } from "@/components/RecurrenceEditScopeFields";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { StatusIcon } from "@/components/StatusIcon";
import { TaskLinkFields } from "@/components/TaskLinkFields";
import { VoiceInputField } from "@/components/VoiceInputField";
import { employeeTintStyle, masterTintStyle, tintStyle } from "@/lib/colors";
import { mediaUrl } from "@/lib/media-upload";
import { toAppDateTimeLocal } from "@/lib/timezone";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import { replaceInputFile, toWebpFile } from "@/lib/to-webp";
import {
	RECURRENCE_EDIT_SCOPE_LABEL,
	TASK_STATUS_LABEL,
	type Category,
	type Employee,
	type RecurrenceEditScope,
	type Tag,
	type TaskGroup,
	type TaskStatus,
	type TaskWithEmployee,
} from "@/lib/types";

const CREATE_STATUSES: TaskStatus[] = ["draft", "approved", "scheduled", "done"];
const EDIT_STATUSES: TaskStatus[] = ["draft", "approved", "scheduled", "done", "failed"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Props = {
	employees: Employee[];
	categories: Category[];
	taskGroups: TaskGroup[];
	tags: Tag[];
	task?: TaskWithEmployee;
	prefillFrom?: TaskWithEmployee;
	seriesCount?: number;
	futureCount?: number;
	action?: (formData: FormData) => void | Promise<void>;
	defaultEmployeeId?: string;
	defaultCategoryId?: string;
	defaultStartAt?: string;
	defaultEndAt?: string;
	defaultStatus?: TaskStatus;
	onSuccess?: () => void;
};

export function TaskForm({
	employees,
	categories,
	taskGroups,
	tags,
	task,
	prefillFrom,
	seriesCount = 1,
	futureCount = 1,
	action,
	defaultEmployeeId,
	defaultCategoryId = "",
	defaultStartAt = "",
	defaultEndAt = "",
	defaultStatus = "draft",
	onSuccess,
}: Props) {
	const isEdit = Boolean(task);
	const source = task ?? prefillFrom;
	const statuses = isEdit ? EDIT_STATUSES : CREATE_STATUSES;
	const [pending, setPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
	const [imageFileName, setImageFileName] = useState<string | null>(null);
	const [clearImage, setClearImage] = useState(false);
	const [clearDuplicateImage, setClearDuplicateImage] = useState(false);
	const [converting, setConverting] = useState(false);
	const [taskLinks, setTaskLinks] = useState<{ url: string; label: string }[]>(
		source?.links.map((link) => ({ url: link.url, label: link.label })) ?? [],
	);
	const [editScope, setEditScope] = useState<RecurrenceEditScope>("this");
	const [deleteScope, setDeleteScope] = useState<RecurrenceEditScope>("this");
	const isSeriesEdit = isEdit && seriesCount > 1;
	const editFormId = task ? `task-edit-form-${task.id}` : undefined;
	const applyDatesAndImage = !isSeriesEdit || editScope === "this";

	const selectedEmployeeId =
		source?.employee_id ??
		(defaultEmployeeId && employees.some((employee) => employee.id === defaultEmployeeId)
			? defaultEmployeeId
			: (employees[0]?.id ?? ""));
	const selectedCategoryId = source?.category_id ?? defaultCategoryId;
	const selectedTaskGroupId = source?.task_group_id ?? "";
	const selectedStatus = source?.status ?? defaultStatus;
	const selectedTagIds = new Set(source?.tags.map((tag) => tag.id) ?? []);
	const startAtDefault = source
		? toAppDateTimeLocal(source.start_at)
		: defaultStartAt;
	const endAtDefault = source ? toAppDateTimeLocal(source.end_at) : defaultEndAt;

	const duplicateImageKey =
		!isEdit && prefillFrom?.image_key && !clearDuplicateImage ? prefillFrom.image_key : null;
	const storedImageUrl = task?.image_key
		? mediaUrl(task.image_key)
		: duplicateImageKey
			? mediaUrl(duplicateImageKey)
			: null;
	const previewUrl =
		localPreviewUrl ?? (!clearImage && !clearDuplicateImage ? storedImageUrl : null);
	const previewCaption = localPreviewUrl
		? imageFileName
		: storedImageUrl && (!clearImage || duplicateImageKey)
			? isEdit
				? "現在の画像"
				: "複製元の画像"
			: null;

	useEffect(() => {
		return () => {
			if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
		};
	}, [localPreviewUrl]);

	async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.target;
		const file = input.files?.[0];
		if (!file) {
			setClientError(null);
			setLocalPreviewUrl(null);
			setImageFileName(null);
			return;
		}

		if (file.size > MAX_IMAGE_BYTES) {
			setClientError("画像は 8MB 以下にしてください");
			setLocalPreviewUrl(null);
			setImageFileName(null);
			input.value = "";
			return;
		}

		setConverting(true);
		setClientError(null);
		try {
			const webp = await toWebpFile(file);
			if (webp.size > MAX_IMAGE_BYTES) {
				setClientError("WebP 変換後の画像が 8MB を超えています");
				setLocalPreviewUrl(null);
				setImageFileName(null);
				input.value = "";
				return;
			}
			replaceInputFile(input, webp);
			setClearImage(false);
			setLocalPreviewUrl(URL.createObjectURL(webp));
			setImageFileName(webp.name);
		} catch {
			setClientError("画像を WebP に変換できませんでした");
			setLocalPreviewUrl(null);
			setImageFileName(null);
			input.value = "";
		} finally {
			setConverting(false);
		}
	}

	async function handleDelete() {
		if (!task || pending) return;
		const isSeries = seriesCount > 1;
		const scopeLabel = isSeries ? RECURRENCE_EDIT_SCOPE_LABEL[deleteScope] : "このタスク";
		const count =
			deleteScope === "all" ? seriesCount : deleteScope === "future" ? futureCount : 1;
		const countHint = isSeries && count > 1 ? `（${count}件）` : "";
		if (!window.confirm(`「${task.title}」を${scopeLabel}${countHint}削除しますか？`)) return;
		setClientError(null);
		setPending(true);
		try {
			const formData = new FormData();
			formData.set("id", task.id);
			formData.set("edit_scope", deleteScope);
			await deleteTask(formData);
			onSuccess?.();
		} catch (error) {
			if (recoverFromStaleServerAction(error)) return;
			const message = error instanceof Error ? error.message : String(error);
			setClientError(message || "削除に失敗しました");
		} finally {
			setPending(false);
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		setClientError(null);
		setPending(true);
		try {
			const formData = new FormData(form);
			formData.set("task_links_json", JSON.stringify(taskLinks));
			if (action) {
				await action(formData);
			} else if (isEdit) {
				await updateTask(formData);
			} else {
				await createTask(formData);
			}
			if (!isEdit) {
				form.reset();
				setTaskLinks([]);
				setClearDuplicateImage(false);
			}
			onSuccess?.();
		} catch (error) {
			if (recoverFromStaleServerAction(error)) return;
			const message = error instanceof Error ? error.message : String(error);
			setClientError(message || "タスクの保存に失敗しました");
		} finally {
			setPending(false);
		}
	}

	const submitLabel = pending
		? "保存中…"
		: isEdit
			? isSeriesEdit && editScope !== "this"
				? `変更を保存（${targetCountLabel(editScope, seriesCount, futureCount)}）`
				: "変更を保存"
			: "タスクを追加";

	const fieldGrid = (
		<div className="field-grid">
			<div className="choice-field full">
				<span>担当従業員</span>
				{employees.length === 0 ? (
					<p className="field-hint">従業員を先に登録してください</p>
				) : (
					<div className="choice-options" role="radiogroup" aria-label="担当従業員">
						{employees.map((employee) => {
							const employeeStyle = employeeTintStyle(
								employee.color,
								employee.text_color,
							);
							return (
							<label
								key={employee.id}
								className={
									employeeStyle
										? "choice-option employee-choice-option"
										: "choice-option"
								}
								style={employeeStyle}
							>
								<input
									type="radio"
									name="employee_id"
									value={employee.id}
									required
									defaultChecked={employee.id === selectedEmployeeId}
								/>
								<span>{employee.name}</span>
							</label>
							);
						})}
					</div>
				)}
			</div>
			<div className="choice-field full">
				<span>カテゴリ</span>
				<div className="choice-options" role="radiogroup" aria-label="カテゴリ">
					<label className="choice-option">
						<input
							type="radio"
							name="category_id"
							value=""
							defaultChecked={!selectedCategoryId}
						/>
						<span>未分類</span>
					</label>
					{categories.map((category) => (
						<label
							key={category.id}
							className="choice-option"
							style={tintStyle(category.color)}
						>
							<input
								type="radio"
								name="category_id"
								value={category.id}
								defaultChecked={category.id === selectedCategoryId}
							/>
							<span>{category.name}</span>
						</label>
					))}
				</div>
			</div>
			<div className="choice-field full">
				<span>タスクグループ</span>
				<div className="choice-options" role="radiogroup" aria-label="タスクグループ">
					<label className="choice-option">
						<input
							type="radio"
							name="task_group_id"
							value=""
							defaultChecked={!selectedTaskGroupId}
						/>
						<span>未設定</span>
					</label>
					{taskGroups.map((taskGroup) => (
						<label
							key={taskGroup.id}
							className="choice-option"
							style={tintStyle(taskGroup.color)}
						>
							<input
								type="radio"
								name="task_group_id"
								value={taskGroup.id}
								defaultChecked={taskGroup.id === selectedTaskGroupId}
							/>
							<span>{taskGroup.name}</span>
						</label>
					))}
				</div>
			</div>
			{isSeriesEdit ? (
				<RecurrenceEditScopeFields
					seriesCount={seriesCount}
					futureCount={futureCount}
					onScopeChange={setEditScope}
				/>
			) : null}
			{applyDatesAndImage ? (
				<div className="task-period-row">
					<label>
						<span>開始</span>
						<input type="datetime-local" name="start_at" defaultValue={startAtDefault} />
					</label>
					<label>
						<span>終了</span>
						<input type="datetime-local" name="end_at" defaultValue={endAtDefault} />
					</label>
				</div>
			) : (
				<p className="field-hint full">
					各タスクの開始・終了日時は個別のままです（{formatPeriodHint(source)}）。
				</p>
			)}
			<div className="status-field full">
				<span>ステータス</span>
				<div className="status-options" role="radiogroup" aria-label="ステータス">
					{statuses.map((status) => (
						<label key={status} className={`status-option status-${status}`}>
							<input
								type="radio"
								name="status"
								value={status}
								defaultChecked={status === selectedStatus}
							/>
							<StatusIcon status={status} />
							<span>{TASK_STATUS_LABEL[status]}</span>
						</label>
					))}
				</div>
			</div>
			<VoiceInputField
				label="タイトル"
				name="title"
				required
				placeholder="例: 週次リサーチまとめ"
				defaultValue={source?.title ?? ""}
				disabled={pending || converting}
			/>
			<VoiceInputField
				label="内容・指示"
				name="body"
				multiline
				rows={4}
				placeholder="作業内容・成果物の要件など"
				defaultValue={source?.body ?? ""}
				disabled={pending || converting}
			/>
			{!isEdit ? <RecurrenceFields /> : null}
			<fieldset className="full tag-fieldset">
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
					<p className="field-hint">まだタグがありません。下の欄で新規追加できます。</p>
				)}
				<label className="new-tag-field">
					<span>新規タグ（カンマ区切りで追加）</span>
					<input name="new_tags" placeholder="例: 緊急, 週次" />
				</label>
			</fieldset>
			<label className="full">
				<span>画像</span>
				{applyDatesAndImage ? (
					<>
						<input
							type="file"
							name="image"
							accept="image/*"
							onChange={handleImageChange}
							disabled={pending || converting}
						/>
						<p className="field-hint">
							{converting
								? "WebP に変換中…"
								: "選択後に WebP へ変換して保存します（最大 8MB）"}
						</p>
					</>
				) : (
					<p className="field-hint">画像の変更は「このタスクのみ」を選んだときだけ可能です。</p>
				)}
				{previewUrl ? (
					<figure className="image-preview">
						{/* eslint-disable-next-line @next/next/no-img-element -- blob / R2 配信プレビュー */}
						<img src={previewUrl} alt={previewCaption ?? "画像プレビュー"} />
						{previewCaption ? (
							<figcaption className="field-hint">{previewCaption}</figcaption>
						) : null}
					</figure>
				) : null}
				{task?.image_key && !localPreviewUrl && !clearImage && applyDatesAndImage ? (
					<p className="field-hint">新しいファイルを選ぶと差し替えます。</p>
				) : null}
				{prefillFrom?.image_key && !task && !localPreviewUrl ? (
					<label className="inline-check">
						<input
							type="checkbox"
							checked={clearDuplicateImage}
							onChange={(event) => {
								const checked = event.target.checked;
								setClearDuplicateImage(checked);
								if (checked) {
									const imageInput = event.target.form?.elements.namedItem("image");
									if (imageInput instanceof HTMLInputElement) {
										imageInput.value = "";
									}
									setLocalPreviewUrl(null);
									setImageFileName(null);
								}
							}}
						/>
						<span>画像を含めない</span>
					</label>
				) : null}
				{task?.image_key && applyDatesAndImage ? (
					<label className="inline-check">
						<input
							type="checkbox"
							name="clear_image"
							value="1"
							checked={clearImage}
							onChange={(event) => {
								const checked = event.target.checked;
								setClearImage(checked);
								if (checked) {
									const imageInput = event.target.form?.elements.namedItem("image");
									if (imageInput instanceof HTMLInputElement) {
										imageInput.value = "";
									}
									setLocalPreviewUrl(null);
									setImageFileName(null);
								}
							}}
						/>
						<span>画像を削除する</span>
					</label>
				) : null}
			</label>
			{applyDatesAndImage ? (
				<TaskLinkFields links={source?.links} onChange={setTaskLinks} />
			) : (
				<p className="field-hint full">
					リンクの変更は「このタスクのみ」を選んだときだけ可能です。
				</p>
			)}
			<VoiceInputField
				label="メモ（AI／人間の相談用）"
				name="notes"
				multiline
				rows={2}
				placeholder="トーン、禁止事項など"
				defaultValue={source?.notes ?? ""}
				disabled={pending || converting}
			/>
			{isSeriesEdit ? (
				<RecurrenceEditScopeFields
					name="delete_scope"
					mode="delete"
					seriesCount={seriesCount}
					futureCount={futureCount}
					onScopeChange={setDeleteScope}
				/>
			) : null}
		</div>
	);

	if (isEdit && task && editFormId) {
		return (
			<>
				<form
					id={editFormId}
					onSubmit={handleSubmit}
					className="task-form task-dialog-form-docked"
					encType="multipart/form-data"
				>
					<input type="hidden" name="id" value={task.id} />
					<div className="task-dialog-scroll requirement-edit-dialog-body">
						{clientError ? <p className="form-error">{clientError}</p> : null}
						{fieldGrid}
					</div>
				</form>
				<div className="task-actions task-dialog-footer requirement-edit-dialog-footer">
					<button
						type="button"
						className="x-schedule-action-btn x-action-delete requirement-edit-footer-btn"
						disabled={pending || converting}
						onClick={handleDelete}
					>
						<span className="x-schedule-action-icon">
							<DeleteIcon />
						</span>
						<span>{pending ? "処理中…" : "削除"}</span>
					</button>
					<button
						type="submit"
						form={editFormId}
						className="x-schedule-action-btn x-action-complete requirement-edit-footer-btn"
						disabled={pending || converting}
					>
						<span className="x-schedule-action-icon">
							<StatusIcon status="done" className="x-schedule-action-svg" />
						</span>
						<span>{submitLabel}</span>
					</button>
				</div>
			</>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="task-form" encType="multipart/form-data">
			{duplicateImageKey ? (
				<input type="hidden" name="duplicate_image_key" value={duplicateImageKey} />
			) : null}
			{clientError ? <p className="form-error">{clientError}</p> : null}
			{fieldGrid}
			<button type="submit" className="primary" disabled={pending || converting}>
				{submitLabel}
			</button>
		</form>
	);
}

function formatPeriodHint(task?: TaskWithEmployee) {
	if (!task?.start_at && !task?.end_at) return "期間なし";
	if (task.start_at && task.end_at) {
		return `${toAppDateTimeLocal(task.start_at)} 〜 ${toAppDateTimeLocal(task.end_at)}`;
	}
	return toAppDateTimeLocal(task.start_at ?? task.end_at);
}

function targetCountLabel(
	scope: RecurrenceEditScope,
	seriesCount: number,
	futureCount: number,
) {
	if (scope === "all") return `${seriesCount}件`;
	if (scope === "future") return `${futureCount}件`;
	return "1件";
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

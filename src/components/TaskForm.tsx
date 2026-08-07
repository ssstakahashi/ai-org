"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createTask, updateTask } from "@/app/actions";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { StatusIcon } from "@/components/StatusIcon";
import { tintStyle } from "@/lib/colors";
import { mediaUrl } from "@/lib/media-upload";
import { toAppDateTimeLocal } from "@/lib/timezone";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import { replaceInputFile, toWebpFile } from "@/lib/to-webp";
import {
	TASK_STATUS_LABEL,
	type Category,
	type Employee,
	type Tag,
	type TaskStatus,
	type TaskWithEmployee,
} from "@/lib/types";

const CREATE_STATUSES: TaskStatus[] = ["approved", "scheduled", "done"];
const EDIT_STATUSES: TaskStatus[] = ["draft", "approved", "scheduled", "done", "failed"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Props = {
	employees: Employee[];
	categories: Category[];
	tags: Tag[];
	task?: TaskWithEmployee;
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
	tags,
	task,
	action,
	defaultEmployeeId,
	defaultCategoryId = "",
	defaultStartAt = "",
	defaultEndAt = "",
	defaultStatus = "approved",
	onSuccess,
}: Props) {
	const isEdit = Boolean(task);
	const statuses = isEdit ? EDIT_STATUSES : CREATE_STATUSES;
	const [pending, setPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
	const [imageFileName, setImageFileName] = useState<string | null>(null);
	const [clearImage, setClearImage] = useState(false);
	const [converting, setConverting] = useState(false);

	const selectedEmployeeId =
		task?.employee_id ??
		(defaultEmployeeId && employees.some((employee) => employee.id === defaultEmployeeId)
			? defaultEmployeeId
			: (employees[0]?.id ?? ""));
	const selectedCategoryId = task?.category_id ?? defaultCategoryId;
	const selectedStatus = task?.status ?? defaultStatus;
	const selectedTagIds = new Set(task?.tags.map((tag) => tag.id) ?? []);
	const startAtDefault = task ? toAppDateTimeLocal(task.start_at) : defaultStartAt;
	const endAtDefault = task ? toAppDateTimeLocal(task.end_at) : defaultEndAt;

	const storedImageUrl = task?.image_key ? mediaUrl(task.image_key) : null;
	const previewUrl = localPreviewUrl ?? (!clearImage ? storedImageUrl : null);
	const previewCaption = localPreviewUrl
		? imageFileName
		: storedImageUrl && !clearImage
			? "現在の画像"
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

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		setClientError(null);
		setPending(true);
		try {
			const formData = new FormData(form);
			if (action) {
				await action(formData);
			} else if (isEdit) {
				await updateTask(formData);
			} else {
				await createTask(formData);
			}
			if (!isEdit) form.reset();
			onSuccess?.();
		} catch (error) {
			if (recoverFromStaleServerAction(error)) return;
			const message = error instanceof Error ? error.message : String(error);
			setClientError(message || "タスクの保存に失敗しました");
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="task-form" encType="multipart/form-data">
			{task ? <input type="hidden" name="id" value={task.id} /> : null}
			{clientError ? <p className="form-error">{clientError}</p> : null}
			<div className="field-grid">
				<div className="choice-field full">
					<span>担当従業員</span>
					{employees.length === 0 ? (
						<p className="field-hint">従業員を先に登録してください</p>
					) : (
						<div className="choice-options" role="radiogroup" aria-label="担当従業員">
							{employees.map((employee) => (
								<label
									key={employee.id}
									className="choice-option"
									style={tintStyle(employee.color)}
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
							))}
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
				<div className="status-field">
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
				<label>
					<span>開始</span>
					<input type="datetime-local" name="start_at" defaultValue={startAtDefault} />
				</label>
				<label>
					<span>終了</span>
					<input type="datetime-local" name="end_at" defaultValue={endAtDefault} />
				</label>
				<label className="full">
					<span>タイトル</span>
					<input
						name="title"
						required
						placeholder="例: 週次リサーチまとめ"
						defaultValue={task?.title ?? ""}
					/>
				</label>
				<label className="full">
					<span>内容・指示</span>
					<textarea
						name="body"
						rows={4}
						placeholder="作業内容・成果物の要件など"
						defaultValue={task?.body ?? ""}
					/>
				</label>
				{!isEdit ? <RecurrenceFields /> : null}
				<fieldset className="full tag-fieldset">
					<legend>タグ</legend>
					{tags.length > 0 ? (
						<div className="tag-options">
							{tags.map((tag) => (
								<label
									key={tag.id}
									className="tag-option"
									style={tintStyle(tag.color)}
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
					{previewUrl ? (
						<figure className="image-preview">
							{/* eslint-disable-next-line @next/next/no-img-element -- blob / R2 配信プレビュー */}
							<img src={previewUrl} alt={previewCaption ?? "画像プレビュー"} />
							{previewCaption ? (
								<figcaption className="field-hint">{previewCaption}</figcaption>
							) : null}
						</figure>
					) : null}
					{task?.image_key && !localPreviewUrl && !clearImage ? (
						<p className="field-hint">新しいファイルを選ぶと差し替えます。</p>
					) : null}
					{task?.image_key ? (
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
				<label className="full">
					<span>メモ（AI／人間の相談用）</span>
					<textarea
						name="notes"
						rows={2}
						placeholder="トーン、禁止事項、参考リンクなど"
						defaultValue={task?.notes ?? ""}
					/>
				</label>
			</div>
			<button type="submit" className="primary" disabled={pending || converting}>
				{pending ? "保存中…" : isEdit ? "変更を保存" : "タスクを追加"}
			</button>
		</form>
	);
}

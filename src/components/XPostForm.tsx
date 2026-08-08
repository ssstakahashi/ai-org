"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { createXPostFormAction, updateXPostFormAction } from "@/app/actions";
import { StatusIcon } from "@/components/StatusIcon";
import { mediaUrl } from "@/lib/media-upload";
import { toAppDateTimeLocal } from "@/lib/timezone";
import { replaceInputFile, toWebpFile } from "@/lib/to-webp";
import { X_POST_STATUS_LABEL, type TaskStatus, type XPost } from "@/lib/types";

const CREATE_STATUSES: TaskStatus[] = ["draft", "approved", "scheduled", "done"];
const EDIT_STATUSES: TaskStatus[] = ["draft", "approved", "scheduled", "done", "failed"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Props = {
	post?: XPost;
	defaultScheduledAt?: string;
	defaultStatus?: TaskStatus;
	onSuccess?: () => void;
};

type FormState = { error: string | null; ok: boolean };

const initialState: FormState = { error: null, ok: false };

export function XPostForm({
	post,
	defaultScheduledAt = "",
	defaultStatus = "draft",
	onSuccess,
}: Props) {
	const isEdit = Boolean(post);
	const statuses = isEdit ? EDIT_STATUSES : CREATE_STATUSES;
	const [status, setStatus] = useState<TaskStatus>(post?.status ?? defaultStatus);
	const [clientError, setClientError] = useState<string | null>(null);
	const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
	const [imageFileName, setImageFileName] = useState<string | null>(null);
	const [clearImage, setClearImage] = useState(false);
	const [converting, setConverting] = useState(false);
	const [state, formAction, pending] = useActionState(
		isEdit ? updateXPostFormAction : createXPostFormAction,
		initialState,
	);
	const scheduledRequired = status === "scheduled";
	const scheduledAtDefault = post
		? toAppDateTimeLocal(post.scheduled_at)
		: defaultScheduledAt;
	const error = clientError ?? state.error;
	const storedImageUrl = post?.image_key ? mediaUrl(post.image_key) : null;
	const previewUrl = localPreviewUrl ?? (!clearImage ? storedImageUrl : null);
	const previewCaption = localPreviewUrl
		? imageFileName
		: storedImageUrl && !clearImage
			? "現在の画像"
			: null;

	useEffect(() => {
		if (state.ok) onSuccess?.();
	}, [state.ok, onSuccess]);

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

	return (
		<form action={formAction} className="task-form">
			{post ? <input type="hidden" name="id" value={post.id} /> : null}
			{error ? <p className="form-error">{error}</p> : null}
			<div className="field-grid">
				<div className="status-field">
					<span>ステータス</span>
					<div className="status-options" role="radiogroup" aria-label="ステータス">
						{statuses.map((value) => (
							<label key={value} className={`status-option status-${value}`}>
								<input
									type="radio"
									name="status"
									value={value}
									checked={status === value}
									onChange={() => setStatus(value)}
								/>
								<StatusIcon status={value} />
								<span>{X_POST_STATUS_LABEL[value]}</span>
							</label>
						))}
					</div>
				</div>
				<label>
					<span>
						予約日時
						{scheduledRequired ? <span className="req">必須</span> : null}
					</span>
					<input
						type="datetime-local"
						name="scheduled_at"
						defaultValue={scheduledAtDefault}
						required={scheduledRequired}
					/>
					{scheduledRequired ? (
						<p className="field-hint">「予約」のときは日時を指定してください</p>
					) : null}
				</label>
				<label className="full">
					<span>タイトル</span>
					<input
						name="title"
						required
						placeholder="例: 今週の畑便り"
						defaultValue={post?.title ?? ""}
					/>
				</label>
				<label className="full">
					<span>投稿文</span>
					<textarea
						name="body"
						rows={isEdit ? 10 : 4}
						placeholder="X に投稿する本文（280文字以内）"
						defaultValue={post?.body ?? ""}
					/>
				</label>
				<label className="full">
					<span>画像</span>
					<input
						type="file"
						name="image"
						accept="image/*"
						onChange={handleImageChange}
						disabled={converting || pending}
					/>
					<p className="field-hint">
						{converting
							? "WebP に変換中…"
							: "選択後に WebP へ変換して保存します（最大 8MB）"}
					</p>
					{previewUrl ? (
						<figure className="image-preview">
							{/* eslint-disable-next-line @next/next/no-img-element -- blob / R2 配信プレビュー */}
							<img
								src={previewUrl}
								alt={previewCaption ?? "画像プレビュー"}
							/>
							{previewCaption ? (
								<figcaption className="field-hint">{previewCaption}</figcaption>
							) : null}
						</figure>
					) : null}
					{post?.image_key && !localPreviewUrl && !clearImage ? (
						<p className="field-hint">新しいファイルを選ぶと差し替えます。</p>
					) : null}
					{post?.image_key ? (
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
										const imageInput = event.target
											.form?.elements.namedItem("image");
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
					<span>メモ</span>
					<textarea
						name="notes"
						rows={2}
						placeholder="トーン、禁止事項、参考リンクなど"
						defaultValue={post?.notes ?? ""}
					/>
				</label>
			</div>
			<button type="submit" className="primary" disabled={pending || converting}>
				{pending ? "保存中…" : isEdit ? "変更を保存" : "投稿を追加"}
			</button>
		</form>
	);
}

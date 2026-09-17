"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { createBlogPostFormAction, updateBlogPostFormAction } from "@/app/actions";
import { BlogPostStatusField } from "@/components/BlogPostStatusField";
import {
	BLOG_FIGURE_MAX,
	blogHeroSrc,
	parseBlogFigures,
} from "@/lib/blog-posts";
import { mediaUrl } from "@/lib/media-upload";
import { replaceInputFile, replaceInputFiles, toWebpFile } from "@/lib/to-webp";
import {
	BLOG_POST_DESTINATION_DEFAULT,
	BLOG_POST_DESTINATION_LABEL,
	BLOG_POST_DESTINATION_OPTIONS,
	type BlogPost,
	type BlogPostDestination,
} from "@/lib/types";

type Props = {
	post?: BlogPost;
	formId?: string;
	onSuccess?: () => void;
	defaultDestination?: BlogPostDestination;
};

type FormState = { error: string | null; ok: boolean };

const initialState: FormState = { error: null, ok: false };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type LocalPreview = { url: string; name: string };

export function BlogPostForm({ post, formId, onSuccess, defaultDestination }: Props) {
	const isEdit = Boolean(post);
	const [state, formAction, pending] = useActionState(
		isEdit ? updateBlogPostFormAction : createBlogPostFormAction,
		initialState,
	);
	const [clientError, setClientError] = useState<string | null>(null);
	const [converting, setConverting] = useState(false);
	const [thumbnailPreview, setThumbnailPreview] = useState<LocalPreview | null>(null);
	const [clearThumbnail, setClearThumbnail] = useState(false);
	const [figurePreviews, setFigurePreviews] = useState<LocalPreview[]>([]);
	const [removedFigureKeys, setRemovedFigureKeys] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (state.ok) onSuccess?.();
	}, [state.ok, onSuccess]);

	useEffect(() => {
		return () => {
			if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview.url);
			for (const preview of figurePreviews) URL.revokeObjectURL(preview.url);
		};
	}, [thumbnailPreview, figurePreviews]);

	const destination = post?.destination ?? defaultDestination ?? BLOG_POST_DESTINATION_DEFAULT;
	const storedHero = post && !clearThumbnail ? blogHeroSrc(post) : null;
	const heroUrl = thumbnailPreview?.url ?? storedHero;
	const storedFigures = parseBlogFigures(post?.figure_keys);
	const keptFigureCount = storedFigures.filter(
		(figure) => !removedFigureKeys.has(figure.key),
	).length;
	const error = clientError ?? state.error;
	const busy = pending || converting;

	async function handleThumbnailChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.target;
		const file = input.files?.[0];
		if (!file) {
			setThumbnailPreview(null);
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setClientError("TOP画像は 8MB 以下にしてください");
			input.value = "";
			setThumbnailPreview(null);
			return;
		}
		setConverting(true);
		setClientError(null);
		try {
			const webp = await toWebpFile(file);
			if (webp.size > MAX_IMAGE_BYTES) {
				setClientError("WebP 変換後の TOP画像が 8MB を超えています");
				input.value = "";
				setThumbnailPreview(null);
				return;
			}
			replaceInputFile(input, webp);
			setClearThumbnail(false);
			setThumbnailPreview({ url: URL.createObjectURL(webp), name: webp.name });
		} catch {
			setClientError("TOP画像を WebP に変換できませんでした");
			input.value = "";
			setThumbnailPreview(null);
		} finally {
			setConverting(false);
		}
	}

	async function handleFiguresChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.target;
		const files = [...(input.files ?? [])];
		if (files.length === 0) {
			setFigurePreviews([]);
			return;
		}
		const remaining = BLOG_FIGURE_MAX - keptFigureCount;
		if (files.length > remaining) {
			setClientError(`図表・グラフはあわせて ${BLOG_FIGURE_MAX} 枚までです`);
			input.value = "";
			setFigurePreviews([]);
			return;
		}
		if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
			setClientError("図表・グラフは各 8MB 以下にしてください");
			input.value = "";
			setFigurePreviews([]);
			return;
		}
		setConverting(true);
		setClientError(null);
		try {
			const converted: File[] = [];
			for (const file of files) {
				const webp = await toWebpFile(file);
				if (webp.size > MAX_IMAGE_BYTES) {
					setClientError("WebP 変換後の図表が 8MB を超えています");
					input.value = "";
					setFigurePreviews([]);
					return;
				}
				converted.push(webp);
			}
			replaceInputFiles(input, converted);
			setFigurePreviews(
				converted.map((file) => ({ url: URL.createObjectURL(file), name: file.name })),
			);
		} catch {
			setClientError("図表・グラフを WebP に変換できませんでした");
			input.value = "";
			setFigurePreviews([]);
		} finally {
			setConverting(false);
		}
	}

	return (
		<form id={formId} action={formAction} className="task-form">
			{post ? <input type="hidden" name="id" value={post.id} /> : null}
			{error ? <p className="form-error">{error}</p> : null}
			<div className="field-grid">
				<BlogPostStatusField
					selectedStatus={post?.status}
					formId={formId}
				/>
				<label>
					<span>投稿先</span>
					<select name="destination" defaultValue={destination} form={formId}>
						{BLOG_POST_DESTINATION_OPTIONS.map((value) => (
							<option key={value} value={value}>
								{BLOG_POST_DESTINATION_LABEL[value]}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>スラッグ</span>
					<input
						name="slug"
						defaultValue={post?.slug ?? ""}
						placeholder="例: ai-staff-first-operations"
					/>
					<p className="field-hint">空欄ならタイトルから自動生成します</p>
				</label>
				<label>
					<span>カテゴリ</span>
					<input
						name="category"
						defaultValue={post?.category ?? ""}
						placeholder="例: 経営"
					/>
				</label>
				<label>
					<span>公開日表示</span>
					<input
						name="published_on"
						defaultValue={post?.published_on ?? ""}
						placeholder="例: 2026年9月9日"
					/>
				</label>
				<label>
					<span>タグ</span>
					<input
						name="tags"
						defaultValue={post?.tags ?? ""}
						placeholder="例: AI, DX, 中小企業"
					/>
				</label>
				<label className="full">
					<span>
						タイトル
						<span className="req">必須</span>
					</span>
					<input
						name="title"
						required
						defaultValue={post?.title ?? ""}
						placeholder="記事タイトル"
					/>
				</label>
				<label className="full">
					<span>リード文</span>
					<textarea
						name="excerpt"
						rows={3}
						className="requirement-body-textarea"
						defaultValue={post?.excerpt ?? ""}
						placeholder="一覧用の短い紹介文"
					/>
				</label>
				<label className="full">
					<span>本文</span>
					<textarea
						name="body"
						rows={isEdit ? 16 : 10}
						className="requirement-body-textarea"
						defaultValue={post?.body ?? ""}
						placeholder="確認用の本文（Markdown 可）"
					/>
				</label>
				<label className="full">
					<span>TOP画像</span>
					<input
						type="file"
						name="thumbnail"
						accept="image/*"
						onChange={handleThumbnailChange}
						disabled={busy}
					/>
					<p className="field-hint">
						{converting
							? "WebP に変換中…"
							: "記事の冒頭・一覧用。選択後に WebP へ変換して保存します（最大 8MB）"}
					</p>
					{heroUrl ? (
						<figure className="image-preview">
							{/* eslint-disable-next-line @next/next/no-img-element -- blob / R2 配信プレビュー */}
							<img
								src={heroUrl}
								alt={thumbnailPreview?.name ?? `${post?.title ?? "記事"} の TOP画像`}
							/>
							<figcaption className="field-hint">
								{thumbnailPreview?.name ?? "現在の TOP画像"}
							</figcaption>
						</figure>
					) : null}
					{post?.thumbnail_key && !thumbnailPreview ? (
						<label className="inline-check">
							<input
								type="checkbox"
								name="clear_thumbnail"
								value="1"
								checked={clearThumbnail}
								onChange={(event) => {
									const checked = event.target.checked;
									setClearThumbnail(checked);
									if (checked) {
										const imageInput = event.target.form?.elements.namedItem("thumbnail");
										if (imageInput instanceof HTMLInputElement) {
											imageInput.value = "";
										}
										setThumbnailPreview(null);
									}
								}}
							/>
							<span>TOP画像を削除する</span>
						</label>
					) : null}
				</label>
				<label className="full">
					<span>サムネイル URL</span>
					<input
						name="thumbnail_url"
						defaultValue={post?.thumbnail_url ?? ""}
						placeholder="https://..."
					/>
					<p className="field-hint">外部 URL があるときだけ入力。TOP画像を上げた場合は空欄で構いません</p>
				</label>
				<div className="full">
					<label>
						<span>図表・グラフ</span>
						<input
							type="file"
							name="figures"
							accept="image/*"
							multiple
							onChange={handleFiguresChange}
							disabled={busy}
						/>
					</label>
					<p className="field-hint">
						内容の説明用です。複数選択できます（合計 {BLOG_FIGURE_MAX} 枚、各最大 8MB）
					</p>
					{storedFigures.length > 0 || figurePreviews.length > 0 ? (
						<div className="blog-figure-previews">
							{storedFigures.map((figure) => (
								<figure key={figure.key} className="image-preview">
									{/* eslint-disable-next-line @next/next/no-img-element -- R2 配信プレビュー */}
									<img src={mediaUrl(figure.key)} alt={figure.name} />
									<figcaption className="field-hint">{figure.name}</figcaption>
									<label className="inline-check">
										<input
											type="checkbox"
											name="remove_figure"
											value={figure.key}
											checked={removedFigureKeys.has(figure.key)}
											onChange={(event) => {
												const checked = event.target.checked;
												setRemovedFigureKeys((current) => {
													const next = new Set(current);
													if (checked) next.add(figure.key);
													else next.delete(figure.key);
													return next;
												});
											}}
										/>
										<span>この図表を削除する</span>
									</label>
								</figure>
							))}
							{figurePreviews.map((preview) => (
								<figure key={preview.url} className="image-preview">
									{/* eslint-disable-next-line @next/next/no-img-element -- blob プレビュー */}
									<img src={preview.url} alt={preview.name} />
									<figcaption className="field-hint">{preview.name}（追加予定）</figcaption>
								</figure>
							))}
						</div>
					) : null}
				</div>
				<label className="full">
					<span>メモ</span>
					<textarea
						name="notes"
						rows={2}
						defaultValue={post?.notes ?? ""}
						placeholder="確認時の指摘、公開先リポのパスなど"
					/>
				</label>
			</div>
			{formId ? null : (
				<button type="submit" className="primary" disabled={busy}>
					{pending ? "保存中…" : converting ? "変換中…" : isEdit ? "変更を保存" : "下書きを追加"}
				</button>
			)}
		</form>
	);
}

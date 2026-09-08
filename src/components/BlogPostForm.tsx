"use client";

import { useActionState, useEffect } from "react";
import { createBlogPostFormAction, updateBlogPostFormAction } from "@/app/actions";
import { BlogPostStatusField } from "@/components/BlogPostStatusField";
import type { BlogPost } from "@/lib/types";

type Props = {
	post?: BlogPost;
	formId?: string;
	onSuccess?: () => void;
};

type FormState = { error: string | null; ok: boolean };

const initialState: FormState = { error: null, ok: false };

export function BlogPostForm({ post, formId, onSuccess }: Props) {
	const isEdit = Boolean(post);
	const [state, formAction, pending] = useActionState(
		isEdit ? updateBlogPostFormAction : createBlogPostFormAction,
		initialState,
	);

	useEffect(() => {
		if (state.ok) onSuccess?.();
	}, [state.ok, onSuccess]);

	return (
		<form id={formId} action={formAction} className="task-form">
			{post ? <input type="hidden" name="id" value={post.id} /> : null}
			{state.error ? <p className="form-error">{state.error}</p> : null}
			<div className="field-grid">
				<BlogPostStatusField
					selectedStatus={post?.status}
					formId={formId}
				/>
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
					<span>サムネイル URL</span>
					<input
						name="thumbnail_url"
						defaultValue={post?.thumbnail_url ?? ""}
						placeholder="https://..."
					/>
				</label>
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
				<button type="submit" className="primary" disabled={pending}>
					{pending ? "保存中…" : isEdit ? "変更を保存" : "下書きを追加"}
				</button>
			)}
		</form>
	);
}

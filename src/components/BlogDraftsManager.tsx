"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useTransition,
	type ChangeEvent,
	type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { deleteBlogPost, updateBlogPostStatus } from "@/app/actions";
import { BlogPostForm } from "@/components/BlogPostForm";
import { StatusIcon } from "@/components/StatusIcon";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import { formatInAppTz } from "@/lib/timezone";
import {
	BLOG_POST_STATUS_CLASS,
	BLOG_POST_STATUS_ICON,
	BLOG_POST_STATUS_LABEL,
	BLOG_POST_STATUS_OPTIONS,
	type BlogPost,
	type BlogPostStatus,
} from "@/lib/types";

type Props = {
	posts: BlogPost[];
};

function formatWhen(value: string) {
	const formatted = formatInAppTz(value, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	return formatted || value;
}

function truncate(text: string, max = 80) {
	const trimmed = text.trim();
	if (!trimmed) return "—";
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max)}…`;
}

function countByStatus(posts: BlogPost[]) {
	const counts = Object.fromEntries(BLOG_POST_STATUS_OPTIONS.map((s) => [s, 0])) as Record<
		BlogPostStatus,
		number
	>;
	for (const post of posts) {
		counts[post.status] += 1;
	}
	return counts;
}

function isAiSource(source: string) {
	const value = source.trim().toLowerCase();
	return value === "grokbot" || value === "ai" || value.startsWith("grok");
}

function formatTags(tags: string) {
	return [
		...new Set(
			tags
				.split(/[,、]/)
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	];
}

function ActionButtonIcon({ children }: { children: ReactNode }) {
	return <span className="x-schedule-action-icon">{children}</span>;
}

function DeleteIcon() {
	return (
		<svg
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

function BlogPostStatusBadge({ status }: { status: BlogPostStatus }) {
	return (
		<span className={`status-badge ${BLOG_POST_STATUS_CLASS[status]}`}>
			<StatusIcon status={BLOG_POST_STATUS_ICON[status]} />
			{BLOG_POST_STATUS_LABEL[status]}
		</span>
	);
}

function BlogPostStatusSelect({
	post,
	onMessage,
}: {
	post: BlogPost;
	onMessage: (message: string | null) => void;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [status, setStatus] = useState(post.status);

	useEffect(() => {
		setStatus(post.status);
	}, [post.status]);

	function handleChange(event: ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value as BlogPostStatus;
		if (next === status) return;
		const previous = status;
		setStatus(next);
		onMessage(null);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", post.id);
				formData.set("status", next);
				await updateBlogPostStatus(formData);
				router.refresh();
			} catch (error) {
				setStatus(previous);
				if (recoverFromStaleServerAction(error)) return;
				onMessage(
					error instanceof Error ? error.message : "ステータスの更新に失敗しました",
				);
			}
		});
	}

	return (
		<select
			className={`x-schedule-status-select ${BLOG_POST_STATUS_CLASS[status]}`}
			value={status}
			disabled={pending}
			aria-label={`${post.title} のステータス`}
			onChange={handleChange}
			onClick={(event) => event.stopPropagation()}
		>
			{BLOG_POST_STATUS_OPTIONS.map((value) => (
				<option key={value} value={value}>
					{BLOG_POST_STATUS_LABEL[value]}
				</option>
			))}
		</select>
	);
}

export function BlogDraftsManager({ posts }: Props) {
	const router = useRouter();
	const counts = countByStatus(posts);
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [detailing, setDetailing] = useState<BlogPost | null>(null);
	const [editing, setEditing] = useState<BlogPost | null>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [statusPending, startStatusTransition] = useTransition();

	const closeCreateDialog = useCallback(() => {
		createDialogRef.current?.close();
	}, []);

	const closeDetailDialog = useCallback(() => {
		detailDialogRef.current?.close();
		setDetailing(null);
	}, []);

	const closeEditDialog = useCallback(() => {
		editDialogRef.current?.close();
		setEditing(null);
	}, []);

	const handleCreateSuccess = useCallback(() => {
		closeCreateDialog();
		router.refresh();
	}, [closeCreateDialog, router]);

	const handleEditSuccess = useCallback(() => {
		closeEditDialog();
		router.refresh();
	}, [closeEditDialog, router]);

	function openCreateDialog() {
		setCreateFormKey((value) => value + 1);
		createDialogRef.current?.showModal();
	}

	function openDetail(post: BlogPost) {
		flushSync(() => {
			setDetailing(post);
		});
		detailDialogRef.current?.showModal();
	}

	function openEdit(post: BlogPost) {
		flushSync(() => {
			setEditing(post);
			setEditFormKey((value) => value + 1);
		});
		editDialogRef.current?.showModal();
	}

	function openEditFromDetail() {
		if (!detailing) return;
		const post = detailing;
		closeDetailDialog();
		openEdit(post);
	}

	function setStatus(post: BlogPost, status: BlogPostStatus) {
		setActionMessage(null);
		startStatusTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", post.id);
				formData.set("status", status);
				await updateBlogPostStatus(formData);
				setDetailing((current) =>
					current && current.id === post.id ? { ...current, status } : current,
				);
				router.refresh();
			} catch (error) {
				if (recoverFromStaleServerAction(error)) return;
				setActionMessage(
					error instanceof Error ? error.message : "ステータスの更新に失敗しました",
				);
			}
		});
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<h2>下書き一覧（{posts.length}）</h2>
				<div className="task-actions">
					<button type="button" className="primary" onClick={openCreateDialog}>
						新規登録
					</button>
				</div>
			</div>
			<div className="x-schedule">
				<ul className="x-schedule-summary">
					{BLOG_POST_STATUS_OPTIONS.map((status) => (
						<li key={status} className={BLOG_POST_STATUS_CLASS[status]}>
							<BlogPostStatusBadge status={status} />
							<span className="count">{counts[status]}</span>
						</li>
					))}
				</ul>
				{actionMessage ? <p className="run-due-message">{actionMessage}</p> : null}

				{posts.length === 0 ? (
					<p className="empty">
						ブログ下書きはまだありません。AI からの投入、または「新規登録」から追加してください。
					</p>
				) : (
					<div className="x-schedule-scroll">
						<table className="x-schedule-table">
							<thead>
								<tr>
									<th>更新 / ステータス</th>
									<th>記事</th>
									<th className="actions-col">操作</th>
								</tr>
							</thead>
							<tbody>
								{posts.map((post) => (
									<tr key={post.id} className={BLOG_POST_STATUS_CLASS[post.status]}>
										<td className="meta-cell">
											<p className="x-schedule-when">{formatWhen(post.updated_at)}</p>
											<div className="x-schedule-status">
												<BlogPostStatusSelect
													post={post}
													onMessage={setActionMessage}
												/>
											</div>
											{isAiSource(post.source) ? (
												<p className="field-hint">AI自動作成</p>
											) : null}
										</td>
										<td className="content-cell">
											<button
												type="button"
												className="x-schedule-content-btn"
												onClick={() => openDetail(post)}
											>
												<p className="x-schedule-post-title">{post.title}</p>
												<p className="x-schedule-post-body">
													{truncate(post.excerpt || post.body)}
												</p>
												{post.category ? (
													<p className="x-schedule-post-chars">{post.category}</p>
												) : null}
											</button>
										</td>
										<td className="actions-col">
											<div className="x-schedule-actions">
												<button
													type="button"
													className="x-schedule-action-btn x-action-edit"
													onClick={() => openDetail(post)}
												>
													<ActionButtonIcon>
														<StatusIcon
															status="scheduled"
															className="x-schedule-action-svg"
														/>
													</ActionButtonIcon>
													<span>確認</span>
												</button>
												{post.status === "draft" || post.status === "rejected" ? (
													<button
														type="button"
														className="x-schedule-action-btn x-action-advance status-approved"
														disabled={statusPending}
														onClick={() => setStatus(post, "approved")}
													>
														<ActionButtonIcon>
															<StatusIcon
																status="approved"
																className="x-schedule-action-svg"
															/>
														</ActionButtonIcon>
														<span>承認</span>
													</button>
												) : null}
												<button
													type="button"
													className="x-schedule-action-btn x-action-edit"
													onClick={() => openEdit(post)}
												>
													<ActionButtonIcon>
														<StatusIcon
															status="draft"
															className="x-schedule-action-svg"
														/>
													</ActionButtonIcon>
													<span>編集</span>
												</button>
												<form action={deleteBlogPost}>
													<input type="hidden" name="id" value={post.id} />
													<button
														type="submit"
														className="x-schedule-action-btn x-action-delete"
													>
														<ActionButtonIcon>
															<DeleteIcon />
														</ActionButtonIcon>
														<span>削除</span>
													</button>
												</form>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<dialog
					ref={createDialogRef}
					className="task-dialog task-dialog-docked"
					onClick={(event) => {
						if (event.target === createDialogRef.current) closeCreateDialog();
					}}
				>
					<div className="task-dialog-panel">
						<div className="task-dialog-head">
							<h2>下書きを追加</h2>
							<button type="button" className="ghost" onClick={closeCreateDialog}>
								閉じる
							</button>
						</div>
						<BlogPostForm key={createFormKey} onSuccess={handleCreateSuccess} />
					</div>
				</dialog>

				<dialog
					ref={detailDialogRef}
					className="task-dialog task-dialog-docked"
					onClick={(event) => {
						if (event.target === detailDialogRef.current) closeDetailDialog();
					}}
				>
					<div className="task-dialog-panel task-dialog-panel-docked">
						<div className="task-dialog-head">
							<h2>下書きの確認</h2>
							<button type="button" className="ghost" onClick={closeDetailDialog}>
								閉じる
							</button>
						</div>
						{detailing ? (
							<div className="task-detail task-dialog-scroll">
								<div className="task-meta">
									<BlogPostStatusBadge status={detailing.status} />
									{detailing.category ? <span>{detailing.category}</span> : null}
									<span className="when">{formatWhen(detailing.updated_at)}</span>
									{isAiSource(detailing.source) ? <span>AI自動作成</span> : null}
								</div>
								<h3 className="task-detail-title">{detailing.title}</h3>
								{detailing.published_on ? (
									<p className="notes">公開日表示: {detailing.published_on}</p>
								) : null}
								{detailing.excerpt ? (
									<p className="notes">{detailing.excerpt}</p>
								) : null}
								{formatTags(detailing.tags).length > 0 ? (
									<p className="notes">
										タグ: {formatTags(detailing.tags).join(" / ")}
									</p>
								) : null}
								{detailing.thumbnail_url ? (
									<a
										href={detailing.thumbnail_url}
										target="_blank"
										rel="noreferrer"
										className="task-detail-image"
										title="サムネイルを開く"
									>
										{/* eslint-disable-next-line @next/next/no-img-element -- 外部サムネイル確認 */}
										<img
											src={detailing.thumbnail_url}
											alt={`${detailing.title} のサムネイル`}
											loading="lazy"
										/>
									</a>
								) : null}
								{detailing.body ? (
									<p className="body">{detailing.body}</p>
								) : (
									<p className="notes">本文はありません</p>
								)}
								{detailing.notes ? (
									<p className="notes">メモ: {detailing.notes}</p>
								) : null}
								<p className="field-hint">slug: {detailing.slug}</p>
								<div className="task-actions task-detail-actions">
									<div className="task-detail-actions-start">
										{detailing.status === "draft" || detailing.status === "approved" ? (
											<button
												type="button"
												className="danger task-detail-btn task-detail-delete"
												disabled={statusPending}
												onClick={() => setStatus(detailing, "rejected")}
											>
												<StatusIcon status="failed" className="task-detail-btn-icon" />
												<span>{statusPending ? "保存中…" : "差戻す"}</span>
											</button>
										) : null}
									</div>
									<div className="task-detail-actions-end">
										{detailing.status === "draft" || detailing.status === "rejected" ? (
											<button
												type="button"
												className="primary task-detail-btn task-detail-btn-approve"
												disabled={statusPending}
												onClick={() => setStatus(detailing, "approved")}
											>
												<StatusIcon status="approved" className="task-detail-btn-icon" />
												<span>{statusPending ? "保存中…" : "承認する"}</span>
											</button>
										) : null}
										{detailing.status === "approved" ? (
											<button
												type="button"
												className="primary task-detail-btn task-detail-btn-complete"
												disabled={statusPending}
												onClick={() => setStatus(detailing, "published")}
											>
												<StatusIcon status="done" className="task-detail-btn-icon" />
												<span>{statusPending ? "保存中…" : "公開済にする"}</span>
											</button>
										) : null}
										<button
											type="button"
											className="task-detail-btn task-detail-btn-edit"
											onClick={openEditFromDetail}
										>
											<StatusIcon status="draft" className="task-detail-btn-icon" />
											<span>編集</span>
										</button>
									</div>
								</div>
							</div>
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
					<div className="task-dialog-panel">
						<div className="task-dialog-head">
							<h2>下書きを編集</h2>
							<button type="button" className="ghost" onClick={closeEditDialog}>
								閉じる
							</button>
						</div>
						{editing ? (
							<BlogPostForm
								key={editFormKey}
								post={editing}
								onSuccess={handleEditSuccess}
							/>
						) : null}
					</div>
				</dialog>
			</div>
		</section>
	);
}

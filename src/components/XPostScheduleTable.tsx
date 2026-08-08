"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { deleteXPost, postXPostNow, updateXPostStatus } from "@/app/actions";
import { RunDuePostsButton } from "@/components/RunDuePostsButton";
import { StatusBadge } from "@/components/StatusBadge";
import { XPostForm } from "@/components/XPostForm";
import { mediaUrl } from "@/lib/media-upload";
import { formatInAppTz } from "@/lib/timezone";
import {
	X_POST_STATUS_LABEL,
	type TaskStatus,
	type XPost,
} from "@/lib/types";

type Props = {
	posts: XPost[];
};

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
	draft: "approved",
	approved: "scheduled",
	scheduled: "done",
	failed: "draft",
};

const STATUS_ORDER: TaskStatus[] = ["draft", "approved", "scheduled", "done", "failed"];

function formatWhen(value: string | null) {
	if (!value) return "—";
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

function countByStatus(posts: XPost[]) {
	const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<
		TaskStatus,
		number
	>;
	for (const post of posts) {
		counts[post.status] += 1;
	}
	return counts;
}

function canPostNow(status: TaskStatus) {
	return status === "scheduled" || status === "approved" || status === "failed";
}

export function XPostScheduleTable({ posts }: Props) {
	const router = useRouter();
	const counts = countByStatus(posts);
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const [editing, setEditing] = useState<XPost | null>(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [editFormKey, setEditFormKey] = useState(0);

	const closeCreateDialog = useCallback(() => {
		createDialogRef.current?.close();
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

	function openEdit(post: XPost) {
		setEditing(post);
		setEditFormKey((value) => value + 1);
		editDialogRef.current?.showModal();
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<h2>予定一覧（{posts.length}）</h2>
				<div className="task-actions">
					<button type="button" className="primary" onClick={openCreateDialog}>
						新規登録
					</button>
					<RunDuePostsButton />
				</div>
			</div>
			<div className="x-schedule">
			<ul className="x-schedule-summary">
				{STATUS_ORDER.map((status) => (
					<li key={status} className={`status-${status}`}>
						<StatusBadge status={status} />
						<span className="count">{counts[status]}</span>
					</li>
				))}
			</ul>

			{posts.length === 0 ? (
				<p className="empty">
					X投稿の予定はまだありません。「新規登録」から追加してください。
				</p>
			) : (
				<div className="x-schedule-scroll">
					<table className="x-schedule-table">
						<thead>
							<tr>
								<th>予約日時</th>
								<th>ステータス</th>
								<th>画像</th>
								<th>タイトル</th>
								<th>投稿文</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody>
							{posts.map((post) => {
								const next = NEXT_STATUS[post.status];
								return (
									<tr key={post.id} className={`status-${post.status}`}>
										<td className="when">{formatWhen(post.scheduled_at)}</td>
										<td>
											<StatusBadge status={post.status} />
											{post.x_post_id ? (
												<p className="x-post-id">
													<a
														href={`https://x.com/i/web/status/${post.x_post_id}`}
														target="_blank"
														rel="noreferrer"
													>
														投稿を見る
													</a>
												</p>
											) : null}
											{post.last_error ? (
												<p className="last-error" title={post.last_error}>
													{truncate(post.last_error, 60)}
												</p>
											) : null}
										</td>
										<td className="image-cell">
											{post.image_key ? (
												<a
													href={mediaUrl(post.image_key)}
													target="_blank"
													rel="noreferrer"
													className="x-schedule-thumb"
													title="画像を開く"
												>
													{/* eslint-disable-next-line @next/next/no-img-element -- R2 配信プレビュー */}
													<img
														src={mediaUrl(post.image_key)}
														alt={`${post.title} の画像`}
														loading="lazy"
													/>
												</a>
											) : (
												<span className="no-image">なし</span>
											)}
										</td>
										<td className="title">{post.title}</td>
										<td className="body-cell" title={post.body || undefined}>
											{truncate(post.body)}
										</td>
										<td>
											<div className="task-actions">
												<button type="button" onClick={() => openEdit(post)}>
													編集
												</button>
												{canPostNow(post.status) ? (
													<form action={postXPostNow}>
														<input type="hidden" name="id" value={post.id} />
														<button type="submit" className="primary">
															Xへ投稿
														</button>
													</form>
												) : null}
												{next && post.status !== "scheduled" ? (
													<form action={updateXPostStatus}>
														<input type="hidden" name="id" value={post.id} />
														<input type="hidden" name="status" value={next} />
														<button type="submit">→ {X_POST_STATUS_LABEL[next]}</button>
													</form>
												) : null}
												{post.status === "scheduled" ? (
													<form action={updateXPostStatus}>
														<input type="hidden" name="id" value={post.id} />
														<input type="hidden" name="status" value="done" />
														<button type="submit">手動完了</button>
													</form>
												) : null}
												{post.status !== "failed" && post.status !== "done" ? (
													<form action={updateXPostStatus}>
														<input type="hidden" name="id" value={post.id} />
														<input type="hidden" name="status" value="failed" />
														<button type="submit" className="danger">
															失敗
														</button>
													</form>
												) : null}
												<form action={deleteXPost}>
													<input type="hidden" name="id" value={post.id} />
													<button type="submit" className="ghost">
														削除
													</button>
												</form>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<dialog
				ref={createDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === createDialogRef.current) closeCreateDialog();
				}}
			>
				<div className="task-dialog-panel">
					<div className="task-dialog-head">
						<h2>新規投稿</h2>
						<button type="button" className="ghost" onClick={closeCreateDialog}>
							閉じる
						</button>
					</div>
					<XPostForm key={createFormKey} onSuccess={handleCreateSuccess} />
				</div>
			</dialog>

			<dialog
				ref={editDialogRef}
				className="task-dialog"
				onClick={(event) => {
					if (event.target === editDialogRef.current) closeEditDialog();
				}}
			>
				<div className="task-dialog-panel">
					<div className="task-dialog-head">
						<h2>投稿を編集</h2>
						<button type="button" className="ghost" onClick={closeEditDialog}>
							閉じる
						</button>
					</div>
					{editing ? (
						<XPostForm key={editFormKey} post={editing} onSuccess={handleEditSuccess} />
					) : null}
				</div>
			</dialog>
			</div>
		</section>
	);
}

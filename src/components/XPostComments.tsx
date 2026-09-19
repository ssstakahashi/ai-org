"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { updateXPostCommentStatus } from "@/app/actions";
import { xPostCommentAuthorLabel } from "@/lib/x-post-comments";
import { employeeTintStyle } from "@/lib/colors";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import { formatInAppTz } from "@/lib/timezone";
import {
	X_POST_COMMENT_STATUS_CLASS,
	X_POST_COMMENT_STATUS_LABEL,
	X_POST_COMMENT_STATUS_OPTIONS,
	type XPostComment,
	type XPostCommentStatus,
} from "@/lib/types";

type Props = {
	comments: XPostComment[];
	showEmpty?: boolean;
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

function CommentStatusSelect({ comment }: { comment: XPostComment }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [status, setStatus] = useState(comment.status);

	useEffect(() => {
		setStatus(comment.status);
	}, [comment.status]);

	function handleChange(event: ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value as XPostCommentStatus;
		if (next === status) return;
		const previous = status;
		setStatus(next);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", comment.id);
				formData.set("status", next);
				await updateXPostCommentStatus(formData);
				router.refresh();
			} catch (error) {
				setStatus(previous);
				if (recoverFromStaleServerAction(error)) return;
			}
		});
	}

	return (
		<select
			className={`x-schedule-status-select ${X_POST_COMMENT_STATUS_CLASS[status]}`}
			value={status}
			disabled={pending}
			aria-label={`${xPostCommentAuthorLabel(comment)} のコメントの対応状況`}
			onChange={handleChange}
			onClick={(event) => event.stopPropagation()}
		>
			{X_POST_COMMENT_STATUS_OPTIONS.map((value) => (
				<option key={value} value={value}>
					{X_POST_COMMENT_STATUS_LABEL[value]}
				</option>
			))}
		</select>
	);
}

export function XPostComments({ comments, showEmpty = false }: Props) {
	if (comments.length === 0 && !showEmpty) return null;
	const openCount = comments.filter((comment) => comment.status === "open").length;

	return (
		<div className="task-link-section">
			<h4 className="task-link-heading">
				AIコメント（{comments.length}
				{comments.length > 0 ? ` / 未対応 ${openCount}` : ""}）
			</h4>
			{comments.length === 0 ? (
				<p className="notes">まだコメントはありません</p>
			) : (
				<ul className="task-link-list">
					{comments.map((comment) => {
						const author = xPostCommentAuthorLabel(comment);
						return (
							<li key={comment.id}>
								<div className="task-meta">
									<CommentStatusSelect comment={comment} />
									<span
										className="employee"
										style={employeeTintStyle(
											comment.employee_color,
											comment.employee_text_color,
										)}
									>
										{author}
									</span>
									{comment.source && comment.source !== author ? (
										<span>{comment.source}</span>
									) : null}
									<span className="when">{formatWhen(comment.created_at)}</span>
								</div>
								<p className="notes">{comment.body}</p>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

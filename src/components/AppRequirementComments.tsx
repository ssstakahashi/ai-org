"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
	createAppRequirementComment,
	updateAppRequirementCommentStatus,
} from "@/app/actions";
import { appRequirementCommentAuthorLabel } from "@/lib/app-requirement-comments";
import { employeeTintStyle } from "@/lib/colors";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import { formatInAppTz } from "@/lib/timezone";
import {
	APP_REQUIREMENT_COMMENT_STATUS_CLASS,
	APP_REQUIREMENT_COMMENT_STATUS_LABEL,
	APP_REQUIREMENT_COMMENT_STATUS_OPTIONS,
	type AppRequirementComment,
	type AppRequirementCommentStatus,
} from "@/lib/types";

type Props = {
	requirementId: string;
	comments: AppRequirementComment[];
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

function CommentStatusSelect({ comment }: { comment: AppRequirementComment }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [status, setStatus] = useState(comment.status);

	useEffect(() => {
		setStatus(comment.status);
	}, [comment.status]);

	function handleChange(event: ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value as AppRequirementCommentStatus;
		if (next === status) return;
		const previous = status;
		setStatus(next);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", comment.id);
				formData.set("status", next);
				await updateAppRequirementCommentStatus(formData);
				router.refresh();
			} catch (error) {
				setStatus(previous);
				if (recoverFromStaleServerAction(error)) return;
			}
		});
	}

	return (
		<select
			className={`x-schedule-status-select ${APP_REQUIREMENT_COMMENT_STATUS_CLASS[status]}`}
			value={status}
			disabled={pending}
			aria-label={`${appRequirementCommentAuthorLabel(comment)} のコメントの対応状況`}
			onChange={handleChange}
			onClick={(event) => event.stopPropagation()}
		>
			{APP_REQUIREMENT_COMMENT_STATUS_OPTIONS.map((value) => (
				<option key={value} value={value}>
					{APP_REQUIREMENT_COMMENT_STATUS_LABEL[value]}
				</option>
			))}
		</select>
	);
}

export function AppRequirementComments({ requirementId, comments }: Props) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const openCount = comments.filter((comment) => comment.status === "open").length;

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		const form = event.currentTarget;
		setSaving(true);
		setError("");
		try {
			await createAppRequirementComment(new FormData(form));
			form.reset();
			router.refresh();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "コメントを保存できませんでした",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="task-link-section">
			<h4 className="task-link-heading">
				コメント（{comments.length}
				{comments.length > 0 ? ` / 未対応 ${openCount}` : ""}）
			</h4>
			{comments.length === 0 ? (
				<p className="notes">まだコメントはありません</p>
			) : (
				<ul className="task-link-list">
					{comments.map((comment) => {
						const author = appRequirementCommentAuthorLabel(comment);
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
			<form className="requirement-item-test-form" onSubmit={onSubmit}>
				<input type="hidden" name="requirement_id" value={requirementId} />
				<label>
					<span>名前</span>
					<input name="author_name" placeholder="空なら担当" />
				</label>
				<label>
					<span>コメント</span>
					<textarea
						name="body"
						rows={3}
						required
						className="requirement-body-textarea"
						placeholder="修正確認、根拠ファイル、コミット、PR など（Markdown 可）"
					/>
				</label>
				{error ? <p className="requirement-item-test-error">{error}</p> : null}
				<div className="requirement-item-test-actions">
					<button type="submit" className="primary" disabled={saving}>
						書き込む
					</button>
				</div>
			</form>
		</div>
	);
}

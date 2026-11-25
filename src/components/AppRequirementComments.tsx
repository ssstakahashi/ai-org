"use client";

import { useRouter } from "next/navigation";
import {
	useEffect,
	useRef,
	useState,
	useTransition,
	type ChangeEvent,
	type FormEvent,
} from "react";
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
	type Employee,
} from "@/lib/types";

type Props = {
	requirementId: string;
	requirementTitle: string;
	comments: AppRequirementComment[];
	employees: Employee[];
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

export function AppRequirementComments({
	requirementId,
	requirementTitle,
	comments,
	employees,
}: Props) {
	const router = useRouter();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const openCount = comments.filter((comment) => comment.status === "open").length;
	const buttonLabel =
		comments.length === 0
			? "コメント"
			: openCount > 0
				? `コメント ${comments.length}（未対応 ${openCount}）`
				: `コメント ${comments.length}`;

	function openDialog() {
		dialogRef.current?.showModal();
	}

	function closeDialog() {
		dialogRef.current?.close();
	}

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
		<>
			<button
				type="button"
				className={
					openCount > 0
						? "requirement-comment-open has-open"
						: "requirement-comment-open"
				}
				aria-haspopup="dialog"
				aria-label={`${requirementTitle} の${buttonLabel}`}
				onClick={openDialog}
			>
				{buttonLabel}
			</button>
			<dialog
				ref={dialogRef}
				className="task-dialog task-dialog-docked"
				onClick={(event) => {
					if (event.target === dialogRef.current) closeDialog();
				}}
			>
				<div className="task-dialog-panel task-dialog-panel-docked">
					<div className="task-dialog-head">
						<h2>コメント</h2>
						<button type="button" className="ghost" onClick={closeDialog}>
							閉じる
						</button>
					</div>
					<div className="task-detail task-dialog-scroll">
						<p className="task-detail-title">{requirementTitle}</p>
						<div className="task-link-section">
							<h3 className="task-link-heading">
								コメント（{comments.length}
								{comments.length > 0 ? ` / 未対応 ${openCount}` : ""}）
							</h3>
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
													<span className="when">
														{formatWhen(comment.created_at)}
													</span>
												</div>
												<p className="notes">{comment.body}</p>
											</li>
										);
									})}
								</ul>
							)}
							<form className="requirement-item-test-form" onSubmit={onSubmit}>
								<input type="hidden" name="requirement_id" value={requirementId} />
								<div className="requirement-comment-author">
									<span>名前</span>
									{employees.length === 0 ? (
										<p className="field-hint">従業員を先に登録してください</p>
									) : (
										<div className="field-grid">
											<div className="choice-field full">
												<div
													className="choice-options"
													role="radiogroup"
													aria-label="コメントの名前"
												>
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
																/>
																<span>{employee.name}</span>
															</label>
														);
													})}
												</div>
											</div>
										</div>
									)}
								</div>
								<label className="requirement-comment-body">
									<span>コメント</span>
									<textarea
										name="body"
										rows={3}
										required
										className="requirement-body-textarea"
										placeholder="修正確認、根拠ファイル、コミット、PR など（Markdown 可）"
									/>
								</label>
								{error ? (
									<p className="requirement-item-test-error">{error}</p>
								) : null}
								<div className="requirement-item-test-actions">
									<button
										type="submit"
										className="primary"
										disabled={saving || employees.length === 0}
									>
										書き込む
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</dialog>
		</>
	);
}

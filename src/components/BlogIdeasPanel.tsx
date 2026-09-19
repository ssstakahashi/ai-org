"use client";

import {
	useCallback,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { StatusIcon } from "@/components/StatusIcon";
import {
	BLOG_IDEAS_SHEET_LABEL,
	BLOG_IDEAS_SHEET_URL,
	type BlogIdeasSheetKey,
} from "@/lib/bulletin-board";
import type { BlogIdeaRow } from "@/lib/blog-ideas-sheets";

type Props = {
	sheet: BlogIdeasSheetKey;
	rows: BlogIdeaRow[];
	error?: string | null;
};

const URL_RE = /(https?:\/\/[^\s<>;、,）)]+)/g;

function truncate(text: string, max = 80) {
	const trimmed = text.trim();
	if (!trimmed) return "—";
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max)}…`;
}

function TextWithLinks({ text }: { text: string }) {
	const trimmed = text.trim();
	if (!trimmed) return "—";
	const parts = trimmed.split(URL_RE);
	return (
		<>
			{parts.map((part, index) =>
				/^https?:\/\//i.test(part) ? (
					<a
						key={`${part}-${index}`}
						href={part}
						target="_blank"
						rel="noreferrer"
						className="automation-link"
					>
						{part}
					</a>
				) : (
					<span key={`${part}-${index}`}>{part}</span>
				),
			)}
		</>
	);
}

function ActionButtonIcon({ children }: { children: ReactNode }) {
	return <span className="x-schedule-action-icon">{children}</span>;
}

export function BlogIdeasPanel({ sheet, rows, error }: Props) {
	const router = useRouter();
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const [detailing, setDetailing] = useState<BlogIdeaRow | null>(null);

	const closeDetailDialog = useCallback(() => {
		detailDialogRef.current?.close();
		setDetailing(null);
	}, []);

	function openDetail(row: BlogIdeaRow) {
		flushSync(() => {
			setDetailing(row);
		});
		detailDialogRef.current?.showModal();
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<h2>
					{BLOG_IDEAS_SHEET_LABEL[sheet]}（{rows.length}）
				</h2>
				<div className="task-actions">
					<button type="button" onClick={() => router.refresh()}>
						再読み込み
					</button>
				</div>
			</div>
			<div className="x-schedule">
				<p className="field-hint">
					<a
						href={BLOG_IDEAS_SHEET_URL}
						className="automation-link"
						target="_blank"
						rel="noreferrer"
					>
						ブログネタ
					</a>
					の {BLOG_IDEAS_SHEET_LABEL[sheet]} シートです。
				</p>
				{error ? <p className="run-due-message">{error}</p> : null}

				{!error && rows.length === 0 ? (
					<p className="empty">
						{BLOG_IDEAS_SHEET_LABEL[sheet]} のネタはまだありません。
					</p>
				) : rows.length > 0 ? (
					<div className="x-schedule-scroll">
						<table className="x-schedule-table">
							<thead>
								<tr>
									<th>No.</th>
									<th>ネタ</th>
									<th className="actions-col">操作</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => (
									<tr key={row.id}>
										<td className="meta-cell">
											<p className="x-schedule-when">{row.no ? `No. ${row.no}` : "—"}</p>
											{row.badge ? <p className="field-hint">{row.badge}</p> : null}
										</td>
										<td className="content-cell">
											<button
												type="button"
												className="x-schedule-content-btn"
												onClick={() => openDetail(row)}
											>
												<p className="x-schedule-post-title">{row.title}</p>
												<p className="x-schedule-post-body">{truncate(row.summary)}</p>
												{row.category ? (
													<p className="x-schedule-post-chars">{row.category}</p>
												) : null}
											</button>
										</td>
										<td className="actions-col">
											<div className="x-schedule-actions">
												<button
													type="button"
													className="x-schedule-action-btn x-action-edit"
													onClick={() => openDetail(row)}
												>
													<ActionButtonIcon>
														<StatusIcon
															status="scheduled"
															className="x-schedule-action-svg"
														/>
													</ActionButtonIcon>
													<span>確認</span>
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				<dialog
					ref={detailDialogRef}
					className="task-dialog task-dialog-docked"
					onClick={(event) => {
						if (event.target === detailDialogRef.current) closeDetailDialog();
					}}
				>
					<div className="task-dialog-panel task-dialog-panel-docked">
						<div className="task-dialog-head">
							<h2>ネタの確認</h2>
							<button type="button" className="ghost" onClick={closeDetailDialog}>
								閉じる
							</button>
						</div>
						{detailing ? (
							<div className="task-detail task-dialog-scroll">
								<div className="task-meta">
									{detailing.no ? <span>No. {detailing.no}</span> : null}
									<span>{BLOG_IDEAS_SHEET_LABEL[detailing.sheet]}</span>
									{detailing.category ? <span>{detailing.category}</span> : null}
									{detailing.badge ? <span>{detailing.badge}</span> : null}
								</div>
								<h3 className="task-detail-title">{detailing.title}</h3>
								{detailing.details.map((item) => (
									<p key={item.label} className="notes">
										{item.label}: <TextWithLinks text={item.value} />
									</p>
								))}
							</div>
						) : null}
					</div>
				</dialog>
			</div>
		</section>
	);
}

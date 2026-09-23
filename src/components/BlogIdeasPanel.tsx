"use client";

import {
	useActionState,
	useCallback,
	useEffect,
	useRef,
	useState,
	useTransition,
	type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
	setBlogIdeaUseAction,
	uploadBlogIdeasAction,
	type UploadBlogIdeasState,
} from "@/app/blog-ideas/actions";
import { StatusIcon } from "@/components/StatusIcon";
import { BLOG_IDEAS_SHEET_LABEL, type BlogIdeasSheetKey } from "@/lib/bulletin-board";
import {
	BLOG_IDEA_DRAFT_COVERAGE_LABEL,
	BLOG_IDEA_MEDIA_OPTIONS,
	BLOG_IDEA_MEDIUM_LABEL,
	blogIdeaDraftCoverage,
	formatBlogIdeaUse,
	type BlogIdeaMedium,
} from "@/lib/blog-ideas";
import type { BlogIdeaRow, BlogIdeaUse } from "@/lib/blog-ideas-sheets";

type Props = {
	sheet: BlogIdeasSheetKey;
	rows: BlogIdeaRow[];
};

const URL_RE = /(https?:\/\/[^\s<>;、,）)]+)/g;
const uploadInitial: UploadBlogIdeasState = {
	error: null,
	ok: false,
	inserted: 0,
	updated: 0,
};

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

function BlogIdeasUpload({ sheet }: { sheet: BlogIdeasSheetKey }) {
	const router = useRouter();
	const [uploadState, uploadAction, uploadPending] = useActionState(
		uploadBlogIdeasAction,
		uploadInitial,
	);

	useEffect(() => {
		if (!uploadState.ok) return;
		router.refresh();
	}, [uploadState, router]);

	return (
		<>
			<form action={uploadAction} className="task-form">
				<input type="hidden" name="topic" value={sheet} />
				<label>
					<span>CSV アップロード</span>
					<input type="file" name="file" accept=".csv,text/csv" required />
				</label>
				<button type="submit" className="primary" disabled={uploadPending}>
					{uploadPending ? "取り込み中…" : "アップロード"}
				</button>
			</form>
			<p className="field-hint">
				UTF-8 の CSV です。1行目はヘッダー（No. / 記事タイトル案またはネタ / カテゴリ /
				概要）。同じ No. は上書きし、転用先の記録は残します。
			</p>
			{uploadState.error ? <p className="run-due-message">{uploadState.error}</p> : null}
			{uploadState.ok ? (
				<p className="field-hint">
					{uploadState.inserted} 件追加、{uploadState.updated} 件更新しました。
				</p>
			) : null}
		</>
	);
}

function hasUse(uses: BlogIdeaUse[], medium: BlogIdeaMedium, destination: string) {
	return uses.some((use) => use.medium === medium && use.destination === destination);
}

export function BlogIdeasPanel({ sheet, rows }: Props) {
	const router = useRouter();
	const detailDialogRef = useRef<HTMLDialogElement>(null);
	const [detailing, setDetailing] = useState<BlogIdeaRow | null>(null);
	const [useError, setUseError] = useState<string | null>(null);
	const [usePending, startUseTransition] = useTransition();
	const closeDetailDialog = useCallback(() => {
		detailDialogRef.current?.close();
		setDetailing(null);
		setUseError(null);
	}, []);

	function openDetail(row: BlogIdeaRow) {
		flushSync(() => {
			setUseError(null);
			setDetailing(row);
		});
		detailDialogRef.current?.showModal();
	}

	function toggleUse(medium: BlogIdeaMedium, destination: string, enabled: boolean) {
		if (!detailing) return;
		const ideaId = detailing.id;
		setUseError(null);
		setDetailing((current) => {
			if (!current || current.id !== ideaId) return current;
			const uses = enabled
				? [...current.uses, { medium, destination }]
				: current.uses.filter(
						(use) => !(use.medium === medium && use.destination === destination),
					);
			return { ...current, uses };
		});
		startUseTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("idea_id", ideaId);
				formData.set("medium", medium);
				formData.set("destination", destination);
				formData.set("enabled", enabled ? "1" : "0");
				await setBlogIdeaUseAction(formData);
				router.refresh();
			} catch (error) {
				setUseError(error instanceof Error ? error.message : "転用先の更新に失敗しました");
				router.refresh();
			}
		});
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
				<BlogIdeasUpload key={sheet} sheet={sheet} />

				{rows.length === 0 ? (
					<p className="empty">
						{BLOG_IDEAS_SHEET_LABEL[sheet]} のネタはまだありません。
					</p>
				) : (
					<div className="x-schedule-scroll">
						<table className="x-schedule-table">
							<thead>
								<tr>
									<th>No.</th>
									<th>ネタ</th>
									<th>下書き</th>
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
										<td className="meta-cell">
											<p className="x-schedule-when">
												{BLOG_IDEA_DRAFT_COVERAGE_LABEL[blogIdeaDraftCoverage(row.uses)]}
											</p>
											{row.uses.length > 0 ? (
												<p className="field-hint">
													{row.uses.map(formatBlogIdeaUse).join(" / ")}
												</p>
											) : null}
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
				)}

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
								<p className="notes">転用先</p>
								<p className="field-hint">
									使った媒体にチェックします。ブログと X の両方を付けられます。
								</p>
								{useError ? <p className="run-due-message">{useError}</p> : null}
								{(["blog", "x"] as const).map((medium) => (
									<div key={medium}>
										<p className="notes">{BLOG_IDEA_MEDIUM_LABEL[medium]}</p>
										{BLOG_IDEA_MEDIA_OPTIONS.filter((option) => option.medium === medium).map(
											(option) => (
												<label
													key={`${option.medium}:${option.destination}`}
													className="inline-check"
												>
													<input
														type="checkbox"
														checked={hasUse(
															detailing.uses,
															option.medium,
															option.destination,
														)}
														disabled={usePending}
														onChange={(event) =>
															toggleUse(
																option.medium,
																option.destination,
																event.target.checked,
															)
														}
													/>
													{option.label}
												</label>
											),
										)}
									</div>
								))}
							</div>
						) : null}
					</div>
				</dialog>
			</div>
		</section>
	);
}

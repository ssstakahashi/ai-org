"use client";

import { useEffect, useState } from "react";
import type { LinkPreview } from "@/lib/link-preview";
import type { TaskLink } from "@/lib/types";

type Props = {
	links: TaskLink[];
};

export function TaskLinkList({ links }: Props) {
	if (links.length === 0) return null;

	return (
		<div className="task-link-section">
			<h4 className="task-link-heading">リンク</h4>
			<ul className="task-link-list">
				{links.map((link) => (
					<TaskLinkCard key={link.id} link={link} />
				))}
			</ul>
		</div>
	);
}

function TaskLinkCard({ link }: { link: TaskLink }) {
	const [preview, setPreview] = useState<LinkPreview | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setFailed(false);
		setPreview(null);

		(async () => {
			try {
				const response = await fetch(`/api/link-preview?url=${encodeURIComponent(link.url)}`);
				if (!response.ok) {
					throw new Error("preview failed");
				}
				const data = (await response.json()) as LinkPreview;
				if (!cancelled) {
					setPreview(data);
				}
			} catch {
				if (!cancelled) {
					setFailed(true);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [link.url]);

	const title = link.label || preview?.title || link.url;
	const description = preview?.description;
	const image = preview?.image;
	const siteName = preview?.siteName;

	return (
		<li className="task-link-card">
			<a href={link.url} target="_blank" rel="noreferrer" className="task-link-card-anchor">
				{loading ? (
					<div className="task-link-card-body task-link-card-loading">プレビューを読み込み中…</div>
				) : (
					<>
						{image ? (
							<div className="task-link-card-image">
								{/* eslint-disable-next-line @next/next/no-img-element -- 外部 OG 画像 */}
								<img src={image} alt="" loading="lazy" />
							</div>
						) : null}
						<div className="task-link-card-body">
							{siteName ? <p className="task-link-site">{siteName}</p> : null}
							<p className="task-link-title">{title}</p>
							{description ? <p className="task-link-description">{description}</p> : null}
							{failed && !description ? (
								<p className="task-link-description">{link.url}</p>
							) : null}
						</div>
					</>
				)}
			</a>
		</li>
	);
}

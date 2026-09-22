"use client";

import { useState } from "react";
import { BlogIdeasPanel } from "@/components/BlogIdeasPanel";
import {
	BLOG_IDEAS_SHEET_KEYS,
	BLOG_IDEAS_SHEET_LABEL,
	type BlogIdeasSheetKey,
} from "@/lib/bulletin-board";
import type { BlogIdeaRow } from "@/lib/blog-ideas-sheets";

type Props = {
	ideas: Record<BlogIdeasSheetKey, BlogIdeaRow[]>;
};

export function BlogIdeasManager({ ideas }: Props) {
	const [tab, setTab] = useState<BlogIdeasSheetKey>(BLOG_IDEAS_SHEET_KEYS[0]);

	return (
		<>
			<div className="view-tabs apps-tabs" role="tablist" aria-label="表示切替">
				{BLOG_IDEAS_SHEET_KEYS.map((value) => {
					const active = tab === value;
					return (
						<button
							key={value}
							type="button"
							role="tab"
							aria-selected={active}
							className={active ? "view-tab active" : "view-tab"}
							onClick={() => setTab(value)}
						>
							{BLOG_IDEAS_SHEET_LABEL[value]}（{ideas[value].length}）
						</button>
					);
				})}
			</div>
			<BlogIdeasPanel sheet={tab} rows={ideas[tab]} />
		</>
	);
}

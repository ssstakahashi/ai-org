"use client";

import { useState } from "react";
import type { TaskLink } from "@/lib/types";

type LinkDraft = {
	key: string;
	url: string;
	label: string;
};

type Props = {
	links?: Pick<TaskLink, "url" | "label">[];
	onChange: (links: { url: string; label: string }[]) => void;
};

function createDraft(link?: Pick<TaskLink, "url" | "label">): LinkDraft {
	return {
		key: crypto.randomUUID(),
		url: link?.url ?? "",
		label: link?.label ?? "",
	};
}

export function TaskLinkFields({ links = [], onChange }: Props) {
	const [entries, setEntries] = useState<LinkDraft[]>(() =>
		links.length > 0 ? links.map((link) => createDraft(link)) : [],
	);

	function sync(next: LinkDraft[]) {
		setEntries(next);
		onChange(
			next
				.map((entry) => ({
					url: entry.url.trim(),
					label: entry.label.trim(),
				}))
				.filter((entry) => entry.url),
		);
	}

	function updateEntry(key: string, patch: Partial<Pick<LinkDraft, "url" | "label">>) {
		sync(entries.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
	}

	function addEntry() {
		sync([...entries, createDraft()]);
	}

	function removeEntry(key: string) {
		sync(entries.filter((entry) => entry.key !== key));
	}

	return (
		<fieldset className="full task-link-fieldset">
			<legend>リンク</legend>
			{entries.length === 0 ? (
				<p className="field-hint">参考 URL を複数登録できます。保存後にプレビューが表示されます。</p>
			) : (
				<ul className="task-link-editor-list">
					{entries.map((entry, index) => (
						<li key={entry.key} className="task-link-editor-item">
							<label>
								<span>URL {index + 1}</span>
								<input
									type="url"
									inputMode="url"
									placeholder="https://example.com"
									value={entry.url}
									onChange={(event) => updateEntry(entry.key, { url: event.target.value })}
								/>
							</label>
							<label>
								<span>表示名（任意）</span>
								<input
									type="text"
									placeholder="例: 仕様書"
									value={entry.label}
									onChange={(event) => updateEntry(entry.key, { label: event.target.value })}
								/>
							</label>
							<button
								type="button"
								className="task-link-remove"
								onClick={() => removeEntry(entry.key)}
								aria-label={`リンク ${index + 1} を削除`}
							>
								削除
							</button>
						</li>
					))}
				</ul>
			)}
			<button type="button" className="task-link-add" onClick={addEntry}>
				リンクを追加
			</button>
		</fieldset>
	);
}

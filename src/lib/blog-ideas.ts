import { newId } from "@/lib/db";
import {
	BLOG_IDEAS_SHEET_KEYS,
	isBlogIdeasSheetKey,
	type BlogIdeasSheetKey,
} from "@/lib/bulletin-board";
import {
	parseCsv,
	parseRowsForSheet,
	type BlogIdeaDetail,
	type BlogIdeaRow,
	type BlogIdeaUse,
} from "@/lib/blog-ideas-sheets";
import {
	BLOG_POST_DESTINATION_LABEL,
	BLOG_POST_DESTINATION_OPTIONS,
	X_POST_DESTINATION_LABEL,
	X_POST_DESTINATION_OPTIONS,
	type BlogPostDestination,
	type XPostDestination,
} from "@/lib/types";

export type BlogIdeasByTopic = Record<BlogIdeasSheetKey, BlogIdeaRow[]>;

export type BlogIdeaMedium = BlogIdeaUse["medium"];

export const BLOG_IDEA_MEDIUM_LABEL: Record<BlogIdeaMedium, string> = {
	blog: "ブログ",
	x: "X",
};

export const BLOG_IDEA_MEDIA_OPTIONS: {
	medium: BlogIdeaMedium;
	destination: string;
	label: string;
}[] = [
	...BLOG_POST_DESTINATION_OPTIONS.map((destination) => ({
		medium: "blog" as const,
		destination,
		label: BLOG_POST_DESTINATION_LABEL[destination],
	})),
	...X_POST_DESTINATION_OPTIONS.map((destination) => ({
		medium: "x" as const,
		destination,
		label: X_POST_DESTINATION_LABEL[destination],
	})),
];

const CSV_MAX_CHARS = 1_500_000;
const CSV_MAX_ROWS = 2000;

type IdeaRecord = {
	id: string;
	topic: string;
	no: string;
	title: string;
	category: string;
	summary: string;
	badge: string;
	details: string;
};

type UseRecord = {
	idea_id: string;
	medium: string;
	destination: string;
};

export function emptyBlogIdeas(): BlogIdeasByTopic {
	const ideas = {} as BlogIdeasByTopic;
	for (const key of BLOG_IDEAS_SHEET_KEYS) {
		ideas[key] = [];
	}
	return ideas;
}

export function isBlogIdeaMedium(value: string): value is BlogIdeaMedium {
	return value === "blog" || value === "x";
}

export function isBlogIdeaDestination(medium: BlogIdeaMedium, destination: string): boolean {
	if (medium === "blog") {
		return (BLOG_POST_DESTINATION_OPTIONS as readonly string[]).includes(destination);
	}
	return (X_POST_DESTINATION_OPTIONS as readonly string[]).includes(destination);
}

export function formatBlogIdeaUse(use: BlogIdeaUse): string {
	const option = BLOG_IDEA_MEDIA_OPTIONS.find(
		(item) => item.medium === use.medium && item.destination === use.destination,
	);
	const medium = BLOG_IDEA_MEDIUM_LABEL[use.medium] ?? use.medium;
	return option ? `${medium}: ${option.label}` : `${medium}: ${use.destination}`;
}

export type BlogIdeaDraftCoverage = "none" | "blog" | "x" | "both";

export const BLOG_IDEA_DRAFT_COVERAGE_LABEL: Record<BlogIdeaDraftCoverage, string> = {
	none: "未転用",
	blog: "ブログ下書き",
	x: "X下書き",
	both: "両方",
};

export function blogIdeaDraftCoverage(uses: BlogIdeaUse[]): BlogIdeaDraftCoverage {
	const hasBlog = uses.some((use) => use.medium === "blog");
	const hasX = uses.some((use) => use.medium === "x");
	if (hasBlog && hasX) return "both";
	if (hasBlog) return "blog";
	if (hasX) return "x";
	return "none";
}

function parseDetails(value: string): BlogIdeaDetail[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item) => {
			if (!item || typeof item !== "object") return [];
			const label = "label" in item ? String(item.label ?? "").trim() : "";
			const text = "value" in item ? String(item.value ?? "").trim() : "";
			if (!label || !text) return [];
			return [{ label, value: text }];
		});
	} catch {
		return [];
	}
}

function parseUse(record: UseRecord): BlogIdeaUse | null {
	if (!isBlogIdeaMedium(record.medium)) return null;
	if (!isBlogIdeaDestination(record.medium, record.destination)) return null;
	return { medium: record.medium, destination: record.destination };
}

function compareIdeas(a: BlogIdeaRow, b: BlogIdeaRow): number {
	const an = Number(a.no);
	const bn = Number(b.no);
	if (a.no && b.no && Number.isFinite(an) && Number.isFinite(bn)) {
		if (an !== bn) return an - bn;
	} else if (a.no || b.no) {
		return a.no.localeCompare(b.no, "ja");
	}
	return a.title.localeCompare(b.title, "ja");
}

export async function listBlogIdeas(db: D1Database): Promise<BlogIdeasByTopic> {
	const grouped = emptyBlogIdeas();
	const { results: ideaRows } = await db
		.prepare(
			`SELECT id, topic, no, title, category, summary, badge, details
			 FROM blog_ideas`,
		)
		.all<IdeaRecord>();
	const { results: useRows } = await db
		.prepare(`SELECT idea_id, medium, destination FROM blog_idea_uses`)
		.all<UseRecord>();

	const usesByIdea = new Map<string, BlogIdeaUse[]>();
	for (const record of useRows ?? []) {
		const use = parseUse(record);
		if (!use) continue;
		const list = usesByIdea.get(record.idea_id) ?? [];
		list.push(use);
		usesByIdea.set(record.idea_id, list);
	}

	for (const record of ideaRows ?? []) {
		if (!isBlogIdeasSheetKey(record.topic)) continue;
		grouped[record.topic].push({
			id: record.id,
			sheet: record.topic,
			rowNumber: 0,
			no: record.no,
			title: record.title,
			category: record.category,
			summary: record.summary,
			badge: record.badge,
			details: parseDetails(record.details),
			uses: usesByIdea.get(record.id) ?? [],
		});
	}

	for (const key of BLOG_IDEAS_SHEET_KEYS) {
		grouped[key].sort(compareIdeas);
	}
	return grouped;
}

export async function upsertBlogIdeaRows(
	db: D1Database,
	topic: BlogIdeasSheetKey,
	rows: BlogIdeaRow[],
): Promise<{ inserted: number; updated: number }> {
	let inserted = 0;
	let updated = 0;
	for (const row of rows) {
		const existing = row.no
			? await db
					.prepare(`SELECT id FROM blog_ideas WHERE topic = ? AND no = ?`)
					.bind(topic, row.no)
					.first<{ id: string }>()
			: await db
					.prepare(`SELECT id FROM blog_ideas WHERE topic = ? AND title = ? AND no = ''`)
					.bind(topic, row.title)
					.first<{ id: string }>();
		const details = JSON.stringify(row.details);
		if (existing) {
			await db
				.prepare(
					`UPDATE blog_ideas
					 SET title = ?, category = ?, summary = ?, badge = ?, details = ?, updated_at = datetime('now')
					 WHERE id = ?`,
				)
				.bind(row.title, row.category, row.summary, row.badge, details, existing.id)
				.run();
			updated += 1;
			continue;
		}
		await db
			.prepare(
				`INSERT INTO blog_ideas
				 (id, topic, no, title, category, summary, badge, details)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				newId("idea"),
				topic,
				row.no,
				row.title,
				row.category,
				row.summary,
				row.badge,
				details,
			)
			.run();
		inserted += 1;
	}
	return { inserted, updated };
}

export function ideasFromCsv(topic: BlogIdeasSheetKey, csv: string): BlogIdeaRow[] {
	if (csv.length > CSV_MAX_CHARS) {
		throw new Error("CSV が大きすぎます（1.5MB まで）");
	}
	const table = parseCsv(csv);
	if (table.length === 0) {
		throw new Error("CSV が空です");
	}
	const rows = parseRowsForSheet(topic, table);
	if (rows.length === 0) {
		throw new Error("取り込める行がありません。1行目をヘッダーにしてください");
	}
	if (rows.length > CSV_MAX_ROWS) {
		throw new Error(`一度に取り込めるのは ${CSV_MAX_ROWS} 件までです`);
	}
	return rows;
}

export async function setBlogIdeaUse(
	db: D1Database,
	ideaId: string,
	medium: BlogIdeaMedium,
	destination: BlogPostDestination | XPostDestination,
	enabled: boolean,
): Promise<void> {
	if (!isBlogIdeaDestination(medium, destination)) {
		throw new Error("転用先が不正です");
	}
	const idea = await db
		.prepare(`SELECT id FROM blog_ideas WHERE id = ?`)
		.bind(ideaId)
		.first<{ id: string }>();
	if (!idea) {
		throw new Error("ネタが見つかりません");
	}
	if (enabled) {
		await db
			.prepare(
				`INSERT OR IGNORE INTO blog_idea_uses (id, idea_id, medium, destination)
				 VALUES (?, ?, ?, ?)`,
			)
			.bind(newId("ideause"), ideaId, medium, destination)
			.run();
		return;
	}
	await db
		.prepare(
			`DELETE FROM blog_idea_uses WHERE idea_id = ? AND medium = ? AND destination = ?`,
		)
		.bind(ideaId, medium, destination)
		.run();
}

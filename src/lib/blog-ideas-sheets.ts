import {
	BLOG_IDEAS_SHEET_TITLE,
	type BlogIdeasSheetKey,
} from "@/lib/bulletin-board";

export type BlogIdeaDetail = {
	label: string;
	value: string;
};

export type BlogIdeaUse = {
	medium: "blog" | "x";
	destination: string;
};

export type BlogIdeaRow = {
	id: string;
	sheet: BlogIdeasSheetKey;
	rowNumber: number;
	no: string;
	title: string;
	category: string;
	summary: string;
	badge: string;
	details: BlogIdeaDetail[];
	uses: BlogIdeaUse[];
};

export type BlogIdeasBySheet = Record<BlogIdeasSheetKey, BlogIdeaRow[]>;

type SideBusinessField =
	| "no"
	| "title"
	| "category"
	| "summary"
	| "trend"
	| "automation"
	| "scale"
	| "revenue"
	| "difficulty"
	| "sources";

type AgriField =
	| "no"
	| "mark"
	| "title"
	| "category"
	| "audience"
	| "plus"
	| "minus"
	| "analysis"
	| "evidence"
	| "sources"
	| "xPost";

const SIDE_BUSINESS_ALIASES: Record<SideBusinessField, string[]> = {
	no: ["no.", "no", "番号"],
	title: ["ビジネス・副業ネタ", "副業ネタ", "ネタ"],
	category: ["カテゴリ", "カテゴリー", "category"],
	summary: ["概要・ビジネスモデル", "概要", "ビジネスモデル"],
	trend: ["海外トレンド・実例", "海外トレンド", "実例"],
	automation: ["AIによる自動化の可能性", "自動化の可能性", "自動化"],
	scale: ["本業へのスケール方法", "スケール方法", "スケール"],
	revenue: ["収益性目安", "収益性"],
	difficulty: ["参入難易度 / 必要スキル", "参入難易度/必要スキル", "参入難易度", "必要スキル"],
	sources: ["海外参考ソース", "参考ソース"],
};

const AGRI_ALIASES: Record<AgriField, string[]> = {
	no: ["no.", "no", "番号"],
	mark: ["対象"],
	title: ["記事タイトル案", "タイトル案"],
	category: ["カテゴリ", "カテゴリー", "category"],
	audience: ["対象（誰にとって）", "対象(誰にとって)", "誰にとって"],
	plus: ["プラス影響"],
	minus: ["マイナス影響"],
	analysis: ["フラットな分析軸", "分析軸"],
	evidence: ["数字根拠・出典", "数字根拠", "出典"],
	sources: ["参考ソース"],
	xPost: ["X投稿", "x投稿"],
};

type Column<T extends string> = {
	field: T;
	label: string;
	index: number;
};

function normalizeHeader(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/[._]/g, "")
		.replace(/[／]/g, "/");
}

function resolveField<T extends string>(
	header: string,
	aliases: Record<T, string[]>,
): T | null {
	const normalized = normalizeHeader(header);
	if (!normalized) return null;
	let best: { field: T; len: number } | null = null;
	for (const [field, list] of Object.entries(aliases) as [T, string[]][]) {
		for (const alias of list) {
			const aliasNormalized = normalizeHeader(alias);
			if (aliasNormalized === normalized && (!best || aliasNormalized.length > best.len)) {
				best = { field, len: aliasNormalized.length };
			}
		}
	}
	return best?.field ?? null;
}

function cell(row: string[], index: number | undefined): string {
	if (index === undefined || index < 0) return "";
	return (row[index] ?? "").trim();
}

function findLayout<T extends string>(
	rows: string[][],
	aliases: Record<T, string[]>,
	required: T[],
	sheetLabel: string,
): { headerIndex: number; columns: Column<T>[] } {
	for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
		const columns: Column<T>[] = [];
		const found = new Set<T>();
		for (let col = 0; col < (rows[i]?.length ?? 0); col += 1) {
			const label = (rows[i][col] ?? "").trim();
			const field = resolveField(label, aliases);
			if (field && !found.has(field)) {
				found.add(field);
				columns.push({ field, label, index: col });
			}
		}
		if (required.every((field) => found.has(field))) {
			return { headerIndex: i, columns };
		}
	}
	throw new Error(
		`「${sheetLabel}」に必要な列（${required.join(" / ")}）が見つかりません。1行目付近にヘッダーを置いてください。`,
	);
}

function detailsFromRow<T extends string>(
	row: string[],
	columns: Column<T>[],
	omit: T[],
): BlogIdeaDetail[] {
	const skip = new Set(omit);
	const details: BlogIdeaDetail[] = [];
	for (const column of columns) {
		if (skip.has(column.field)) continue;
		const value = cell(row, column.index);
		if (!value) continue;
		details.push({ label: column.label, value });
	}
	return details;
}

function columnIndex<T extends string>(columns: Column<T>[], field: T): number | undefined {
	return columns.find((column) => column.field === field)?.index;
}

export function parseSideBusinessRows(rows: string[][]): BlogIdeaRow[] {
	const { headerIndex, columns } = findLayout(
		rows,
		SIDE_BUSINESS_ALIASES,
		["title"],
		BLOG_IDEAS_SHEET_TITLE.sidebusiness,
	);
	const titleIndex = columnIndex(columns, "title");
	const noIndex = columnIndex(columns, "no");
	const categoryIndex = columnIndex(columns, "category");
	const summaryIndex = columnIndex(columns, "summary");
	const revenueIndex = columnIndex(columns, "revenue");

	const ideas: BlogIdeaRow[] = [];
	for (let i = headerIndex + 1; i < rows.length; i += 1) {
		const row = rows[i] ?? [];
		const title = cell(row, titleIndex);
		if (!title) continue;
		const no = cell(row, noIndex);
		ideas.push({
			id: `sidebusiness-${no || i + 1}`,
			sheet: "sidebusiness",
			rowNumber: i + 1,
			no,
			title,
			category: cell(row, categoryIndex),
			summary: cell(row, summaryIndex) || cell(row, revenueIndex),
			badge: "",
			details: detailsFromRow(row, columns, ["title", "no"]),
			uses: [],
		});
	}
	return ideas;
}

export function parseAgriRows(rows: string[][]): BlogIdeaRow[] {
	const { headerIndex, columns } = findLayout(
		rows,
		AGRI_ALIASES,
		["title"],
		BLOG_IDEAS_SHEET_TITLE.agri,
	);
	const titleIndex = columnIndex(columns, "title");
	const noIndex = columnIndex(columns, "no");
	const categoryIndex = columnIndex(columns, "category");
	const audienceIndex = columnIndex(columns, "audience");
	const plusIndex = columnIndex(columns, "plus");
	const markIndex = columnIndex(columns, "mark");
	const xPostIndex = columnIndex(columns, "xPost");

	const ideas: BlogIdeaRow[] = [];
	for (let i = headerIndex + 1; i < rows.length; i += 1) {
		const row = rows[i] ?? [];
		const title = cell(row, titleIndex);
		if (!title) continue;
		const no = cell(row, noIndex);
		ideas.push({
			id: `agri-${no || i + 1}`,
			sheet: "agri",
			rowNumber: i + 1,
			no,
			title,
			category: cell(row, categoryIndex),
			summary: cell(row, audienceIndex) || cell(row, plusIndex),
			badge: cell(row, xPostIndex) || cell(row, markIndex),
			details: detailsFromRow(row, columns, ["title", "no"]),
			uses: [],
		});
	}
	return ideas;
}

const TOPIC_TITLE_ALIASES = [
	"記事タイトル案",
	"タイトル案",
	"タイトル",
	"ビジネス・副業ネタ",
	"副業ネタ",
	"ネタ",
];
const TOPIC_NO_ALIASES = ["no.", "no", "番号"];
const TOPIC_CATEGORY_ALIASES = ["カテゴリ", "カテゴリー", "category"];
const TOPIC_SUMMARY_ALIASES = [
	"概要",
	"概要・ビジネスモデル",
	"ビジネスモデル",
	"対象（誰にとって）",
	"プラス影響",
];

function headerMatches(header: string, aliases: string[]): boolean {
	const normalized = normalizeHeader(header);
	return aliases.some((alias) => normalizeHeader(alias) === normalized);
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
	return headers.findIndex((header) => headerMatches(header, aliases));
}

/** 税務 / DX など、列構成が共通のネタシート */
export function parseTopicRows(rows: string[][], sheet: BlogIdeasSheetKey): BlogIdeaRow[] {
	const sheetLabel = BLOG_IDEAS_SHEET_TITLE[sheet];
	let headerIndex = -1;
	for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
		if (findHeaderIndex(rows[i] ?? [], TOPIC_TITLE_ALIASES) >= 0) {
			headerIndex = i;
			break;
		}
	}
	if (headerIndex < 0) {
		throw new Error(
			`「${sheetLabel}」にタイトル列が見つかりません。1行目付近にヘッダーを置いてください。`,
		);
	}

	const headers = (rows[headerIndex] ?? []).map((header) => header.trim());
	const titleIndex = findHeaderIndex(headers, TOPIC_TITLE_ALIASES);
	const noIndex = findHeaderIndex(headers, TOPIC_NO_ALIASES);
	const categoryIndex = findHeaderIndex(headers, TOPIC_CATEGORY_ALIASES);
	const summaryIndex = findHeaderIndex(headers, TOPIC_SUMMARY_ALIASES);

	const ideas: BlogIdeaRow[] = [];
	for (let i = headerIndex + 1; i < rows.length; i += 1) {
		const row = rows[i] ?? [];
		const title = cell(row, titleIndex);
		if (!title) continue;
		const no = noIndex >= 0 ? cell(row, noIndex) : "";
		const details: BlogIdeaDetail[] = [];
		for (let col = 0; col < headers.length; col += 1) {
			if (col === titleIndex || col === noIndex) continue;
			const label = headers[col];
			const value = cell(row, col);
			if (!label || !value) continue;
			details.push({ label, value });
		}
		ideas.push({
			id: `${sheet}-${no || i + 1}`,
			sheet,
			rowNumber: i + 1,
			no,
			title,
			category: categoryIndex >= 0 ? cell(row, categoryIndex) : "",
			summary: summaryIndex >= 0 ? cell(row, summaryIndex) : "",
			badge: "",
			details,
			uses: [],
		});
	}
	return ideas;
}

export function parseRowsForSheet(key: BlogIdeasSheetKey, rows: string[][]): BlogIdeaRow[] {
	if (key === "sidebusiness") return parseSideBusinessRows(rows);
	if (key === "agri") return parseAgriRows(rows);
	return parseTopicRows(rows, key);
}

/** UTF-8 CSV（先頭 BOM 可）。引用符内のカンマと改行を残す。 */
export function parseCsv(text: string): string[][] {
	const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let i = 0; i < source.length; i += 1) {
		const char = source[i];
		if (quoted) {
			if (char === '"') {
				if (source[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					quoted = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
			continue;
		}
		if (char === ",") {
			row.push(field);
			field = "";
			continue;
		}
		if (char === "\n") {
			row.push(field);
			field = "";
			if (row.some((value) => value.trim())) rows.push(row);
			row = [];
			continue;
		}
		field += char;
	}
	row.push(field);
	if (row.some((value) => value.trim())) rows.push(row);
	return rows;
}


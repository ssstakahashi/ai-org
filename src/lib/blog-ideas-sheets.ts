import { getGoogleAccessToken } from "@/lib/google-auth";
import {
	BLOG_IDEAS_SHEET_ID,
	BLOG_IDEAS_SHEET_KEYS,
	BLOG_IDEAS_SHEET_TITLE,
	type BlogIdeasSheetKey,
} from "@/lib/bulletin-board";
import {
	isSheetsSyncConfigured,
	type SheetsSyncEnv,
} from "@/lib/x-post-sheets-sync";

export type BlogIdeaDetail = {
	label: string;
	value: string;
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

function escapeSheetTitle(title: string): string {
	if (/^[A-Za-z0-9_]+$/.test(title)) return title;
	return `'${title.replace(/'/g, "''")}'`;
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
		`「${sheetLabel}」シートに必要な列（${required.join(" / ")}）が見つかりません。1行目付近にヘッダーを置いてください。`,
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
		});
	}
	return ideas;
}

async function sheetsFetch<T>(path: string, token: string): Promise<T> {
	const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Google Sheets API failed (${response.status}): ${text.slice(0, 500)}`);
	}
	return (await response.json()) as T;
}

async function getAccessToken(env: SheetsSyncEnv): Promise<string> {
	const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
	if (!email || !privateKey) {
		throw new Error("Google Service Account が未設定です");
	}
	return getGoogleAccessToken(email, privateKey);
}

async function loadSheetValues(token: string, sheetTitle: string): Promise<string[][]> {
	const data = await sheetsFetch<{
		sheets?: { properties?: { sheetId?: number; title?: string } }[];
	}>(`spreadsheets/${BLOG_IDEAS_SHEET_ID}?fields=sheets(properties(sheetId,title))`, token);

	const wanted = sheetTitle.toLowerCase();
	const sheet =
		data.sheets?.find((item) => item.properties?.title === sheetTitle) ??
		data.sheets?.find((item) => item.properties?.title?.toLowerCase() === wanted);
	const title = sheet?.properties?.title;
	if (!title) {
		const available =
			data.sheets
				?.map((item) => item.properties?.title)
				.filter((value): value is string => Boolean(value))
				.join(", ") || "なし";
		throw new Error(`シート「${sheetTitle}」が見つかりません（存在するシート: ${available}）`);
	}

	const range = `${escapeSheetTitle(title)}`;
	const values = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${BLOG_IDEAS_SHEET_ID}/values/${encodeURIComponent(range)}`,
		token,
	);
	return values.values ?? [];
}

export function emptyBlogIdeas(): BlogIdeasBySheet {
	return { sidebusiness: [], agri: [] };
}

export async function fetchBlogIdeasFromSheets(env: SheetsSyncEnv): Promise<BlogIdeasBySheet> {
	if (!isSheetsSyncConfigured(env)) {
		throw new Error("Google Service Account が未設定です");
	}

	try {
		const token = await getAccessToken(env);
		const [sidebusinessRows, agriRows] = await Promise.all(
			BLOG_IDEAS_SHEET_KEYS.map((key) => loadSheetValues(token, BLOG_IDEAS_SHEET_TITLE[key])),
		);
		return {
			sidebusiness: parseSideBusinessRows(sidebusinessRows),
			agri: parseAgriRows(agriRows),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
			const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "Service Account";
			throw new Error(
				`スプレッドシートを ${email} に「閲覧者」で共有してください。${message}`,
			);
		}
		throw error;
	}
}

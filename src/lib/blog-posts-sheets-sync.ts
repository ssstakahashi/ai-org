import { getGoogleAccessToken } from "@/lib/google-auth";
import {
	getBlogPostFromDb,
	listBlogPostsFromDb,
	upsertBlogPostFromSheet,
} from "@/lib/blog-posts";
import {
	AGRI_LP_BLOG_SHEET_GID,
	AGRI_LP_BLOG_SHEET_ID,
	STUDIOFOODS_HP_BLOG_SHEET_GID,
	STUDIOFOODS_HP_BLOG_SHEET_ID,
} from "@/lib/bulletin-board";
import { newId } from "@/lib/db";
import {
	BLOG_POST_DESTINATION_DEFAULT,
	BLOG_POST_DESTINATION_OPTIONS,
	BLOG_POST_STATUS_OPTIONS,
	type BlogPost,
	type BlogPostDestination,
	type BlogPostStatus,
} from "@/lib/types";
import { isSheetsSyncConfigured, type SheetsSyncEnv } from "@/lib/x-post-sheets-sync";

type SheetField =
	| "id"
	| "slug"
	| "title"
	| "excerpt"
	| "body"
	| "category"
	| "tags"
	| "thumbnail_url"
	| "published_on"
	| "status"
	| "notes"
	| "source"
	| "created_at"
	| "updated_at";

const DEFAULT_HEADERS: Record<SheetField, string> = {
	id: "id",
	slug: "slug",
	title: "title",
	excerpt: "excerpt",
	body: "body",
	category: "category",
	tags: "tags",
	thumbnail_url: "thumbnail_url",
	published_on: "published_on",
	status: "status",
	notes: "notes",
	source: "source",
	created_at: "created_at",
	updated_at: "updated_at",
};

const HEADER_ALIASES: Record<SheetField, string[]> = {
	id: ["id", "ID"],
	slug: ["slug", "スラッグ"],
	title: ["title", "タイトル", "見出し"],
	excerpt: ["excerpt", "リード", "概要"],
	body: ["body", "本文"],
	category: ["category", "カテゴリ", "カテゴリー"],
	tags: ["tags", "タグ"],
	thumbnail_url: ["thumbnail_url", "thumbnail", "サムネイル", "画像URL"],
	published_on: ["published_on", "公開日", "公開日表示"],
	status: ["status", "ステータス"],
	notes: ["notes", "メモ", "備考"],
	source: ["source", "ソース", "作成元"],
	created_at: ["created_at", "作成日時"],
	updated_at: ["updated_at", "更新日時"],
};

const FIELD_ORDER: SheetField[] = [
	"id",
	"slug",
	"title",
	"excerpt",
	"body",
	"category",
	"tags",
	"thumbnail_url",
	"published_on",
	"status",
	"notes",
	"source",
	"created_at",
	"updated_at",
];

const STATUS_ALIASES: Record<BlogPostStatus, string[]> = {
	draft: ["draft", "下書き"],
	approved: ["approved", "承認済", "承認済み"],
	published: ["published", "公開済", "公開済み"],
	rejected: ["rejected", "差戻し", "差戻", "差し戻し"],
};

type BlogSheetTarget = {
	destination: BlogPostDestination;
	sheetId: string;
	sheetGid: number;
};

const BLOG_SHEET_TARGETS: Record<BlogPostDestination, BlogSheetTarget> = {
	studiofoods_hp: {
		destination: "studiofoods_hp",
		sheetId: STUDIOFOODS_HP_BLOG_SHEET_ID,
		sheetGid: STUDIOFOODS_HP_BLOG_SHEET_GID,
	},
	agri_lp: {
		destination: "agri_lp",
		sheetId: AGRI_LP_BLOG_SHEET_ID,
		sheetGid: AGRI_LP_BLOG_SHEET_GID,
	},
};

type SheetLayout = {
	sheetTitle: string;
	columnFields: (SheetField | null)[];
	idColumnIndex: number;
	headerRow: number;
};

type ParsedSheetRow = {
	rowNumber: number;
	id: string;
	generatedId: boolean;
	post: Omit<BlogPost, "destination">;
};

export type BlogSheetSyncResult = {
	pulled: number;
	createdLocal: number;
	updatedLocal: number;
	deletedLocal: number;
	createdSheet: number;
};

/** @deprecated 投稿先ごとの結果型に置き換え */
export type StudiofoodsHpBlogSheetSyncResult = BlogSheetSyncResult;

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function resolveField(header: string): SheetField | null {
	const normalized = normalizeHeader(header);
	if (!normalized) return null;
	for (const field of FIELD_ORDER) {
		if (HEADER_ALIASES[field].some((alias) => normalizeHeader(alias) === normalized)) {
			return field;
		}
	}
	return null;
}

function escapeSheetTitle(title: string): string {
	if (/^[A-Za-z0-9_]+$/.test(title)) return title;
	return `'${title.replace(/'/g, "''")}'`;
}

function columnLetter(index: number): string {
	let n = index + 1;
	let letters = "";
	while (n > 0) {
		const rem = (n - 1) % 26;
		letters = String.fromCharCode(65 + rem) + letters;
		n = Math.floor((n - 1) / 26);
	}
	return letters;
}

function cell(row: string[], index: number | undefined): string {
	if (index === undefined || index < 0) return "";
	return String(row[index] ?? "");
}

function parseSheetStatus(raw: string): BlogPostStatus {
	const value = raw.trim().toLowerCase().replace(/\s+/g, "");
	if (!value) return "draft";
	for (const status of BLOG_POST_STATUS_OPTIONS) {
		if (
			STATUS_ALIASES[status].some(
				(alias) => alias.toLowerCase().replace(/\s+/g, "") === value,
			)
		) {
			return status;
		}
	}
	if ((BLOG_POST_STATUS_OPTIONS as readonly string[]).includes(raw.trim())) {
		return raw.trim() as BlogPostStatus;
	}
	return "draft";
}

function rowValues(post: BlogPost, layout: SheetLayout): string[] {
	const values: Record<SheetField, string> = {
		id: post.id,
		slug: post.slug,
		title: post.title,
		excerpt: post.excerpt,
		body: post.body,
		category: post.category,
		tags: post.tags,
		thumbnail_url: post.thumbnail_url,
		published_on: post.published_on,
		status: post.status,
		notes: post.notes,
		source: post.source,
		created_at: post.created_at,
		updated_at: post.updated_at,
	};
	return layout.columnFields.map((field) => (field ? values[field] : ""));
}

function mergeRowValues(
	layout: SheetLayout,
	existing: string[],
	incoming: string[],
): string[] {
	return layout.columnFields.map((field, index) => {
		if (field === null) return existing[index] ?? "";
		return incoming[index] ?? "";
	});
}

async function sheetsFetch<T>(
	path: string,
	token: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Google Sheets API failed (${response.status}): ${text.slice(0, 500)}`);
	}

	if (response.status === 204) {
		return undefined as T;
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

async function getSheetTitle(token: string, target: BlogSheetTarget): Promise<string> {
	const data = await sheetsFetch<{
		sheets?: { properties?: { sheetId?: number; title?: string } }[];
	}>(
		`spreadsheets/${target.sheetId}?fields=sheets(properties(sheetId,title))`,
		token,
	);

	const sheet = data.sheets?.find((item) => item.properties?.sheetId === target.sheetGid);
	const title = sheet?.properties?.title;
	if (!title) {
		throw new Error(`シート gid=${target.sheetGid} が見つかりません`);
	}
	return title;
}

async function loadSheetValues(
	token: string,
	target: BlogSheetTarget,
	sheetTitle: string,
): Promise<string[][]> {
	const range = `${escapeSheetTitle(sheetTitle)}`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}`,
		token,
	);
	return data.values ?? [];
}

function detectLayout(sheetTitle: string, rows: string[][]): SheetLayout | null {
	for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
		const columnFields = (rows[i] ?? []).map((header) => resolveField(header));
		const idColumnIndex = columnFields.findIndex((field) => field === "id");
		const titleColumnIndex = columnFields.findIndex((field) => field === "title");
		if (idColumnIndex >= 0 && titleColumnIndex >= 0) {
			return {
				sheetTitle,
				columnFields,
				idColumnIndex,
				headerRow: i + 1,
			};
		}
	}
	return null;
}

async function createDefaultLayout(
	token: string,
	target: BlogSheetTarget,
	sheetTitle: string,
): Promise<SheetLayout> {
	const layout: SheetLayout = {
		sheetTitle,
		columnFields: FIELD_ORDER.map((field) => field),
		idColumnIndex: 0,
		headerRow: 1,
	};
	const range = `${escapeSheetTitle(sheetTitle)}!A1:${columnLetter(FIELD_ORDER.length - 1)}1`;
	const headers = FIELD_ORDER.map((field) => DEFAULT_HEADERS[field]);
	await sheetsFetch(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
		token,
		{
			method: "PUT",
			body: JSON.stringify({ values: [headers] }),
		},
	);
	return layout;
}

function parseSheetRows(layout: SheetLayout, rows: string[][]): ParsedSheetRow[] {
	const columns: Partial<Record<SheetField, number>> = {};
	layout.columnFields.forEach((field, index) => {
		if (field && columns[field] === undefined) {
			columns[field] = index;
		}
	});

	const parsed: ParsedSheetRow[] = [];
	const seenIds = new Set<string>();

	for (let i = layout.headerRow; i < rows.length; i += 1) {
		const row = rows[i] ?? [];
		const title = cell(row, columns.title).trim();
		const rawId = cell(row, columns.id).trim();
		if (!title && !rawId) continue;
		if (!title) continue;

		let id = rawId;
		let generatedId = false;
		if (!id) {
			id = newId("blog");
			generatedId = true;
		}
		if (seenIds.has(id)) {
			continue;
		}
		seenIds.add(id);

		parsed.push({
			rowNumber: i + 1,
			id,
			generatedId,
			post: {
				id,
				slug: cell(row, columns.slug).trim(),
				title,
				excerpt: cell(row, columns.excerpt),
				body: cell(row, columns.body),
				category: cell(row, columns.category).trim(),
				tags: cell(row, columns.tags),
				thumbnail_url: cell(row, columns.thumbnail_url).trim(),
				thumbnail_key: "",
				figure_keys: "[]",
				published_on: cell(row, columns.published_on).trim(),
				status: parseSheetStatus(cell(row, columns.status)),
				notes: cell(row, columns.notes),
				source: cell(row, columns.source).trim(),
				created_at: cell(row, columns.created_at).trim(),
				updated_at: cell(row, columns.updated_at).trim(),
			},
		});
	}

	return parsed;
}

async function readRow(
	token: string,
	target: BlogSheetTarget,
	layout: SheetLayout,
	rowNumber: number,
): Promise<string[]> {
	const lastColumn = columnLetter(Math.max(layout.columnFields.length - 1, 0));
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A${rowNumber}:${lastColumn}${rowNumber}`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}`,
		token,
	);
	const row = data.values?.[0] ?? [];
	return layout.columnFields.map((_, index) => row[index] ?? "");
}

async function writeRow(
	token: string,
	target: BlogSheetTarget,
	layout: SheetLayout,
	rowNumber: number,
	values: string[],
	existing?: string[],
): Promise<void> {
	const merged = existing ? mergeRowValues(layout, existing, values) : values;
	const lastColumn = columnLetter(Math.max(merged.length - 1, 0));
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A${rowNumber}:${lastColumn}${rowNumber}`;
	await sheetsFetch(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
		token,
		{
			method: "PUT",
			body: JSON.stringify({ values: [merged] }),
		},
	);
}

async function appendRow(
	token: string,
	target: BlogSheetTarget,
	layout: SheetLayout,
	values: string[],
): Promise<void> {
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A:${columnLetter(Math.max(values.length - 1, 0))}`;
	await sheetsFetch(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
		token,
		{
			method: "POST",
			body: JSON.stringify({ values: [values] }),
		},
	);
}

async function findRowIndexById(
	token: string,
	target: BlogSheetTarget,
	layout: SheetLayout,
	postId: string,
): Promise<number | null> {
	const idColumn = columnLetter(layout.idColumnIndex);
	const range = `${escapeSheetTitle(layout.sheetTitle)}!${idColumn}:${idColumn}`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${target.sheetId}/values/${encodeURIComponent(range)}`,
		token,
	);

	const rows = data.values ?? [];
	for (let i = layout.headerRow; i < rows.length; i += 1) {
		if (String(rows[i]?.[0] ?? "").trim() === postId) {
			return i + 1;
		}
	}
	return null;
}

async function deleteRow(
	token: string,
	target: BlogSheetTarget,
	rowNumber: number,
): Promise<void> {
	await sheetsFetch(`spreadsheets/${target.sheetId}:batchUpdate`, token, {
		method: "POST",
		body: JSON.stringify({
			requests: [
				{
					deleteDimension: {
						range: {
							sheetId: target.sheetGid,
							dimension: "ROWS",
							startIndex: rowNumber - 1,
							endIndex: rowNumber,
						},
					},
				},
			],
		}),
	});
}

function permissionError(env: SheetsSyncEnv, error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
		const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "Service Account";
		return new Error(
			`スプレッドシートを ${email} に「編集者」で共有してください。${message}`,
		);
	}
	return error instanceof Error ? error : new Error(message);
}

async function loadLayout(
	token: string,
	target: BlogSheetTarget,
): Promise<{ layout: SheetLayout; rows: string[][] }> {
	const sheetTitle = await getSheetTitle(token, target);
	const rows = await loadSheetValues(token, target, sheetTitle);
	const detected = detectLayout(sheetTitle, rows);
	if (detected) {
		return { layout: detected, rows };
	}
	const layout = await createDefaultLayout(token, target, sheetTitle);
	return { layout, rows: [FIELD_ORDER.map((field) => DEFAULT_HEADERS[field])] };
}

async function upsertPostOnTargetSheet(
	token: string,
	target: BlogSheetTarget,
	post: BlogPost,
): Promise<void> {
	const { layout } = await loadLayout(token, target);
	const values = rowValues(post, layout);
	const existingRow = await findRowIndexById(token, target, layout, post.id);
	if (existingRow) {
		const existingValues = await readRow(token, target, layout, existingRow);
		await writeRow(token, target, layout, existingRow, values, existingValues);
	} else {
		await appendRow(token, target, layout, values);
	}
}

async function removePostFromTargetSheet(
	token: string,
	target: BlogSheetTarget,
	postId: string,
): Promise<void> {
	const { layout } = await loadLayout(token, target);
	const rowNumber = await findRowIndexById(token, target, layout, postId);
	if (!rowNumber) return;
	await deleteRow(token, target, rowNumber);
}

export async function removeBlogPostFromSheet(
	env: SheetsSyncEnv,
	postId: string,
	destination: BlogPostDestination,
): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	try {
		const token = await getAccessToken(env);
		await removePostFromTargetSheet(token, BLOG_SHEET_TARGETS[destination], postId);
	} catch (error) {
		throw permissionError(env, error);
	}
}

export async function removeBlogPostFromAllSheets(
	env: SheetsSyncEnv,
	postId: string,
): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	try {
		const token = await getAccessToken(env);
		for (const destination of BLOG_POST_DESTINATION_OPTIONS) {
			await removePostFromTargetSheet(token, BLOG_SHEET_TARGETS[destination], postId);
		}
	} catch (error) {
		throw permissionError(env, error);
	}
}

/** 投稿先に応じて該当シートへ upsert。他投稿先のシートからは外す */
export async function syncBlogPostToSheetById(
	env: SheetsSyncEnv & { DB: D1Database },
	postId: string,
): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	const post = await getBlogPostFromDb(env.DB, postId);
	if (!post) {
		await removeBlogPostFromAllSheets(env, postId);
		return;
	}

	try {
		const token = await getAccessToken(env);
		await upsertPostOnTargetSheet(token, BLOG_SHEET_TARGETS[post.destination], post);
		for (const destination of BLOG_POST_DESTINATION_OPTIONS) {
			if (destination === post.destination) continue;
			await removePostFromTargetSheet(token, BLOG_SHEET_TARGETS[destination], postId);
		}
	} catch (error) {
		throw permissionError(env, error);
	}
}

export async function syncStudiofoodsHpPostToSheetById(
	env: SheetsSyncEnv & { DB: D1Database },
	postId: string,
): Promise<void> {
	await syncBlogPostToSheetById(env, postId);
}

export async function removeStudiofoodsHpPostFromSheet(
	env: SheetsSyncEnv,
	postId: string,
): Promise<void> {
	await removeBlogPostFromSheet(env, postId, BLOG_POST_DESTINATION_DEFAULT);
}

/**
 * 指定投稿先のシートを正として D1 を合わせる。
 * 同一 id はシートの内容で上書きし、シートに無い当該投稿先の記事は D1 から外す。
 */
export async function syncBlogPostsWithSheet(
	env: SheetsSyncEnv & { DB: D1Database },
	destination: BlogPostDestination,
): Promise<BlogSheetSyncResult> {
	if (!isSheetsSyncConfigured(env)) {
		throw new Error("Google Service Account が未設定です");
	}

	const target = BLOG_SHEET_TARGETS[destination];

	try {
		const token = await getAccessToken(env);
		const { layout, rows } = await loadLayout(token, target);
		const parsed = parseSheetRows(layout, rows);
		const localPosts = await listBlogPostsFromDb(env.DB, undefined, destination);
		const localById = new Map(localPosts.map((post) => [post.id, post]));

		let createdLocal = 0;
		let updatedLocal = 0;
		let createdSheet = 0;

		for (const row of parsed) {
			const existed = localById.has(row.id);
			await upsertBlogPostFromSheet(env.DB, row.post, destination);
			if (existed) updatedLocal += 1;
			else createdLocal += 1;

			if (row.generatedId) {
				const saved = await getBlogPostFromDb(env.DB, row.id);
				if (saved) {
					const existingValues = await readRow(token, target, layout, row.rowNumber);
					await writeRow(
						token,
						target,
						layout,
						row.rowNumber,
						rowValues(saved, layout),
						existingValues,
					);
					createdSheet += 1;
				}
			}
			localById.delete(row.id);
		}

		let deletedLocal = 0;
		for (const leftover of localById.values()) {
			await env.DB.prepare("DELETE FROM blog_posts WHERE id = ? AND destination = ?")
				.bind(leftover.id, destination)
				.run();
			deletedLocal += 1;
		}

		return {
			pulled: parsed.length,
			createdLocal,
			updatedLocal,
			deletedLocal,
			createdSheet,
		};
	} catch (error) {
		throw permissionError(env, error);
	}
}

export async function syncStudiofoodsHpBlogPostsWithSheet(
	env: SheetsSyncEnv & { DB: D1Database },
): Promise<BlogSheetSyncResult> {
	return syncBlogPostsWithSheet(env, BLOG_POST_DESTINATION_DEFAULT);
}

import { getGoogleAccessToken } from "@/lib/google-auth";
import { mediaUrl } from "@/lib/media-upload";
import { formatInAppTz } from "@/lib/timezone";
import { X_POST_STATUS_LABEL, type TaskStatus, type XPost } from "@/lib/types";

/** 転記先スプレッドシート（ユーザー指定） */
export const X_POST_SHEET_ID = "1a1ZZgAgHoxgoG6y2FB_SVFRb9YBlIFiW7rm1IlJeIvI";
export const X_POST_SHEET_GID = 1053570355;

export type SheetsSyncEnv = {
	GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
	GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
	APP_PUBLIC_URL?: string;
};

type SheetField =
	| "id"
	| "title"
	| "body"
	| "status"
	| "scheduled_at"
	| "scheduled_date"
	| "scheduled_weekday"
	| "scheduled_time"
	| "media"
	| "notes"
	| "image_url"
	| "x_post_id"
	| "x_post_url"
	| "last_error"
	| "created_at"
	| "updated_at";

const DEFAULT_HEADERS: Record<SheetField, string> = {
	id: "ID",
	title: "タイトル",
	body: "投稿文",
	status: "ステータス",
	scheduled_at: "予約日時",
	scheduled_date: "日付",
	scheduled_weekday: "曜日",
	scheduled_time: "投稿時間",
	media: "媒体",
	notes: "メモ",
	image_url: "画像URL",
	x_post_id: "X投稿ID",
	x_post_url: "X投稿URL",
	last_error: "エラー",
	created_at: "作成日時",
	updated_at: "更新日時",
};

const HEADER_ALIASES: Record<SheetField, string[]> = {
	id: ["id", "ID"],
	title: ["タイトル", "title", "Title", "投稿カテゴリー/キャンペーン名", "キャンペーン名"],
	body: ["投稿文", "body", "本文", "投稿内容・テキスト案", "投稿内容", "テキスト案"],
	status: ["ステータス", "status", "Status"],
	scheduled_at: ["予約日時", "scheduled_at", "予約"],
	scheduled_date: ["日付", "scheduled_date"],
	scheduled_weekday: ["曜日", "weekday"],
	scheduled_time: ["投稿時間", "scheduled_time", "時間"],
	media: ["媒体", "media"],
	notes: ["メモ", "notes", "Notes", "備考"],
	image_url: [
		"画像URL",
		"画像",
		"image_url",
		"image",
		"画像・動画ファイル名/リンク",
		"画像・動画",
	],
	x_post_id: ["X投稿ID", "x_post_id", "tweet_id"],
	x_post_url: ["X投稿URL", "x_url", "x_post_url", "投稿URL"],
	last_error: ["エラー", "last_error", "error"],
	created_at: ["作成日時", "created_at"],
	updated_at: ["更新日時", "updated_at"],
};

const FIELD_ORDER: SheetField[] = [
	"id",
	"title",
	"body",
	"status",
	"scheduled_at",
	"scheduled_date",
	"scheduled_weekday",
	"scheduled_time",
	"media",
	"notes",
	"image_url",
	"x_post_id",
	"x_post_url",
	"last_error",
	"created_at",
	"updated_at",
];

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase();
}

function resolveField(header: string): SheetField | null {
	const normalized = normalizeHeader(header);
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

function formatDateTime(value: string | null | undefined): string {
	if (!value) return "";
	return formatInAppTz(value, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatScheduledDate(value: string | null | undefined): string {
	if (!value) return "";
	return formatInAppTz(value, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

function formatScheduledWeekday(value: string | null | undefined): string {
	if (!value) return "";
	return formatInAppTz(value, { weekday: "short" });
}

function formatScheduledTime(value: string | null | undefined): string {
	if (!value) return "";
	return formatInAppTz(value, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function absoluteMediaUrl(baseUrl: string | undefined, imageKey: string | null): string {
	if (!imageKey) return "";
	const path = mediaUrl(imageKey);
	if (!baseUrl) return path;
	return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function xPostUrl(xPostId: string | null): string {
	if (!xPostId) return "";
	return `https://x.com/i/web/status/${xPostId}`;
}

function rowValues(post: XPost, layout: SheetLayout, env: SheetsSyncEnv): string[] {
	const values: Record<SheetField, string> = {
		id: post.id,
		title: post.title,
		body: post.body,
		status: X_POST_STATUS_LABEL[post.status as TaskStatus] ?? post.status,
		scheduled_at: formatDateTime(post.scheduled_at),
		scheduled_date: formatScheduledDate(post.scheduled_at),
		scheduled_weekday: formatScheduledWeekday(post.scheduled_at),
		scheduled_time: formatScheduledTime(post.scheduled_at),
		media: "X",
		notes: post.notes,
		image_url: absoluteMediaUrl(env.APP_PUBLIC_URL, post.image_key),
		x_post_id: post.x_post_id ?? "",
		x_post_url: xPostUrl(post.x_post_id),
		last_error: post.last_error ?? "",
		created_at: formatDateTime(post.created_at),
		updated_at: formatDateTime(post.updated_at),
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

export function isSheetsSyncConfigured(env: SheetsSyncEnv): boolean {
	return Boolean(
		env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
			env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
	);
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

async function getSheetTitle(token: string): Promise<string> {
	const data = await sheetsFetch<{
		sheets?: { properties?: { sheetId?: number; title?: string } }[];
	}>(`spreadsheets/${X_POST_SHEET_ID}?fields=sheets(properties(sheetId,title))`, token);

	const sheet = data.sheets?.find((item) => item.properties?.sheetId === X_POST_SHEET_GID);
	const title = sheet?.properties?.title;
	if (!title) {
		throw new Error(`シート gid=${X_POST_SHEET_GID} が見つかりません`);
	}
	return title;
}

type SheetLayout = {
	sheetTitle: string;
	columnFields: (SheetField | null)[];
	idColumnIndex: number;
};

async function loadSheetLayout(token: string, sheetTitle: string): Promise<SheetLayout | null> {
	const range = `${escapeSheetTitle(sheetTitle)}!1:1`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}`,
		token,
	);

	const headers = data.values?.[0] ?? [];
	if (headers.length === 0) {
		return null;
	}

	const columnFields = headers.map((header) => resolveField(header));
	const idColumnIndex = columnFields.findIndex((field) => field === "id");

	return {
		sheetTitle,
		columnFields,
		idColumnIndex,
	};
}

async function createDefaultLayout(sheetTitle: string): Promise<SheetLayout> {
	return {
		sheetTitle,
		columnFields: FIELD_ORDER.map((field) => field),
		idColumnIndex: 0,
	};
}

async function ensureHeaderRow(token: string, layout: SheetLayout): Promise<void> {
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A1:${columnLetter(FIELD_ORDER.length - 1)}1`;
	const headers = FIELD_ORDER.map((field) => DEFAULT_HEADERS[field]);
	await sheetsFetch(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
		token,
		{
			method: "PUT",
			body: JSON.stringify({ values: [headers] }),
		},
	);
}

/** 既存ヘッダー行に ID 列が無い場合、先頭列へ挿入する */
async function ensureIdColumn(token: string, layout: SheetLayout): Promise<SheetLayout> {
	if (layout.idColumnIndex >= 0) return layout;

	await sheetsFetch(`spreadsheets/${X_POST_SHEET_ID}:batchUpdate`, token, {
		method: "POST",
		body: JSON.stringify({
			requests: [
				{
					insertDimension: {
						range: {
							sheetId: X_POST_SHEET_GID,
							dimension: "COLUMNS",
							startIndex: 0,
							endIndex: 1,
						},
						inheritFromBefore: false,
					},
				},
			],
		}),
	});

	const headerRange = `${escapeSheetTitle(layout.sheetTitle)}!A1`;
	await sheetsFetch(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
		token,
		{
			method: "PUT",
			body: JSON.stringify({ values: [[DEFAULT_HEADERS.id]] }),
		},
	);

	return {
		...layout,
		columnFields: ["id", ...layout.columnFields],
		idColumnIndex: 0,
	};
}

async function findRowIndexById(
	token: string,
	layout: SheetLayout,
	postId: string,
): Promise<number | null> {
	const idColumn = columnLetter(layout.idColumnIndex);
	const range = `${escapeSheetTitle(layout.sheetTitle)}!${idColumn}:${idColumn}`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}`,
		token,
	);

	const rows = data.values ?? [];
	for (let i = 1; i < rows.length; i += 1) {
		if (String(rows[i]?.[0] ?? "").trim() === postId) {
			return i + 1;
		}
	}
	return null;
}

async function readRow(
	token: string,
	layout: SheetLayout,
	rowNumber: number,
): Promise<string[]> {
	const lastColumn = columnLetter(Math.max(layout.columnFields.length - 1, 0));
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A${rowNumber}:${lastColumn}${rowNumber}`;
	const data = await sheetsFetch<{ values?: string[][] }>(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}`,
		token,
	);
	const row = data.values?.[0] ?? [];
	return layout.columnFields.map((_, index) => row[index] ?? "");
}

async function writeRow(
	token: string,
	layout: SheetLayout,
	rowNumber: number,
	values: string[],
	existing?: string[],
): Promise<void> {
	const merged = existing ? mergeRowValues(layout, existing, values) : values;
	const lastColumn = columnLetter(Math.max(merged.length - 1, 0));
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A${rowNumber}:${lastColumn}${rowNumber}`;
	await sheetsFetch(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
		token,
		{
			method: "PUT",
			body: JSON.stringify({ values: [merged] }),
		},
	);
}

async function appendRow(token: string, layout: SheetLayout, values: string[]): Promise<void> {
	const range = `${escapeSheetTitle(layout.sheetTitle)}!A:${columnLetter(values.length - 1)}`;
	await sheetsFetch(
		`spreadsheets/${X_POST_SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
		token,
		{
			method: "POST",
			body: JSON.stringify({ values: [values] }),
		},
	);
}

async function deleteRow(token: string, sheetTitle: string, rowNumber: number): Promise<void> {
	await sheetsFetch(`spreadsheets/${X_POST_SHEET_ID}:batchUpdate`, token, {
		method: "POST",
		body: JSON.stringify({
			requests: [
				{
					deleteDimension: {
						range: {
							sheetId: X_POST_SHEET_GID,
							dimension: "ROWS",
							startIndex: rowNumber - 1,
							endIndex: rowNumber,
						},
					},
				},
			],
		}),
	});
	void sheetTitle;
}

/** x_posts の1行をスプレッドシートへ upsert */
export async function syncXPostToSheet(env: SheetsSyncEnv, post: XPost): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	const token = await getAccessToken(env);
	const sheetTitle = await getSheetTitle(token);
	let layout = await loadSheetLayout(token, sheetTitle);

	if (!layout) {
		layout = await createDefaultLayout(sheetTitle);
		await ensureHeaderRow(token, layout);
	} else {
		layout = await ensureIdColumn(token, layout);
	}

	const values = rowValues(post, layout, env);
	const existingRow = await findRowIndexById(token, layout, post.id);
	if (existingRow) {
		const existingValues = await readRow(token, layout, existingRow);
		await writeRow(token, layout, existingRow, values, existingValues);
	} else {
		await appendRow(token, layout, values);
	}
}

/** x_posts の削除をスプレッドシートへ反映 */
export async function removeXPostFromSheet(env: SheetsSyncEnv, postId: string): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	const token = await getAccessToken(env);
	const sheetTitle = await getSheetTitle(token);
	const layout = await loadSheetLayout(token, sheetTitle);
	if (!layout) return;
	const rowNumber = await findRowIndexById(token, layout, postId);
	if (!rowNumber) return;
	await deleteRow(token, sheetTitle, rowNumber);
}

/** DB から読み込んでスプレッドシートへ upsert（失敗しても呼び出し元は継続） */
export async function syncXPostToSheetById(
	env: SheetsSyncEnv & { DB: D1Database },
	postId: string,
): Promise<void> {
	if (!isSheetsSyncConfigured(env)) return;

	const post = await env.DB.prepare(
		`SELECT id, title, body, image_key, status, scheduled_at, notes,
		        x_post_id, last_error, created_at, updated_at
		 FROM x_posts WHERE id = ?`,
	)
		.bind(postId)
		.first<XPost>();

	if (!post) return;
	await syncXPostToSheet(env, post);
}

/** 非同期 fire-and-forget 用。Sheets 失敗はログのみ */
export function queueXPostSheetSync(
	env: SheetsSyncEnv & { DB: D1Database },
	postId: string,
): void {
	if (!isSheetsSyncConfigured(env)) return;
	void syncXPostToSheetById(env, postId).catch((error) => {
		console.error("x-post sheets sync failed", postId, error);
	});
}

export function queueXPostSheetRemoval(env: SheetsSyncEnv, postId: string): void {
	if (!isSheetsSyncConfigured(env)) return;
	void removeXPostFromSheet(env, postId).catch((error) => {
		console.error("x-post sheets removal failed", postId, error);
	});
}

export type SyncAllXPostsResult = {
	total: number;
	synced: number;
	failed: number;
	errors: string[];
};

/** x_posts 全件をスプレッドシートへ upsert（手動同期用） */
export async function syncAllXPostsToSheet(
	env: SheetsSyncEnv & { DB: D1Database },
): Promise<SyncAllXPostsResult> {
	if (!isSheetsSyncConfigured(env)) {
		throw new Error(
			"Google Service Account が未設定です。.dev.vars または Workers シークレットを確認してください。",
		);
	}

	const { results } = await env.DB.prepare(
		`SELECT id, title, body, image_key, status, scheduled_at, notes,
		        x_post_id, last_error, created_at, updated_at
		 FROM x_posts ORDER BY created_at ASC`,
	).all<XPost>();

	const posts = results ?? [];
	let synced = 0;
	const errors: string[] = [];

	for (const post of posts) {
		try {
			await syncXPostToSheet(env, post);
			synced += 1;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`${post.id}: ${message}`);
		}
	}

	return {
		total: posts.length,
		synced,
		failed: errors.length,
		errors,
	};
}

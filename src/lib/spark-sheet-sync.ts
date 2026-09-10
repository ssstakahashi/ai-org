import type { AutomationStatus } from "@/lib/automations";
import type { IngestAutomation } from "@/lib/automation-ingest";
import { getGoogleAccessToken } from "@/lib/google-auth";
import {
	SPARK_DEFAULT_LOCATION,
	SPARK_DEFAULT_RUNNER,
	SPARK_SOURCE,
	replaceSparkAutomations,
	slugifySparkId,
} from "@/lib/spark-automations";
import {
	isSheetsSyncConfigured,
	type SheetsSyncEnv,
} from "@/lib/x-post-sheets-sync";

/** Spark（Gemini）が書き込む自動化一覧（ユーザー指定） */
export const SPARK_SHEET_ID = "1yAQXXH7yYkZ9Xm89tGKoUwqnDFXOZ6XfdXm0T1pQZwA";
export const SPARK_SHEET_GID = 0;
export const SPARK_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1yAQXXH7yYkZ9Xm89tGKoUwqnDFXOZ6XfdXm0T1pQZwA/edit?gid=0#gid=0";

export type SparkSheetPullResult = {
	count: number;
	automations: IngestAutomation[];
};

type SparkSheetField = "id" | "name" | "status" | "trigger" | "summary" | "location" | "href";

const HEADER_ALIASES: Record<SparkSheetField, string[]> = {
	id: ["id", "ID"],
	name: ["自動化タイトル", "名称", "名前", "タイトル", "name", "Name"],
	status: ["ステータス", "status", "Status", "設定"],
	trigger: ["実行タイミング", "トリガー", "スケジュール", "trigger", "きっかけ"],
	summary: [
		"処理内容・プロンプト",
		"処理内容",
		"プロンプト",
		"内容",
		"概要",
		"説明",
		"summary",
	],
	location: ["所在", "location"],
	href: ["画面", "URL", "url", "href", "リンク"],
};

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, "");
}

function resolveField(header: string): SparkSheetField | null {
	const normalized = normalizeHeader(header);
	if (!normalized) return null;
	for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
		SparkSheetField,
		string[],
	][]) {
		if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
			return field;
		}
	}
	return null;
}

function escapeSheetTitle(title: string): string {
	if (/^[A-Za-z0-9_]+$/.test(title)) return title;
	return `'${title.replace(/'/g, "''")}'`;
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

function parseSparkStatus(raw: string): AutomationStatus {
	const value = raw.trim();
	if (!value) return "active";
	if (/手動|manual/i.test(value)) return "manual";
	if (/inactive|paused|無効|停止|未設定|none/i.test(value) && !/status_active|statusactive/i.test(value)) {
		return "none";
	}
	if (/active|有効|稼働/i.test(value)) return "active";
	return "active";
}

function cell(row: string[], index: number | undefined): string {
	if (index === undefined || index < 0) return "";
	return (row[index] ?? "").trim();
}

export function parseSparkSheetRows(rows: string[][]): IngestAutomation[] {
	let headerIndex = -1;
	let columns: Partial<Record<SparkSheetField, number>> = {};

	for (let i = 0; i < rows.length; i += 1) {
		const found: Partial<Record<SparkSheetField, number>> = {};
		for (let col = 0; col < (rows[i]?.length ?? 0); col += 1) {
			const field = resolveField(rows[i][col] ?? "");
			if (field && found[field] === undefined) found[field] = col;
		}
		if (found.name !== undefined || found.summary !== undefined) {
			headerIndex = i;
			columns = found;
			break;
		}
	}

	if (headerIndex < 0 || columns.name === undefined) {
		throw new Error(
			"スプレッドシートに「自動化タイトル」列が見つかりません。1行目付近に ID / 自動化タイトル / ステータス / 実行タイミング / 処理内容・プロンプト を置いてください。",
		);
	}

	const automations: IngestAutomation[] = [];
	const seenIds = new Set<string>();

	for (let i = headerIndex + 1; i < rows.length; i += 1) {
		const row = rows[i] ?? [];
		const name = cell(row, columns.name);
		const summary = cell(row, columns.summary);
		if (!name) continue;

		const rawId = cell(row, columns.id);
		let id = rawId || slugifySparkId(name) || `spark-row-${i + 1}`;
		if (seenIds.has(id)) {
			id = `${id}-${i + 1}`;
		}
		seenIds.add(id);

		automations.push({
			id,
			name,
			runner: SPARK_DEFAULT_RUNNER,
			status: parseSparkStatus(cell(row, columns.status)),
			trigger: cell(row, columns.trigger) || "Google Spark",
			summary,
			location: cell(row, columns.location) || SPARK_DEFAULT_LOCATION,
			href: cell(row, columns.href) || SPARK_SHEET_URL,
		});
	}

	return automations;
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
	}>(`spreadsheets/${SPARK_SHEET_ID}?fields=sheets(properties(sheetId,title))`, token);

	const sheet = data.sheets?.find((item) => item.properties?.sheetId === SPARK_SHEET_GID);
	const title = sheet?.properties?.title;
	if (!title) {
		throw new Error(`シート gid=${SPARK_SHEET_GID} が見つかりません`);
	}
	return title;
}

export async function fetchSparkAutomationsFromSheet(
	env: SheetsSyncEnv,
): Promise<IngestAutomation[]> {
	if (!isSheetsSyncConfigured(env)) {
		throw new Error("Google Service Account が未設定です");
	}

	try {
		const token = await getAccessToken(env);
		const sheetTitle = await getSheetTitle(token);
		const range = `${escapeSheetTitle(sheetTitle)}`;
		const data = await sheetsFetch<{ values?: string[][] }>(
			`spreadsheets/${SPARK_SHEET_ID}/values/${encodeURIComponent(range)}`,
			token,
		);
		return parseSparkSheetRows(data.values ?? []);
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

export async function pullSparkAutomationsFromSheet(
	env: SheetsSyncEnv & { DB: D1Database },
): Promise<SparkSheetPullResult> {
	const automations = await fetchSparkAutomationsFromSheet(env);
	await replaceSparkAutomations(env.DB, automations);
	return { count: automations.length, automations };
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BlogRuleError } from "@/lib/blog-post-rules";

export type PageQuery = {
	limit: number;
	updatedSince: string | null;
	cursor: { updatedAt: string; id: string } | null;
};

export function requestIdFrom(header: string | null): string {
	const value = header?.trim() ?? "";
	return value.slice(0, 200) || randomUUID();
}

export function apiJson(
	body: unknown,
	status: number,
	requestId: string,
): NextResponse {
	return NextResponse.json(body, {
		status,
		headers: { "X-Request-Id": requestId },
	});
}

export function apiError(
	status: number,
	code: string,
	message: string,
	requestId: string,
	detail: Record<string, unknown> = {},
): NextResponse {
	return apiJson({ error: { code, message, detail } }, status, requestId);
}

export function errorResponse(error: unknown, requestId: string): NextResponse {
	if (error instanceof BlogRuleError) {
		return apiError(error.httpStatus, error.code, error.message, requestId, error.detail);
	}
	console.error("api v1 failed", error);
	return apiError(500, "internal", "Internal Server Error", requestId);
}

export function parseUpdatedSince(raw: string | null): string | null {
	const value = raw?.trim() ?? "";
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new BlogRuleError(400, "invalid_updated_since", "updated_since は ISO8601 です");
	}
	return date.toISOString().replace("T", " ").slice(0, 19);
}

export function encodeCursor(updatedAt: string, id: string): string {
	return Buffer.from(`${updatedAt}\n${id}`, "utf8").toString("base64url");
}

export function parsePage(url: URL): PageQuery {
	const limitRaw = Number(url.searchParams.get("limit") ?? "50");
	if (!Number.isFinite(limitRaw) || limitRaw < 1) {
		throw new BlogRuleError(400, "invalid_limit", "limit は 1 から 200 です");
	}
	const limit = Math.min(200, Math.floor(limitRaw));
	const cursorRaw = url.searchParams.get("cursor")?.trim() ?? "";
	let cursor: PageQuery["cursor"] = null;
	if (cursorRaw) {
		try {
			const text = Buffer.from(cursorRaw, "base64url").toString("utf8");
			const nl = text.indexOf("\n");
			if (nl <= 0 || !text.slice(nl + 1)) {
				throw new Error("cursor");
			}
			cursor = { updatedAt: text.slice(0, nl), id: text.slice(nl + 1) };
		} catch {
			throw new BlogRuleError(400, "invalid_cursor", "cursor が不正です");
		}
	}
	return {
		limit,
		updatedSince: parseUpdatedSince(url.searchParams.get("updated_since")),
		cursor,
	};
}

export function pageClause(
	page: PageQuery,
	column: string,
): { sql: string; binds: string[] } {
	const filters: string[] = [];
	const binds: string[] = [];
	if (page.updatedSince) {
		filters.push(`${column} >= ?`);
		binds.push(page.updatedSince);
	}
	if (page.cursor) {
		filters.push(`(${column} < ? OR (${column} = ? AND id < ?))`);
		binds.push(page.cursor.updatedAt, page.cursor.updatedAt, page.cursor.id);
	}
	return {
		sql: filters.length > 0 ? ` AND ${filters.join(" AND ")}` : "",
		binds,
	};
}

export async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new BlogRuleError(400, "invalid_json", "JSON が不正です");
	}
}

export function asText(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

export function asRecord(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		throw new BlogRuleError(400, "invalid_json", "JSON object が必要です");
	}
	return raw as Record<string, unknown>;
}

import { newId, queryInChunks } from "@/lib/db";
import { parseXPostDestination } from "@/lib/x-posts";
import {
	X_POST_COMMENT_STATUS_OPTIONS,
	type XPost,
	type XPostComment,
	type XPostCommentStatus,
	type XPostDestination,
} from "@/lib/types";

export const X_POST_COMMENT_SELECT = `SELECT
	c.id, c.x_post_id, c.employee_id, c.author_name, c.source, c.body, c.status, c.created_at,
	e.name AS employee_name, e.color AS employee_color, e.text_color AS employee_text_color
 FROM x_post_comments c
 LEFT JOIN employees e ON e.id = c.employee_id`;

export const X_POST_COMMENT_ORDER = `ORDER BY
	CASE c.status WHEN 'open' THEN 0 ELSE 1 END,
	c.created_at ASC, c.id ASC`;

type XPostCommentRow = {
	id: string;
	x_post_id: string;
	employee_id: string | null;
	author_name: string;
	source: string;
	body: string;
	status: string | null;
	created_at: string;
	employee_name: string | null;
	employee_color: string | null;
	employee_text_color: string | null;
};

export type XPostCommentIngestInput = {
	x_post_id?: string;
	title?: string;
	destination?: XPostDestination;
	employee_id?: string;
	author_name?: string;
	source?: string;
	body: string;
};

export function parseXPostCommentStatus(raw: unknown): XPostCommentStatus {
	const value = String(raw ?? "").trim();
	if ((X_POST_COMMENT_STATUS_OPTIONS as readonly string[]).includes(value)) {
		return value as XPostCommentStatus;
	}
	throw new Error("コメントのステータスが不正です");
}

function asOptionalString(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

export function xPostCommentAuthorLabel(comment: XPostComment): string {
	return (
		comment.employee_name?.trim() ||
		comment.author_name.trim() ||
		comment.source.trim() ||
		"AI"
	);
}

export function withXPostCommentDefaults(row: XPostCommentRow): XPostComment {
	return {
		id: row.id,
		x_post_id: row.x_post_id,
		employee_id: row.employee_id?.trim() || null,
		author_name: row.author_name ?? "",
		source: row.source ?? "",
		body: row.body ?? "",
		status:
			row.status &&
			(X_POST_COMMENT_STATUS_OPTIONS as readonly string[]).includes(row.status)
				? (row.status as XPostCommentStatus)
				: "open",
		created_at: row.created_at,
		employee_name: row.employee_name ?? null,
		employee_color: row.employee_color ?? null,
		employee_text_color: row.employee_text_color ?? null,
	};
}

export function groupXPostComments(
	comments: XPostComment[],
): Record<string, XPostComment[]> {
	const grouped: Record<string, XPostComment[]> = {};
	for (const comment of comments) {
		const list = grouped[comment.x_post_id] ?? [];
		list.push(comment);
		grouped[comment.x_post_id] = list;
	}
	return grouped;
}

export function parseXPostCommentIngest(
	raw: unknown,
): { ok: true; input: XPostCommentIngestInput } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "JSON object required" };
	}
	const obj = raw as Record<string, unknown>;
	const body = asOptionalString(obj.body);
	if (!body) {
		return { ok: false, error: "body is required" };
	}

	const xPostId =
		asOptionalString(obj.x_post_id) ||
		asOptionalString(obj.post_id) ||
		asOptionalString(obj.id);
	const title = asOptionalString(obj.title);
	if (!xPostId && !title) {
		return { ok: false, error: "x_post_id or title is required" };
	}

	let destination: XPostDestination | undefined;
	if (asOptionalString(obj.destination)) {
		try {
			destination = parseXPostDestination(obj.destination);
		} catch {
			return { ok: false, error: "destination is invalid" };
		}
	}

	return {
		ok: true,
		input: {
			x_post_id: xPostId || undefined,
			title: title || undefined,
			destination,
			employee_id: asOptionalString(obj.employee_id) || undefined,
			author_name:
				asOptionalString(obj.author_name) || asOptionalString(obj.author) || undefined,
			source: asOptionalString(obj.source) || undefined,
			body,
		},
	};
}

export async function listXPostCommentsFromDb(
	db: D1Database,
	postIds?: string[],
): Promise<XPostComment[]> {
	if (postIds) {
		if (postIds.length === 0) return [];
		const rows = await queryInChunks<XPostCommentRow>(
			db,
			postIds,
			(placeholders) =>
				`${X_POST_COMMENT_SELECT}
				 WHERE c.x_post_id IN (${placeholders})
				 ${X_POST_COMMENT_ORDER}`,
		);
		return rows.map(withXPostCommentDefaults);
	}

	const { results } = await db
		.prepare(`${X_POST_COMMENT_SELECT} ${X_POST_COMMENT_ORDER}`)
		.all<XPostCommentRow>();
	return (results ?? []).map(withXPostCommentDefaults);
}

export async function getXPostCommentFromDb(
	db: D1Database,
	id: string,
): Promise<XPostComment | null> {
	const row = await db
		.prepare(`${X_POST_COMMENT_SELECT} WHERE c.id = ?`)
		.bind(id)
		.first<XPostCommentRow>();
	return row ? withXPostCommentDefaults(row) : null;
}

async function resolveCommentTargetPost(
	db: D1Database,
	input: XPostCommentIngestInput,
): Promise<XPost | null> {
	if (input.x_post_id) {
		return (
			(await db
				.prepare("SELECT id, title, status, destination FROM x_posts WHERE id = ?")
				.bind(input.x_post_id)
				.first<XPost>()) ?? null
		);
	}

	if (!input.title) return null;
	if (input.destination) {
		const { results } = await db
			.prepare(
				"SELECT id, title, status, destination FROM x_posts WHERE title = ? AND destination = ?",
			)
			.bind(input.title, input.destination)
			.all<XPost>();
		const matches = results ?? [];
		if (matches.length > 1) {
			throw new Error("title is ambiguous; specify x_post_id");
		}
		return matches[0] ?? null;
	}

	const { results } = await db
		.prepare("SELECT id, title, status, destination FROM x_posts WHERE title = ?")
		.bind(input.title)
		.all<XPost>();
	const matches = results ?? [];
	if (matches.length > 1) {
		throw new Error("title is ambiguous; specify destination or x_post_id");
	}
	return matches[0] ?? null;
}

export async function insertXPostCommentFromIngest(
	db: D1Database,
	input: XPostCommentIngestInput,
): Promise<XPostComment> {
	const post = await resolveCommentTargetPost(db, input);
	if (!post) {
		throw new Error("x post not found");
	}
	if (post.status === "done") {
		throw new Error("posted posts cannot be commented");
	}

	let employee: { id: string; name: string } | null = null;
	if (input.employee_id) {
		employee =
			(await db
				.prepare("SELECT id, name FROM employees WHERE id = ?")
				.bind(input.employee_id)
				.first<{ id: string; name: string }>()) ?? null;
		if (!employee) {
			throw new Error("employee not found");
		}
	}

	const id = newId("xpostc");
	const authorName = input.author_name || employee?.name || "";
	const source = input.source || "";
	await db
		.prepare(
			`INSERT INTO x_post_comments
				(id, x_post_id, employee_id, author_name, source, body, status)
			 VALUES (?, ?, ?, ?, ?, ?, 'open')`,
		)
		.bind(id, post.id, employee?.id ?? null, authorName, source, input.body)
		.run();

	const saved = await getXPostCommentFromDb(db, id);
	if (!saved) {
		throw new Error("comment save failed");
	}
	return saved;
}

export async function updateXPostCommentStatusInDb(
	db: D1Database,
	id: string,
	status: XPostCommentStatus,
): Promise<void> {
	const existing = await db
		.prepare("SELECT id FROM x_post_comments WHERE id = ?")
		.bind(id)
		.first<{ id: string }>();
	if (!existing) {
		throw new Error("comment not found");
	}
	await db
		.prepare("UPDATE x_post_comments SET status = ? WHERE id = ?")
		.bind(status, id)
		.run();
}

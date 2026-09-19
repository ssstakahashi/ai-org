import { newId, queryInChunks } from "@/lib/db";
import { parseBlogPostDestination } from "@/lib/blog-posts";
import {
	BLOG_POST_COMMENT_STATUS_OPTIONS,
	type BlogPost,
	type BlogPostComment,
	type BlogPostCommentStatus,
	type BlogPostDestination,
} from "@/lib/types";

export const BLOG_POST_COMMENT_SELECT = `SELECT
	c.id, c.blog_post_id, c.employee_id, c.author_name, c.source, c.body, c.status, c.created_at,
	e.name AS employee_name, e.color AS employee_color, e.text_color AS employee_text_color
 FROM blog_post_comments c
 LEFT JOIN employees e ON e.id = c.employee_id`;

export const BLOG_POST_COMMENT_ORDER = `ORDER BY
	CASE c.status WHEN 'open' THEN 0 ELSE 1 END,
	c.created_at ASC, c.id ASC`;

type BlogPostCommentRow = {
	id: string;
	blog_post_id: string;
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

export type BlogPostCommentIngestInput = {
	blog_post_id?: string;
	slug?: string;
	destination?: BlogPostDestination;
	employee_id?: string;
	author_name?: string;
	source?: string;
	body: string;
};

export function parseBlogPostCommentStatus(raw: unknown): BlogPostCommentStatus {
	const value = String(raw ?? "").trim();
	if ((BLOG_POST_COMMENT_STATUS_OPTIONS as readonly string[]).includes(value)) {
		return value as BlogPostCommentStatus;
	}
	throw new Error("コメントのステータスが不正です");
}

function asOptionalString(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

export function commentAuthorLabel(comment: BlogPostComment): string {
	return (
		comment.employee_name?.trim() ||
		comment.author_name.trim() ||
		comment.source.trim() ||
		"AI"
	);
}

export function withCommentDefaults(row: BlogPostCommentRow): BlogPostComment {
	return {
		id: row.id,
		blog_post_id: row.blog_post_id,
		employee_id: row.employee_id?.trim() || null,
		author_name: row.author_name ?? "",
		source: row.source ?? "",
		body: row.body ?? "",
		status:
			row.status &&
			(BLOG_POST_COMMENT_STATUS_OPTIONS as readonly string[]).includes(row.status)
				? (row.status as BlogPostCommentStatus)
				: "open",
		created_at: row.created_at,
		employee_name: row.employee_name ?? null,
		employee_color: row.employee_color ?? null,
		employee_text_color: row.employee_text_color ?? null,
	};
}

export function groupBlogPostComments(
	comments: BlogPostComment[],
): Record<string, BlogPostComment[]> {
	const grouped: Record<string, BlogPostComment[]> = {};
	for (const comment of comments) {
		const list = grouped[comment.blog_post_id] ?? [];
		list.push(comment);
		grouped[comment.blog_post_id] = list;
	}
	return grouped;
}

export function parseBlogPostCommentIngest(
	raw: unknown,
): { ok: true; input: BlogPostCommentIngestInput } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "JSON object required" };
	}
	const obj = raw as Record<string, unknown>;
	const body = asOptionalString(obj.body);
	if (!body) {
		return { ok: false, error: "body is required" };
	}

	const blogPostId =
		asOptionalString(obj.blog_post_id) ||
		asOptionalString(obj.post_id) ||
		asOptionalString(obj.id);
	const slug = asOptionalString(obj.slug);
	if (!blogPostId && !slug) {
		return { ok: false, error: "blog_post_id or slug is required" };
	}

	let destination: BlogPostDestination | undefined;
	if (asOptionalString(obj.destination)) {
		try {
			destination = parseBlogPostDestination(obj.destination);
		} catch {
			return { ok: false, error: "destination is invalid" };
		}
	}

	return {
		ok: true,
		input: {
			blog_post_id: blogPostId || undefined,
			slug: slug || undefined,
			destination,
			employee_id: asOptionalString(obj.employee_id) || undefined,
			author_name:
				asOptionalString(obj.author_name) || asOptionalString(obj.author) || undefined,
			source: asOptionalString(obj.source) || undefined,
			body,
		},
	};
}

export async function listBlogPostCommentsFromDb(
	db: D1Database,
	postIds?: string[],
): Promise<BlogPostComment[]> {
	if (postIds) {
		if (postIds.length === 0) return [];
		const rows = await queryInChunks<BlogPostCommentRow>(
			db,
			postIds,
			(placeholders) =>
				`${BLOG_POST_COMMENT_SELECT}
				 WHERE c.blog_post_id IN (${placeholders})
				 ${BLOG_POST_COMMENT_ORDER}`,
		);
		return rows.map(withCommentDefaults);
	}

	const { results } = await db
		.prepare(`${BLOG_POST_COMMENT_SELECT} ${BLOG_POST_COMMENT_ORDER}`)
		.all<BlogPostCommentRow>();
	return (results ?? []).map(withCommentDefaults);
}

export async function getBlogPostCommentFromDb(
	db: D1Database,
	id: string,
): Promise<BlogPostComment | null> {
	const row = await db
		.prepare(`${BLOG_POST_COMMENT_SELECT} WHERE c.id = ?`)
		.bind(id)
		.first<BlogPostCommentRow>();
	return row ? withCommentDefaults(row) : null;
}

async function resolveCommentTargetPost(
	db: D1Database,
	input: BlogPostCommentIngestInput,
): Promise<BlogPost | null> {
	if (input.blog_post_id) {
		return (
			(await db
				.prepare("SELECT id, slug, status, destination FROM blog_posts WHERE id = ?")
				.bind(input.blog_post_id)
				.first<BlogPost>()) ?? null
		);
	}

	if (!input.slug) return null;
	if (input.destination) {
		return (
			(await db
				.prepare(
					"SELECT id, slug, status, destination FROM blog_posts WHERE slug = ? AND destination = ?",
				)
				.bind(input.slug, input.destination)
				.first<BlogPost>()) ?? null
		);
	}

	const { results } = await db
		.prepare("SELECT id, slug, status, destination FROM blog_posts WHERE slug = ?")
		.bind(input.slug)
		.all<BlogPost>();
	const matches = results ?? [];
	if (matches.length > 1) {
		throw new Error("slug is ambiguous; specify destination");
	}
	return matches[0] ?? null;
}

export async function insertBlogPostCommentFromIngest(
	db: D1Database,
	input: BlogPostCommentIngestInput,
): Promise<BlogPostComment> {
	const post = await resolveCommentTargetPost(db, input);
	if (!post) {
		throw new Error("blog post not found");
	}
	if (post.status === "published") {
		throw new Error("published posts cannot be commented");
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

	const id = newId("blogc");
	const authorName = input.author_name || employee?.name || "";
	const source = input.source || "";
	await db
		.prepare(
			`INSERT INTO blog_post_comments
				(id, blog_post_id, employee_id, author_name, source, body, status)
			 VALUES (?, ?, ?, ?, ?, ?, 'open')`,
		)
		.bind(id, post.id, employee?.id ?? null, authorName, source, input.body)
		.run();

	const saved = await getBlogPostCommentFromDb(db, id);
	if (!saved) {
		throw new Error("comment save failed");
	}
	return saved;
}

export async function updateBlogPostCommentStatusInDb(
	db: D1Database,
	id: string,
	status: BlogPostCommentStatus,
): Promise<void> {
	const existing = await db
		.prepare("SELECT id FROM blog_post_comments WHERE id = ?")
		.bind(id)
		.first<{ id: string }>();
	if (!existing) {
		throw new Error("comment not found");
	}
	await db
		.prepare("UPDATE blog_post_comments SET status = ? WHERE id = ?")
		.bind(status, id)
		.run();
}

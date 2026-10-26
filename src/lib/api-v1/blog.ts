import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import {
	BLOG_POST_SELECT,
	getBlogPostFromDb,
	parseBlogPostDestination,
	parseBlogPostStatus,
	upsertBlogPostFromIngest,
} from "@/lib/blog-posts";
import {
	getBlogPostCommentFromDb,
	insertBlogPostCommentFromIngest,
} from "@/lib/blog-post-comments";
import {
	BlogRuleError,
	hashBody,
	inferThumbnailOrigin,
} from "@/lib/blog-post-rules";
import { notifyOps } from "@/lib/ops-alerts";
import { changeBlogPostStatus, recordBlogAudit } from "@/lib/blog-post-workflow";
import type { BlogPost, BlogPostComment, BlogPostStatus } from "@/lib/types";
import type { ApiActor } from "@/lib/api-v1/auth";
import {
	asRecord,
	asText,
	encodeCursor,
	pageClause,
	type PageQuery,
} from "@/lib/api-v1/http";

function toApiPost(post: BlogPost) {
	const body = post.body ?? "";
	return {
		id: post.id,
		slug: post.slug,
		destination: post.destination,
		status: post.status,
		title: post.title,
		excerpt: post.excerpt,
		body,
		category: post.category,
		thumbnail_url: post.thumbnail_url,
		thumbnail_key: post.thumbnail_key,
		thumbnail_origin:
			post.thumbnail_origin || inferThumbnailOrigin(post.thumbnail_url ?? "", ""),
		tags: post.tags,
		notes: post.notes,
		source: post.source,
		external_check_date: post.external_check_date ?? "",
		external_check_result: post.external_check_result ?? "",
		rewrite_mark: post.rewrite_mark ?? "",
		version: Number(post.version ?? 1),
		body_hash: post.body_hash || hashBody(body),
		created_at: post.created_at,
		updated_at: post.updated_at,
		published_on: post.published_on,
		published_at: post.published_at ?? "",
		published_url: post.published_url ?? "",
	};
}

function toApiComment(comment: BlogPostComment) {
	return {
		id: comment.id,
		blog_post_id: comment.blog_post_id,
		author_name: comment.author_name,
		source: comment.source,
		body: comment.body,
		status: comment.status === "open" ? "open" : "resolved",
		target_body_hash: comment.target_body_hash ?? "",
		verdict: comment.verdict ?? "",
		quote: comment.quote ?? "",
		reason: comment.reason ?? "",
		suggestion: comment.suggestion ?? "",
		resolved_by: comment.resolved_by ?? "",
		decision_status: comment.decision_status ?? "",
		created_at: comment.created_at,
	};
}

function revalidateBlog() {
	revalidatePath("/blog-drafts");
	revalidatePath("/board");
}

export async function listBlogPosts(db: D1Database, url: URL, page: PageQuery) {
	const filters: string[] = [];
	const binds: string[] = [];
	const destination = url.searchParams.get("destination")?.trim();
	if (destination) {
		try {
			filters.push("destination = ?");
			binds.push(parseBlogPostDestination(destination));
		} catch {
			throw new BlogRuleError(400, "validation", "destination が不正です");
		}
	}
	const status = url.searchParams.get("status")?.trim();
	if (status) {
		try {
			filters.push("status = ?");
			binds.push(parseBlogPostStatus(status));
		} catch {
			throw new BlogRuleError(400, "validation", "status が不正です");
		}
	}
	const slug = url.searchParams.get("slug")?.trim();
	if (slug) {
		filters.push("slug = ?");
		binds.push(slug);
	}
	const tag = url.searchParams.get("tag")?.trim();
	if (tag) {
		filters.push(
			`EXISTS (SELECT 1 FROM unnest(string_to_array(tags, ',')) AS part WHERE btrim(part) = ?)`,
		);
		binds.push(tag);
	}
	const paging = pageClause(page, "updated_at");
	const where = [...filters, paging.sql.replace(/^ AND /, "")].filter(Boolean);
	const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	const countRow = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM blog_posts ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""} ${
				page.updatedSince ? `${filters.length > 0 ? "AND" : "WHERE"} updated_at >= ?` : ""
			}`,
		)
		.bind(...binds, ...(page.updatedSince ? [page.updatedSince] : []))
		.first<{ count: number }>();
	const { results } = await db
		.prepare(
			`${BLOG_POST_SELECT} ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ?`,
		)
		.bind(...binds, ...paging.binds, page.limit)
		.all<BlogPost>();
	const posts = results ?? [];
	const last = posts[posts.length - 1];
	return {
		posts: posts.map(toApiPost),
		total: Number(countRow?.count ?? 0),
		next_cursor:
			posts.length === page.limit && last
				? encodeCursor(last.updated_at, last.id)
				: null,
	};
}

export async function countBlogPosts(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT destination, status, COUNT(*) AS count
			 FROM blog_posts
			 GROUP BY destination, status
			 ORDER BY destination, status`,
		)
		.all<{ destination: string; status: string; count: number }>();
	const rows = results ?? [];
	return {
		total: rows.reduce((sum, row) => sum + Number(row.count), 0),
		by: rows.map((row) => ({ ...row, count: Number(row.count) })),
	};
}

export async function getBlogPostBySlug(db: D1Database, slug: string) {
	const post = await db
		.prepare(`${BLOG_POST_SELECT} WHERE slug = ?`)
		.bind(slug)
		.first<BlogPost>();
	if (!post) throw new BlogRuleError(404, "not_found", "記事がありません");
	return { post: toApiPost(post) };
}

export async function putBlogPost(
	db: D1Database,
	slug: string,
	raw: unknown,
	actor: ApiActor,
	requestId: string,
) {
	const body = asRecord(raw);
	const title = asText(body.title);
	const text = asText(body.body);
	if (!title || !text) {
		throw new BlogRuleError(400, "validation", "title と body は必須です");
	}
	const payloadSlug = asText(body.slug);
	if (payloadSlug && payloadSlug !== slug) {
		throw new BlogRuleError(400, "slug_mismatch", "パスの slug と本文の slug が違います");
	}
	let destination: ReturnType<typeof parseBlogPostDestination> | undefined;
	if (asText(body.destination)) destination = parseBlogPostDestination(body.destination);
	const result = await upsertBlogPostFromIngest(db, {
		id: asText(body.id) || undefined,
		slug,
		title,
		excerpt: asText(body.excerpt),
		body: text,
		category: asText(body.category),
		tags: Array.isArray(body.tags) ? body.tags.map((item) => String(item)).join(", ") : asText(body.tags),
		thumbnail_url: asText(body.thumbnail_url),
		published_on: asText(body.published_on),
		destination,
		notes: asText(body.notes),
		source: asText(body.source) || actor.name,
	});
	const explicitOrigin = asText(body.thumbnail_origin);
	const explicitDate = asText(body.external_check_date);
	const explicitResult = asText(body.external_check_result);
	const explicitRewrite = asText(body.rewrite_mark);
	if (explicitOrigin || explicitDate || explicitResult || explicitRewrite) {
		await db
			.prepare(
				`UPDATE blog_posts
				 SET thumbnail_origin = CASE WHEN ? <> '' THEN ? ELSE thumbnail_origin END,
				     external_check_date = CASE WHEN ? <> '' THEN ? ELSE external_check_date END,
				     external_check_result = CASE WHEN ? <> '' THEN ? ELSE external_check_result END,
				     rewrite_mark = CASE WHEN ? <> '' THEN ? ELSE rewrite_mark END
				 WHERE id = ? AND status = 'draft'`,
			)
			.bind(
				explicitOrigin,
				explicitOrigin,
				explicitDate,
				explicitDate,
				explicitResult,
				explicitResult,
				explicitRewrite,
				explicitRewrite,
				result.id,
			)
			.run();
	}
	const saved = await getBlogPostFromDb(db, result.id);
	if (!saved) throw new BlogRuleError(500, "internal", "記事の保存に失敗しました");
	if (result.updated || saved.created_at === saved.updated_at) {
		await recordBlogAudit(db, {
			postId: saved.id,
			requestId,
			actor: actor.name,
			action: result.updated ? "upsert" : "insert",
			before: { slug, request_id: requestId },
		});
	}
	revalidateBlog();
	return { post: toApiPost(saved), updated: result.updated };
}

export async function patchBlogPostStatus(
	db: D1Database,
	slug: string,
	raw: unknown,
	actor: ApiActor,
	requestId: string,
	force: boolean,
) {
	const body = asRecord(raw);
	const post = await db
		.prepare(`${BLOG_POST_SELECT} WHERE slug = ?`)
		.bind(slug)
		.first<BlogPost>();
	if (!post) throw new BlogRuleError(404, "not_found", "記事がありません");
	let status: BlogPostStatus;
	try {
		status = parseBlogPostStatus(body.status);
	} catch {
		throw new BlogRuleError(400, "validation", "status が不正です");
	}
	const saved = await changeBlogPostStatus(db, {
		id: post.id,
		to: status,
		actor: {
			via: "api",
			role: actor.role,
			force: force || body.force === true || asText(body.force) === "true",
		},
		actorName: actor.name,
		requestId,
		publishedUrl: asText(body.published_url),
		publishedOn: asText(body.published_on),
		publishedAt: asText(body.published_at),
	});
	revalidateBlog();
	return { post: toApiPost(saved) };
}

export async function listBlogHistory(db: D1Database, slug: string, page: PageQuery) {
	const post = await db
		.prepare(`SELECT id FROM blog_posts WHERE slug = ?`)
		.bind(slug)
		.first<{ id: string }>();
	if (!post) throw new BlogRuleError(404, "not_found", "記事がありません");
	const countRow = await db
		.prepare(`SELECT COUNT(*) AS count FROM blog_post_audit WHERE blog_post_id = ?`)
		.bind(post.id)
		.first<{ count: number }>();
	const { results } = await db
		.prepare(
			`SELECT id, blog_post_id, request_id, actor, action, before_json, created_at
			 FROM blog_post_audit
			 WHERE blog_post_id = ?
			 ORDER BY created_at DESC, id DESC
			 LIMIT ?`,
		)
		.bind(post.id, page.limit)
		.all<{
			id: string;
			request_id: string;
			actor: string;
			action: string;
			before_json: string;
			created_at: string;
		}>();
	return {
		history: results ?? [],
		total: Number(countRow?.count ?? 0),
	};
}

export async function listPostComments(db: D1Database, slug: string, url: URL) {
	const post = await db
		.prepare(`SELECT id FROM blog_posts WHERE slug = ?`)
		.bind(slug)
		.first<{ id: string }>();
	if (!post) throw new BlogRuleError(404, "not_found", "記事がありません");
	const status = url.searchParams.get("status")?.trim();
	const filters = ["c.blog_post_id = ?"];
	const binds = [post.id];
	if (status === "open") {
		filters.push("c.status = 'open'");
	} else if (status === "resolved" || status === "done") {
		filters.push("c.status = 'done'");
	}
	const { results } = await db
		.prepare(
			`SELECT c.id, c.blog_post_id, c.employee_id, c.author_name, c.source, c.body, c.status,
			        c.created_at, c.target_body_hash, c.verdict, c.quote, c.reason, c.suggestion,
			        c.resolved_by, c.decision_status,
			        e.name AS employee_name, e.color AS employee_color, e.text_color AS employee_text_color
			 FROM blog_post_comments c
			 LEFT JOIN employees e ON e.id = c.employee_id
			 WHERE ${filters.join(" AND ")}
			 ORDER BY c.created_at ASC, c.id ASC`,
		)
		.bind(...binds)
		.all<BlogPostComment>();
	const comments = results ?? [];
	return { comments: comments.map(toApiComment), total: comments.length };
}

export async function createPostComment(
	db: D1Database,
	slug: string,
	raw: unknown,
	actor: ApiActor,
) {
	const body = asRecord(raw);
	const text = asText(body.body);
	if (!text) throw new BlogRuleError(400, "validation", "body は必須です");
	let comment;
	try {
		const postForComment = await db
			.prepare(`${BLOG_POST_SELECT} WHERE slug = ?`)
			.bind(slug)
			.first<BlogPost>();
		if (!postForComment) throw new BlogRuleError(404, "not_found", "記事がありません");
		comment = await insertBlogPostCommentFromIngest(db, {
			blog_post_id: postForComment.id,
			author_name: asText(body.author_name) || asText(body.author) || actor.name,
			source: asText(body.source) || actor.name,
			employee_id: asText(body.employee_id) || undefined,
			body: text,
		});
		const author = asText(body.author_name) || asText(body.author) || actor.name;
		const verdict = asText(body.verdict);
		let decision = asText(body.decision_status);
		if (!decision && (author.includes("ブランド") || text.includes("要判断"))) {
			decision = "needs_decision";
		}
		const target =
			asText(body.target_body_hash) || postForComment.body_hash || hashBody(postForComment.body ?? "");
		await db
			.prepare(
				`UPDATE blog_post_comments
				 SET target_body_hash = ?, verdict = ?, quote = ?, reason = ?, suggestion = ?,
				     decision_status = ?
				 WHERE id = ?`,
			)
			.bind(
				target,
				verdict,
				asText(body.quote),
				asText(body.reason),
				asText(body.suggestion),
				decision,
				comment.id,
			)
			.run();
	} catch (error) {
		if (error instanceof BlogRuleError) throw error;
		if (error instanceof Error && error.message === "published posts cannot be commented") {
			throw new BlogRuleError(403, "published_locked", "公開済みにはコメントできません");
		}
		throw error;
	}
	const saved = await getBlogPostCommentFromDb(db, comment.id);
	revalidateBlog();
	return { comment: saved ? toApiComment(saved) : toApiComment(comment) };
}

export async function patchComment(db: D1Database, id: string, raw: unknown, actor: ApiActor) {
	const body = asRecord(raw);
	const existing = await getBlogPostCommentFromDb(db, id);
	if (!existing) throw new BlogRuleError(404, "not_found", "コメントがありません");
	const requested = asText(body.status);
	const status = requested === "resolved" || requested === "done" ? "done" : existing.status;
	if (requested && requested !== "open" && requested !== "resolved" && requested !== "done") {
		throw new BlogRuleError(400, "validation", "status は open または resolved です");
	}
	const decision = asText(body.decision_status) || existing.decision_status || "";
	const resolvedBy =
		status === "done" ? asText(body.resolved_by) || actor.name : existing.resolved_by || "";
	await db
		.prepare(
			`UPDATE blog_post_comments
			 SET status = ?, resolved_by = ?, decision_status = ?
			 WHERE id = ?`,
		)
		.bind(status, resolvedBy, decision, id)
		.run();
	const saved = await getBlogPostCommentFromDb(db, id);
	if (!saved) throw new BlogRuleError(500, "internal", "コメントの保存に失敗しました");
	revalidateBlog();
	return { comment: toApiComment(saved) };
}

export async function reportIngest(db: D1Database, raw: unknown, actor: ApiActor) {
	const body = asRecord(raw);
	const accepted = Number(body.accepted ?? body.saved ?? 0);
	const reasons = Array.isArray(body.reasons) ? body.reasons.map((item) => String(item)) : [];
	if (!Number.isFinite(accepted)) {
		throw new BlogRuleError(400, "validation", "accepted は数値です");
	}
	if (accepted === 0) {
		await notifyOps(db, {
			kind: "ingest_zero",
			message: "取り込みが 0 件でした",
			detail: { actor: actor.name, reasons },
		});
	}
	revalidatePath("/board");
	return { ok: true, accepted, reasons };
}

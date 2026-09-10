import { newId } from "@/lib/db";
import {
	BLOG_POST_DESTINATION_DEFAULT,
	BLOG_POST_DESTINATION_OPTIONS,
	BLOG_POST_STATUS_OPTIONS,
	type BlogPost,
	type BlogPostDestination,
	type BlogPostStatus,
} from "@/lib/types";

export const BLOG_POST_SELECT = `SELECT
	id, slug, title, excerpt, body, category, tags, thumbnail_url, published_on,
	status, destination, notes, source, created_at, updated_at
 FROM blog_posts`;

export const BLOG_POST_ORDER = `ORDER BY
	CASE status
		WHEN 'draft' THEN 0
		WHEN 'rejected' THEN 1
		WHEN 'approved' THEN 2
		ELSE 3
	END,
	updated_at DESC`;

export type BlogDraftIngestInput = {
	id?: string;
	slug?: string;
	title: string;
	excerpt?: string;
	body?: string;
	category?: string;
	tags?: string;
	thumbnail_url?: string;
	published_on?: string;
	destination?: BlogPostDestination;
	notes?: string;
	source?: string;
};

export function parseBlogPostStatus(raw: unknown): BlogPostStatus {
	const value = String(raw ?? "").trim();
	if ((BLOG_POST_STATUS_OPTIONS as readonly string[]).includes(value)) {
		return value as BlogPostStatus;
	}
	throw new Error("ステータスが不正です");
}

export function parseBlogPostDestination(
	raw: unknown,
	options?: { fallback?: BlogPostDestination },
): BlogPostDestination {
	const value = String(raw ?? "").trim();
	if ((BLOG_POST_DESTINATION_OPTIONS as readonly string[]).includes(value)) {
		return value as BlogPostDestination;
	}
	if (options?.fallback && !value) {
		return options.fallback;
	}
	throw new Error("投稿先が不正です");
}

function withDestination(post: BlogPost): BlogPost {
	return {
		...post,
		destination: parseBlogPostDestination(post.destination, {
			fallback: BLOG_POST_DESTINATION_DEFAULT,
		}),
	};
}

export function formatBlogPostTags(tags: string): string[] {
	return [
		...new Set(
			tags
				.split(/[,、]/)
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	];
}

export function slugifyBlogSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

function normalizeTagsInput(raw: unknown): string {
	if (Array.isArray(raw)) {
		return formatBlogPostTags(raw.map((item) => String(item ?? "")).join(",")).join(", ");
	}
	if (typeof raw === "string") {
		return formatBlogPostTags(raw).join(", ");
	}
	return "";
}

function asOptionalString(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

export function parseBlogDraftIngest(
	raw: unknown,
): { ok: true; input: BlogDraftIngestInput } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "JSON object required" };
	}
	const obj = raw as Record<string, unknown>;
	const title = asOptionalString(obj.title);
	if (!title) {
		return { ok: false, error: "title is required" };
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
			id: asOptionalString(obj.id) || undefined,
			slug: asOptionalString(obj.slug) || undefined,
			title,
			excerpt: asOptionalString(obj.excerpt),
			body: asOptionalString(obj.body),
			category: asOptionalString(obj.category),
			tags: normalizeTagsInput(obj.tags),
			thumbnail_url: asOptionalString(obj.thumbnail_url),
			published_on: asOptionalString(obj.published_on),
			destination,
			notes: asOptionalString(obj.notes),
			source: asOptionalString(obj.source) || "grokbot",
		},
	};
}

async function allocateUniqueSlug(
	db: D1Database,
	desired: string,
	excludeId?: string,
): Promise<string> {
	const base = slugifyBlogSlug(desired) || `blog-${crypto.randomUUID().slice(0, 8)}`;
	for (let attempt = 0; attempt < 20; attempt++) {
		const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
		const existing = await db
			.prepare("SELECT id FROM blog_posts WHERE slug = ?")
			.bind(candidate)
			.first<{ id: string }>();
		if (!existing || existing.id === excludeId) {
			return candidate;
		}
	}
	return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function listBlogPostsFromDb(
	db: D1Database,
	status?: BlogPostStatus,
	destination?: BlogPostDestination,
): Promise<BlogPost[]> {
	const filters: string[] = [];
	const binds: string[] = [];
	if (status) {
		filters.push("status = ?");
		binds.push(status);
	}
	if (destination) {
		filters.push("destination = ?");
		binds.push(destination);
	}
	const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
	const sql = `${BLOG_POST_SELECT} ${where} ${BLOG_POST_ORDER}`;
	const stmt = binds.length > 0 ? db.prepare(sql).bind(...binds) : db.prepare(sql);
	const { results } = await stmt.all<BlogPost>();
	return (results ?? []).map(withDestination);
}

export async function upsertBlogPostFromIngest(
	db: D1Database,
	input: BlogDraftIngestInput,
): Promise<{ id: string; slug: string; updated: boolean }> {
	const excerpt = input.excerpt ?? "";
	const body = input.body ?? "";
	const category = input.category ?? "";
	const tags = input.tags ?? "";
	const thumbnailUrl = input.thumbnail_url ?? "";
	const publishedOn = input.published_on ?? "";
	const notes = input.notes ?? "";
	const source = input.source ?? "grokbot";

	let existing: BlogPost | null = null;
	if (input.id) {
		existing =
			(await db
				.prepare(`${BLOG_POST_SELECT} WHERE id = ?`)
				.bind(input.id)
				.first<BlogPost>()) ?? null;
		if (!existing) {
			throw new Error("blog post not found");
		}
	}

	const destination =
		input.destination ??
		(existing
			? parseBlogPostDestination(existing.destination, {
					fallback: BLOG_POST_DESTINATION_DEFAULT,
				})
			: BLOG_POST_DESTINATION_DEFAULT);

	if (!existing && input.slug) {
		const slug = slugifyBlogSlug(input.slug);
		if (slug) {
			existing =
				(await db
					.prepare(`${BLOG_POST_SELECT} WHERE slug = ? AND destination = ?`)
					.bind(slug, destination)
					.first<BlogPost>()) ?? null;
		}
	}

	if (existing) {
		const slug = await allocateUniqueSlug(
			db,
			input.slug || existing.slug,
			existing.id,
		);
		await db
			.prepare(
				`UPDATE blog_posts
				 SET slug = ?, title = ?, excerpt = ?, body = ?, category = ?, tags = ?,
				     thumbnail_url = ?, published_on = ?, status = 'draft', destination = ?,
				     notes = ?, source = ?, updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(
				slug,
				input.title,
				excerpt,
				body,
				category,
				tags,
				thumbnailUrl,
				publishedOn,
				destination,
				notes,
				source,
				existing.id,
			)
			.run();
		return { id: existing.id, slug, updated: true };
	}

	const id = newId("blog");
	const slug = await allocateUniqueSlug(db, input.slug || input.title);
	await db
		.prepare(
			`INSERT INTO blog_posts
				(id, slug, title, excerpt, body, category, tags, thumbnail_url, published_on, status, destination, notes, source)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
		)
		.bind(
			id,
			slug,
			input.title,
			excerpt,
			body,
			category,
			tags,
			thumbnailUrl,
			publishedOn,
			destination,
			notes,
			source,
		)
		.run();
	return { id, slug, updated: false };
}

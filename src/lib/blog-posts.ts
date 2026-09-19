import { mediaUrl } from "@/lib/media-upload";
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
	id, slug, title, excerpt, body, category, tags, thumbnail_url, thumbnail_key, figure_keys,
	published_on, status, destination, notes, source, created_at, updated_at
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

export type BlogFigure = {
	key: string;
	name: string;
};

export const BLOG_FIGURE_MAX = 12;

export function parseBlogFigures(raw: string | null | undefined): BlogFigure[] {
	if (!raw?.trim()) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		const figures: BlogFigure[] = [];
		for (const item of parsed) {
			if (!item || typeof item !== "object") continue;
			const record = item as Record<string, unknown>;
			const key = typeof record.key === "string" ? record.key.trim() : "";
			if (!key.startsWith("blog-posts/") || key.includes("..")) continue;
			const name =
				typeof record.name === "string" && record.name.trim()
					? record.name.trim()
					: key.split("/").pop() || "image.webp";
			figures.push({ key, name });
			if (figures.length >= BLOG_FIGURE_MAX) break;
		}
		return figures;
	} catch {
		return [];
	}
}

export function serializeBlogFigures(figures: BlogFigure[]): string {
	return JSON.stringify(
		figures.slice(0, BLOG_FIGURE_MAX).map((figure) => ({
			key: figure.key,
			name: figure.name,
		})),
	);
}

export function blogHeroSrc(
	post: Pick<BlogPost, "thumbnail_key" | "thumbnail_url">,
): string | null {
	if (post.thumbnail_key.trim()) return mediaUrl(post.thumbnail_key.trim());
	const url = post.thumbnail_url.trim();
	return url || null;
}

export type BlogPlannedImage = {
	src: string;
	alt: string;
	title: string;
};

/** 公開時に使う TOP 画像と図表・グラフ */
export function listBlogPlannedImages(
	post: Pick<BlogPost, "title" | "thumbnail_key" | "thumbnail_url" | "figure_keys">,
): BlogPlannedImage[] {
	const images: BlogPlannedImage[] = [];
	const seen = new Set<string>();
	const heroSrc = blogHeroSrc(post);
	if (heroSrc) {
		seen.add(heroSrc);
		images.push({
			src: heroSrc,
			alt: `${post.title} の TOP画像`,
			title: "TOP画像を開く",
		});
	}
	for (const figure of parseBlogFigures(post.figure_keys)) {
		const src = mediaUrl(figure.key);
		if (seen.has(src)) continue;
		seen.add(src);
		images.push({
			src,
			alt: figure.name,
			title: figure.name,
		});
	}
	return images;
}

function withDestination(post: BlogPost): BlogPost {
	return {
		...post,
		destination: parseBlogPostDestination(post.destination, {
			fallback: BLOG_POST_DESTINATION_DEFAULT,
		}),
		thumbnail_key: post.thumbnail_key ?? "",
		figure_keys: post.figure_keys?.trim() ? post.figure_keys : "[]",
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

export async function getBlogPostFromDb(
	db: D1Database,
	id: string,
): Promise<BlogPost | null> {
	const row = await db
		.prepare(`${BLOG_POST_SELECT} WHERE id = ?`)
		.bind(id)
		.first<BlogPost>();
	return row ? withDestination(row) : null;
}

function nowSqlUtc(): string {
	return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export async function upsertBlogPostFromSheet(
	db: D1Database,
	input: Omit<BlogPost, "destination">,
	destination: BlogPostDestination,
): Promise<BlogPost> {
	const slug = await allocateUniqueSlug(db, input.slug || input.title, input.id);
	const createdAt = input.created_at.trim() || input.updated_at.trim() || nowSqlUtc();
	const updatedAt = input.updated_at.trim() || createdAt;
	const excerpt = input.excerpt ?? "";
	const body = input.body ?? "";
	const category = input.category ?? "";
	const tags = input.tags ?? "";
	const thumbnailUrl = input.thumbnail_url ?? "";
	const publishedOn = input.published_on ?? "";
	const notes = input.notes ?? "";
	const source = input.source ?? "";
	const status = parseBlogPostStatus(input.status);

	const existing = await getBlogPostFromDb(db, input.id);
	if (existing) {
		await db
			.prepare(
				`UPDATE blog_posts
				 SET slug = ?, title = ?, excerpt = ?, body = ?, category = ?, tags = ?,
				     thumbnail_url = ?, published_on = ?, status = ?, destination = ?,
				     notes = ?, source = ?, created_at = ?, updated_at = ?
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
				status,
				destination,
				notes,
				source,
				createdAt,
				updatedAt,
				input.id,
			)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO blog_posts
					(id, slug, title, excerpt, body, category, tags, thumbnail_url, published_on,
					 status, destination, notes, source, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				input.id,
				slug,
				input.title,
				excerpt,
				body,
				category,
				tags,
				thumbnailUrl,
				publishedOn,
				status,
				destination,
				notes,
				source,
				createdAt,
				updatedAt,
			)
			.run();
	}

	const saved = await getBlogPostFromDb(db, input.id);
	if (!saved) {
		throw new Error("シートからの下書き保存に失敗しました");
	}
	return saved;
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

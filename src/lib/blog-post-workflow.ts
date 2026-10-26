import { newId } from "@/lib/ids";
import { notifyOps } from "@/lib/ops-alerts";
import {
	assertStatusTransition,
	checksEnabled,
	hashBody,
	inspectBlogContent,
	publishGateEnabled,
	type TransitionActor,
} from "@/lib/blog-post-rules";
import { getBlogPostFromDb } from "@/lib/blog-posts";
import type { BlogPost, BlogPostStatus } from "@/lib/types";

async function categorySet(db: D1Database): Promise<Set<string>> {
	const { results } = await db
		.prepare(`SELECT name FROM blog_site_categories`)
		.all<{ name: string }>();
	return new Set((results ?? []).map((row) => row.name));
}

async function openCommentCount(db: D1Database, postId: string): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM blog_post_comments
			 WHERE blog_post_id = ? AND status = 'open'`,
		)
		.bind(postId)
		.first<{ count: number }>();
	return Number(row?.count ?? 0);
}

async function urlOk(url: string): Promise<boolean> {
	try {
		let response = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
			signal: AbortSignal.timeout(8000),
		});
		if (response.status === 405 || response.status === 501) {
			response = await fetch(url, {
				method: "GET",
				redirect: "follow",
				signal: AbortSignal.timeout(8000),
			});
		}
		return response.ok;
	} catch {
		return false;
	}
}

async function ogpOk(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) return false;
		const text = (await response.text()).slice(0, 200_000);
		return text.includes("og:title") || text.includes("og:image");
	} catch {
		return false;
	}
}

export async function recordBlogAudit(
	db: D1Database,
	input: {
		postId: string;
		requestId: string;
		actor: string;
		action: string;
		before: unknown;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO blog_post_audit
				(id, blog_post_id, request_id, actor, action, before_json)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			newId("audit"),
			input.postId,
			input.requestId,
			input.actor,
			input.action,
			JSON.stringify(input.before ?? {}),
		)
		.run();
}

async function assertPublishReviews(
	db: D1Database,
	post: BlogPost,
	bodyHash: string,
): Promise<void> {
	if (!publishGateEnabled()) return;
	const { results } = await db
		.prepare(
			`SELECT author_name, verdict, target_body_hash, decision_status, status
			 FROM blog_post_comments
			 WHERE blog_post_id = ?`,
		)
		.bind(post.id)
		.all<{
			author_name: string;
			verdict: string;
			target_body_hash: string;
			decision_status: string;
			status: string;
		}>();
	const comments = results ?? [];
	const fresh = (row: { target_body_hash: string }) =>
		!row.target_body_hash || row.target_body_hash === bodyHash;
	const okVerdict = (value: string) =>
		["ok", "approved", "承認", "合格"].includes(value.trim().toLowerCase()) ||
		value.trim() === "承認" ||
		value.trim() === "合格";
	const brand = comments.some(
		(row) => row.author_name.includes("ブランド") && okVerdict(row.verdict) && fresh(row),
	);
	const checked = comments.some(
		(row) => row.author_name.includes("記事チェック") && okVerdict(row.verdict) && fresh(row),
	);
	const pending = comments.some((row) => row.decision_status === "needs_decision");
	if (!brand || !checked || pending) {
		const { BlogRuleError } = await import("@/lib/blog-post-rules");
		throw new BlogRuleError(403, "publish_gate", "公開前の審査が揃っていません", {
			brand,
			article_check: checked,
			needs_decision: pending,
		});
	}
}

export async function changeBlogPostStatus(
	db: D1Database,
	input: {
		id: string;
		to: BlogPostStatus;
		actor: TransitionActor;
		actorName: string;
		requestId: string;
		publishedUrl?: string;
		publishedOn?: string;
		publishedAt?: string;
	},
): Promise<BlogPost> {
	const { BlogRuleError } = await import("@/lib/blog-post-rules");
	const existing = await getBlogPostFromDb(db, input.id);
	if (!existing) {
		throw new BlogRuleError(404, "not_found", "記事がありません");
	}
	assertStatusTransition(existing.status, input.to, input.actor);
	const bodyHash = existing.body_hash || hashBody(existing.body ?? "");
	const skipChecks = input.actor.via === "api" && input.actor.role === "admin" && input.actor.force;

	if ((input.to === "approved" || input.to === "published") && !skipChecks) {
		if (checksEnabled()) {
			const issues = inspectBlogContent({
				title: existing.title,
				slug: existing.slug,
				body: existing.body ?? "",
				category: existing.category,
				categories: await categorySet(db),
			});
			if (issues.length > 0) {
				await notifyOps(db, {
					kind: "content_check",
					message: `自動チェックで止まりました: ${existing.slug}`,
					detail: { issues },
				});
				throw new BlogRuleError(422, "content_check", "承認前の自動チェックで止まりました", {
					issues,
				});
			}
		}
		const open = await openCommentCount(db, existing.id);
		if (open > 0) {
			throw new BlogRuleError(403, "open_comments", "未解決のコメントが残っています", {
				open,
			});
		}
	}

	if (input.to === "published" && !skipChecks) {
		await assertPublishReviews(db, existing, bodyHash);
		if (input.actor.via === "api" && !input.publishedUrl?.trim()) {
			throw new BlogRuleError(400, "published_url_required", "公開 URL が必要です");
		}
		const categories = await categorySet(db);
		const thumbnailOk = existing.thumbnail_url
			? await urlOk(existing.thumbnail_url)
			: Boolean(existing.thumbnail_key);
		const publishedUrl = input.publishedUrl?.trim() || existing.published_url;
		const ogp = publishedUrl ? await ogpOk(publishedUrl) : false;
		const categoryOk = Boolean(existing.category) && categories.has(existing.category);
		await db
			.prepare(
				`INSERT INTO blog_post_release_checks
					(id, blog_post_id, thumbnail_ok, ogp_ok, category_ok, detail_json)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				newId("check"),
				existing.id,
				thumbnailOk ? 1 : 0,
				ogp ? 1 : 0,
				categoryOk ? 1 : 0,
				JSON.stringify({ thumbnail_url: existing.thumbnail_url, published_url: publishedUrl }),
			)
			.run();
		if (input.actor.via === "api" && (!thumbnailOk || !ogp || !categoryOk)) {
			await notifyOps(db, {
				kind: "release_check",
				message: `公開前確認で止まりました: ${existing.slug}`,
				detail: { thumbnailOk, ogp, categoryOk },
			});
			throw new BlogRuleError(422, "release_check", "公開前確認で止まりました", {
				thumbnail_ok: thumbnailOk,
				ogp_ok: ogp,
				category_ok: categoryOk,
			});
		}
	}

	if (existing.status === "published" && input.to !== "published") {
		await notifyOps(db, {
			kind: "published_revert",
			message: `公開済みの差し戻し: ${existing.slug}`,
			detail: { to: input.to, actor: input.actorName },
		});
	}

	const publishedAt =
		input.to === "published"
			? input.publishedAt?.trim() ||
				existing.published_at ||
				new Date().toISOString().replace("T", " ").slice(0, 19)
			: existing.published_at || "";
	const publishedOn =
		input.to === "published"
			? input.publishedOn?.trim() || existing.published_on || publishedAt.slice(0, 10)
			: existing.published_on;
	const publishedUrl =
		input.to === "published"
			? input.publishedUrl?.trim() || existing.published_url || ""
			: existing.published_url || "";

	await recordBlogAudit(db, {
		postId: existing.id,
		requestId: input.requestId,
		actor: input.actorName,
		action: `status:${existing.status}->${input.to}`,
		before: existing,
	});
	await db
		.prepare(
			`UPDATE blog_posts
			 SET status = ?, published_on = ?, published_at = ?, published_url = ?,
			     body_hash = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(input.to, publishedOn, publishedAt, publishedUrl, bodyHash, existing.id)
		.run();

	const saved = await getBlogPostFromDb(db, existing.id);
	if (!saved) throw new BlogRuleError(500, "internal", "記事の保存に失敗しました");
	return saved;
}

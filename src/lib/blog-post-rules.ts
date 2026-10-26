import { createHash } from "node:crypto";
import type { BlogPostStatus } from "@/lib/types";

export const API_ROLES = ["reader", "reviewer", "writer", "publisher", "admin"] as const;
export type ApiRole = (typeof API_ROLES)[number];

export class BlogRuleError extends Error {
	constructor(
		public httpStatus: number,
		public code: string,
		message: string,
		public detail: Record<string, unknown> = {},
	) {
		super(message);
		this.name = "BlogRuleError";
	}
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SOURCE_WORD = /出典|調査|統計|によると|公表|資料|白書/;
const NUMBER_WORD = /\d+(?:\.\d+)?\s*(?:%|％|円|人|件|社|倍)/;
const ALLOWED_LINK_HOSTS = new Set(["studiofoods.net", "www.studiofoods.net"]);

export type ContentIssue = {
	code: string;
	message: string;
	excerpt: string;
};

export function hashBody(body: string): string {
	return createHash("sha256").update(body, "utf8").digest("hex");
}

export function assertEnglishSlug(slug: string): void {
	if (!SLUG_PATTERN.test(slug)) {
		throw new BlogRuleError(
			400,
			"invalid_slug",
			"slug は英語の小文字とハイフン区切りです",
			{ slug },
		);
	}
}

export function extractNoteFields(notes: string, source: string): {
	external_check_date: string;
	external_check_result: string;
	rewrite_mark: string;
} {
	const match = notes.match(/外部チェック\s*(\d{4}-\d{2}-\d{2})/);
	let result = "";
	if (match) {
		const start = notes.indexOf(match[0]) + match[0].length;
		result = notes
			.slice(start)
			.trim()
			.split("\n")[0]
			.replace(/^[:：\s]+/, "")
			.slice(0, 500);
	}
	let rewrite = "";
	if (notes.includes("最終構成") || source.includes("最終構成")) rewrite = "最終構成";
	else if (notes.includes("広報") || source.includes("広報")) rewrite = "広報";
	return {
		external_check_date: match?.[1] ?? "",
		external_check_result: result,
		rewrite_mark: rewrite,
	};
}

export function inferThumbnailOrigin(url: string, explicit: string): string {
	if (explicit === "r2" || explicit === "blog_image_api") return explicit;
	const value = url.toLowerCase();
	if (value.includes("r2.dev") || value.includes("r2.cloudflarestorage.com")) return "r2";
	if (
		value.includes("mieru-storage") ||
		value.includes("/blog_images") ||
		value.includes("/download/")
	) {
		return "blog_image_api";
	}
	return "";
}

function linkAllowed(raw: string): boolean {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return false;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return false;
	if (!ALLOWED_LINK_HOSTS.has(url.hostname)) return false;
	const path = url.pathname;
	return (
		path === "/contact" ||
		path.startsWith("/contact/") ||
		path === "/blog" ||
		path.startsWith("/blog/") ||
		path === "/services" ||
		path.startsWith("/services/")
	);
}

export function inspectBlogContent(input: {
	title: string;
	slug: string;
	body: string;
	category: string;
	categories: ReadonlySet<string>;
}): ContentIssue[] {
	const issues: ContentIssue[] = [];
	if (input.title.includes("file://") || input.body.includes("file://")) {
		issues.push({
			code: "file_url",
			message: "file:// が含まれています",
			excerpt: input.title.includes("file://") ? input.title : "本文",
		});
	}
	if (input.title.includes("【") || input.title.includes("】")) {
		issues.push({
			code: "bracket_title",
			message: "タイトルに【】があります",
			excerpt: input.title.slice(0, 120),
		});
	}
	if (!SLUG_PATTERN.test(input.slug)) {
		issues.push({
			code: "invalid_slug",
			message: "slug が英語の小文字とハイフン区切りではありません",
			excerpt: input.slug,
		});
	}
	if (!input.category || !input.categories.has(input.category)) {
		issues.push({
			code: "unknown_category",
			message: "サイトにないカテゴリです",
			excerpt: input.category,
		});
	}

	const paragraphs = input.body.split(/\n{2,}/);
	for (const paragraph of paragraphs) {
		if (!NUMBER_WORD.test(paragraph) || SOURCE_WORD.test(paragraph)) continue;
		const found = paragraph.match(NUMBER_WORD);
		issues.push({
			code: "unsourced_number",
			message: "出典のない数字があります",
			excerpt: (found?.[0] ?? paragraph).slice(0, 80),
		});
		break;
	}

	const links = input.body.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
	for (const link of links) {
		const cleaned = link.replace(/[.,。、]+$/, "");
		if (linkAllowed(cleaned)) continue;
		issues.push({
			code: "disallowed_link",
			message: "許可していないリンクがあります",
			excerpt: cleaned.slice(0, 160),
		});
		break;
	}
	return issues;
}

export type TransitionActor = {
	via: "api" | "screen";
	role: ApiRole | "screen";
	force: boolean;
};

export function assertStatusTransition(
	from: BlogPostStatus,
	to: BlogPostStatus,
	actor: TransitionActor,
): void {
	if (from === to) return;
	const adminApi = actor.via === "api" && actor.role === "admin";
	const publisher =
		actor.via === "screen" ||
		actor.role === "publisher" ||
		actor.role === "admin";
	const screenOrAdmin = actor.via === "screen" || adminApi;

	const allowed =
		(from === "draft" && (to === "approved" || to === "rejected") && publisher) ||
		(from === "approved" && to === "published" && publisher) ||
		(from === "approved" && to === "rejected" && publisher) ||
		(from === "approved" && to === "draft" && screenOrAdmin) ||
		(from === "published" &&
			(to === "approved" || to === "draft") &&
			(actor.via === "screen" || (adminApi && actor.force))) ||
		(from === "rejected" && to === "draft" && (actor.via === "screen" || (adminApi && actor.force)));

	if (allowed) return;
	throw new BlogRuleError(403, "invalid_transition", "この状態遷移はできません", {
		from,
		to,
	});
}

export function checksEnabled(): boolean {
	return process.env.BLOG_PREAPPROVE_CHECKS?.trim() !== "0";
}

export function publishGateEnabled(): boolean {
	return process.env.BLOG_PUBLISH_GATE?.trim() === "1";
}

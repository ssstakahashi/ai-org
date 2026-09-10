/**
 * @automation
 * id: grokbot-studiofoods-blog-draft
 * name: スタジオフーズ公式ブログ下書き（月水金）
 * runner: cursor
 * status: active
 * trigger: Grok Bot ルーチン（毎週 月・水・金 9:00 JST）
 * summary: テーマを5本一巡で選び、下書きを ai-org へ投入する。公開前に /blog-drafts で確認・承認する。
 * location: Grok Bot ルーチン「ブログ下書き（月水金）」 → POST /api/internal/blog-drafts
 * href: /blog-drafts
 */
import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import {
	listBlogPostsFromDb,
	parseBlogDraftIngest,
	parseBlogPostDestination,
	parseBlogPostStatus,
	upsertBlogPostFromIngest,
} from "@/lib/blog-posts";
import {
	BLOG_POST_DESTINATION_OPTIONS,
	BLOG_POST_STATUS_OPTIONS,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function authResponse(request: NextRequest, secret: string | undefined) {
	return verifyIngestSecret(
		request.headers.get("x-automation-ingest-secret"),
		request.headers.get("authorization"),
		secret,
	);
}

export async function GET(request: NextRequest) {
	const { env } = await getCloudflareContext({ async: true });
	const auth = authResponse(request, env.AUTOMATION_INGEST_SECRET);
	if (auth === "missing_config") {
		return NextResponse.json(
			{ error: "Server misconfiguration: set AUTOMATION_INGEST_SECRET" },
			{ status: 503 },
		);
	}
	if (auth === "unauthorized") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const statusParam = request.nextUrl.searchParams.get("status")?.trim();
	let status: ReturnType<typeof parseBlogPostStatus> | undefined;
	if (statusParam) {
		try {
			status = parseBlogPostStatus(statusParam);
		} catch {
			return NextResponse.json(
				{ error: `Invalid status. Use: ${BLOG_POST_STATUS_OPTIONS.join(", ")}` },
				{ status: 400 },
			);
		}
	}

	const destinationParam = request.nextUrl.searchParams.get("destination")?.trim();
	let destination: ReturnType<typeof parseBlogPostDestination> | undefined;
	if (destinationParam) {
		try {
			destination = parseBlogPostDestination(destinationParam);
		} catch {
			return NextResponse.json(
				{ error: `Invalid destination. Use: ${BLOG_POST_DESTINATION_OPTIONS.join(", ")}` },
				{ status: 400 },
			);
		}
	}

	try {
		const posts = await listBlogPostsFromDb(env.DB, status, destination);
		return NextResponse.json({ ok: true, posts });
	} catch (error) {
		console.error("blog-drafts list failed", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const { env } = await getCloudflareContext({ async: true });
	const auth = authResponse(request, env.AUTOMATION_INGEST_SECRET);
	if (auth === "missing_config") {
		return NextResponse.json(
			{ error: "Server misconfiguration: set AUTOMATION_INGEST_SECRET" },
			{ status: 503 },
		);
	}
	if (auth === "unauthorized") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = parseBlogDraftIngest(raw);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	try {
		const result = await upsertBlogPostFromIngest(env.DB, parsed.input);
		revalidatePath("/blog-drafts");
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		console.error("blog-drafts ingest failed", error);
		const message = error instanceof Error ? error.message : "Internal Server Error";
		const status = message === "blog post not found" ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

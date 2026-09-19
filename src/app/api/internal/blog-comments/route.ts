/**
 * @automation
 * id: blog-draft-ai-comments
 * name: ブログ下書きへのAIコメント
 * runner: cursor
 * status: active
 * trigger: 公開済以外の下書きに対する AI からの投入
 * summary: 未公開のブログ下書きに、複数のAIが複数コメントを投入する。確認は /blog-drafts。
 * location: POST /api/internal/blog-comments → /blog-drafts
 * href: /blog-drafts
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import {
	insertBlogPostCommentFromIngest,
	listBlogPostCommentsFromDb,
	parseBlogPostCommentIngest,
} from "@/lib/blog-post-comments";

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

	const postId = request.nextUrl.searchParams.get("blog_post_id")?.trim();
	try {
		const comments = await listBlogPostCommentsFromDb(
			env.DB,
			postId ? [postId] : undefined,
		);
		return NextResponse.json({ ok: true, comments });
	} catch (error) {
		console.error("blog-comments list failed", error);
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

	const parsed = parseBlogPostCommentIngest(raw);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	try {
		const comment = await insertBlogPostCommentFromIngest(env.DB, parsed.input);
		revalidatePath("/blog-drafts");
		return NextResponse.json({ ok: true, comment });
	} catch (error) {
		console.error("blog-comments ingest failed", error);
		const message = error instanceof Error ? error.message : "Internal Server Error";
		const status =
			message === "blog post not found" || message === "employee not found"
				? 404
				: message === "published posts cannot be commented"
					? 409
					: message === "slug is ambiguous; specify destination"
						? 400
						: 500;
		return NextResponse.json({ error: message }, { status });
	}
}

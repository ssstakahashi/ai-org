/**
 * @automation
 * id: x-schedule-ai-comments
 * name: X投稿へのAIコメント
 * runner: cursor
 * status: active
 * trigger: 投稿済以外の X 投稿に対する AI からの投入
 * summary: X投稿に、複数のAIが複数コメントを投入する。確認は /x-schedule。対応状況は未対応／対応済。
 * location: POST /api/internal/x-comments → /x-schedule
 * href: /x-schedule
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import {
	insertXPostCommentFromIngest,
	listXPostCommentsFromDb,
	parseXPostCommentIngest,
} from "@/lib/x-post-comments";

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

	const postId =
		request.nextUrl.searchParams.get("x_post_id")?.trim() ||
		request.nextUrl.searchParams.get("post_id")?.trim();
	try {
		const comments = await listXPostCommentsFromDb(
			env.DB,
			postId ? [postId] : undefined,
		);
		return NextResponse.json({ ok: true, comments });
	} catch (error) {
		console.error("x-comments list failed", error);
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

	const parsed = parseXPostCommentIngest(raw);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	try {
		const comment = await insertXPostCommentFromIngest(env.DB, parsed.input);
		revalidatePath("/x-schedule");
		return NextResponse.json({ ok: true, comment });
	} catch (error) {
		console.error("x-comments ingest failed", error);
		const message = error instanceof Error ? error.message : "Internal Server Error";
		const status =
			message === "x post not found" || message === "employee not found"
				? 404
				: message === "posted posts cannot be commented"
					? 409
					: message === "title is ambiguous; specify x_post_id" ||
						  message === "title is ambiguous; specify destination or x_post_id"
						? 400
						: 500;
		return NextResponse.json({ error: message }, { status });
	}
}

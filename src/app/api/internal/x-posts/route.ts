import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import { groupXPostComments, listXPostCommentsFromDb } from "@/lib/x-post-comments";
import {
	listXPostsFromDb,
	parseXPostDestination,
	parseXPostStatus,
} from "@/lib/x-posts";
import { X_POST_DESTINATION_OPTIONS, X_POST_STATUS_OPTIONS } from "@/lib/types";

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
	let status: ReturnType<typeof parseXPostStatus> | undefined;
	if (statusParam) {
		try {
			status = parseXPostStatus(statusParam);
		} catch {
			return NextResponse.json(
				{ error: `Invalid status. Use: ${X_POST_STATUS_OPTIONS.join(", ")}` },
				{ status: 400 },
			);
		}
	}

	const destinationParam = request.nextUrl.searchParams.get("destination")?.trim();
	let destination: ReturnType<typeof parseXPostDestination> | undefined;
	if (destinationParam) {
		try {
			destination = parseXPostDestination(destinationParam);
		} catch {
			return NextResponse.json(
				{ error: `Invalid destination. Use: ${X_POST_DESTINATION_OPTIONS.join(", ")}` },
				{ status: 400 },
			);
		}
	}

	try {
		const posts = await listXPostsFromDb(env.DB, status, destination);
		const comments = await listXPostCommentsFromDb(
			env.DB,
			posts.map((post) => post.id),
		);
		const commentsByPostId = groupXPostComments(comments);
		return NextResponse.json({
			ok: true,
			posts: posts.map((post) => ({
				...post,
				comments: commentsByPostId[post.id] ?? [],
			})),
		});
	} catch (error) {
		console.error("x-posts list failed", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

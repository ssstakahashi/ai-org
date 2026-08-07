import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { applyIngest, parseIngestBody, verifyIngestSecret } from "@/lib/automation-ingest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	const { env } = await getCloudflareContext({ async: true });
	const auth = verifyIngestSecret(
		request.headers.get("x-automation-ingest-secret"),
		request.headers.get("authorization"),
		env.AUTOMATION_INGEST_SECRET,
	);
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

	const parsed = parseIngestBody(raw);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	try {
		await applyIngest(env.DB, parsed.body);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("automation-ingest failed", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

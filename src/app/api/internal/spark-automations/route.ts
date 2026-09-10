import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import { listSparkAutomations } from "@/lib/spark-automations";
import { pullSparkAutomationsFromSheet } from "@/lib/spark-sheet-sync";

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

	try {
		const automations = await listSparkAutomations(env.DB);
		return NextResponse.json({ ok: true, source: "spark", automations });
	} catch (error) {
		console.error("spark-automations list failed", error);
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

	try {
		const result = await pullSparkAutomationsFromSheet(env);
		revalidatePath("/automations");
		return NextResponse.json({
			ok: true,
			source: "spark",
			count: result.count,
			automations: result.automations,
		});
	} catch (error) {
		console.error("spark-automations pull failed", error);
		const message = error instanceof Error ? error.message : "Internal Server Error";
		const status = message.includes("未設定") ? 503 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

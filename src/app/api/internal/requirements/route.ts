/**
 * @automation
 * id: app-requirements-cursor
 * name: App 要件定義の自動実装
 * runner: cursor
 * status: none
 * trigger: 手動 / スケジュール（Cursor Automations で設定）
 * summary: export API から承認済み要件を取得し、dev_folder のリポで実装する
 * location: src/app/api/internal/requirements/route.ts
 * href: /apps/requirements
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { verifyIngestSecret } from "@/lib/automation-ingest";
import {
	buildRequirementsExport,
	resolveAppNameIdByName,
	parseExportStatus,
} from "@/lib/requirements-export";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

	const params = request.nextUrl.searchParams;
	const all = params.get("all") === "1";
	const appNameId = params.get("app_name_id")?.trim() || undefined;
	const appName = params.get("app")?.trim() || undefined;
	const statusParam = parseExportStatus(params.get("status"));
	if (params.get("status") && !statusParam) {
		return NextResponse.json({ error: "Invalid status" }, { status: 400 });
	}

	if (!all && !appNameId && !appName) {
		return NextResponse.json(
			{ error: "Specify app_name_id, app, or all=1" },
			{ status: 400 },
		);
	}

	let resolvedAppNameId = appNameId;
	if (!resolvedAppNameId && appName && !all) {
		const resolved = await resolveAppNameIdByName(env.DB, appName);
		if (!resolved) {
			return NextResponse.json({ error: "App not found" }, { status: 404 });
		}
		resolvedAppNameId = resolved;
	}

	try {
		const markdown = await buildRequirementsExport(env.DB, {
			appNameId: resolvedAppNameId,
			all,
			status: statusParam ?? "approved",
		});
		return new NextResponse(markdown, {
			status: 200,
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
			},
		});
	} catch (error) {
		console.error("requirements export failed", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

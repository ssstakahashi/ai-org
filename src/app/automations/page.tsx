import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listAppCrons } from "@/app/actions";
import { AppCronsSheet } from "@/components/AppCronsSheet";
import { AppHeader } from "@/components/AppHeader";
import { AutomationCatalog } from "@/components/AutomationCatalog";
import { SparkAutomationsSheet } from "@/components/SparkAutomationsSheet";
import { buildCatalog } from "@/lib/automation-ingest";
import { localAutomationsWithSource } from "@/lib/automations";
import { getDb } from "@/lib/db";
import { listSparkAutomations, type SparkAutomation } from "@/lib/spark-automations";
import { pullSparkAutomationsFromSheet } from "@/lib/spark-sheet-sync";
import { isSheetsSyncConfigured } from "@/lib/x-post-sheets-sync";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
	const { env } = await getCloudflareContext({ async: true });
	const db = await getDb();

	let sparkSyncError: string | null = null;
	try {
		if (isSheetsSyncConfigured(env)) {
			await pullSparkAutomationsFromSheet(env);
		}
	} catch (error) {
		console.error("spark sheet pull failed", error);
		sparkSyncError = error instanceof Error ? error.message : String(error);
	}

	let sparkItems: SparkAutomation[] = [];
	try {
		sparkItems = await listSparkAutomations(db);
	} catch (error) {
		console.error("listSparkAutomations failed", error);
	}

	let rows;
	try {
		rows = await buildCatalog(db, localAutomationsWithSource());
	} catch (error) {
		console.error("buildCatalog failed (migration pending?)", error);
		rows = localAutomationsWithSource().map((entry) => ({
			...entry,
			run: {
				lastSuccessAt: null,
				lastFailureAt: null,
				lastError: null,
				lastRunAt: null,
				lastOk: null,
				health: "unknown" as const,
			},
		}));
	}

	const crons = await listAppCrons();

	return (
		<main className="page page-wide">
			<AppHeader
				title="自動化一覧"
				lede="Cursor / プログラム / 手動を区別し、外部アプリ（push）の稼働状態と cron 登録を一覧します。"
			/>
			<AutomationCatalog rows={rows} />
			<SparkAutomationsSheet items={sparkItems} syncError={sparkSyncError} />
			<AppCronsSheet crons={crons} />
		</main>
	);
}

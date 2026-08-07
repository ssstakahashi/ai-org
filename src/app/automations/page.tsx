import { listAppCrons } from "@/app/actions";
import { AppCronsSheet } from "@/components/AppCronsSheet";
import { AppHeader } from "@/components/AppHeader";
import { AutomationCatalog } from "@/components/AutomationCatalog";
import { buildCatalog } from "@/lib/automation-ingest";
import { localAutomationsWithSource } from "@/lib/automations";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
	const db = await getDb();
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
			<AppCronsSheet crons={crons} />
		</main>
	);
}

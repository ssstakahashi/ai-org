import { newId } from "@/lib/ids";

export type OpsAlert = {
	id: string;
	kind: string;
	message: string;
	detail_json: string;
	created_at: string;
};

function hourAgoUtc(): string {
	return new Date(Date.now() - 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
}

export async function notifyOps(
	db: D1Database,
	input: { kind: string; message: string; detail?: unknown },
): Promise<void> {
	try {
		const recent = await db
			.prepare(
				`SELECT id FROM ops_alerts
				 WHERE kind = ? AND message = ? AND created_at > ?
				 LIMIT 1`,
			)
			.bind(input.kind, input.message, hourAgoUtc())
			.first<{ id: string }>();
		if (recent) return;

		const detail = JSON.stringify(input.detail ?? {});
		await db
			.prepare(
				`INSERT INTO ops_alerts (id, kind, message, detail_json)
				 VALUES (?, ?, ?, ?)`,
			)
			.bind(newId("alert"), input.kind, input.message, detail)
			.run();

		const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
		if (!webhook) return;
		void fetch(webhook, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				kind: input.kind,
				message: input.message,
				detail: input.detail ?? {},
			}),
		}).catch((error) => {
			console.error("alert webhook failed", error);
		});
	} catch (error) {
		console.error("ops alert failed", error);
	}
}

export async function listUnreadOpsAlerts(db: D1Database): Promise<OpsAlert[]> {
	const { results } = await db
		.prepare(
			`SELECT id, kind, message, detail_json, created_at
			 FROM ops_alerts
			 WHERE read_at IS NULL
			 ORDER BY created_at DESC
			 LIMIT 20`,
		)
		.all<OpsAlert>();
	return results ?? [];
}

export async function markOpsAlertsRead(db: D1Database): Promise<void> {
	await db
		.prepare(`UPDATE ops_alerts SET read_at = datetime('now') WHERE read_at IS NULL`)
		.run();
}

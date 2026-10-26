import { markBoardAlertsRead } from "@/app/board/actions";
import { getDb } from "@/lib/db";
import { listUnreadOpsAlerts } from "@/lib/ops-alerts";

export async function BoardAlerts() {
	let alerts: Awaited<ReturnType<typeof listUnreadOpsAlerts>> = [];
	try {
		alerts = await listUnreadOpsAlerts(await getDb());
	} catch (error) {
		console.error("board alerts failed", error);
		return null;
	}
	if (alerts.length === 0) return null;

	return (
		<section className="panel">
			<h2>通知</h2>
			<ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
				{alerts.map((alert) => (
					<li key={alert.id} style={{ marginBottom: "0.35rem" }}>
						{alert.message}
						<span style={{ color: "var(--muted)" }}> ({alert.created_at})</span>
					</li>
				))}
			</ul>
			<form action={markBoardAlertsRead} style={{ marginTop: "0.75rem" }}>
				<button type="submit">確認済みにする</button>
			</form>
		</section>
	);
}

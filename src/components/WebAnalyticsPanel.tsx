import {
	aggregateZoneTraffic,
	formatTrafficBytes,
	type CfWebAnalyticsSnapshot,
} from "@/lib/cloudflare-analytics";
import { formatInAppTz } from "@/lib/timezone";

type Props = {
	snapshot: CfWebAnalyticsSnapshot;
};

function formatCount(value: number): string {
	return value.toLocaleString("ja-JP");
}

export function WebAnalyticsPanel({ snapshot }: Props) {
	const fetchedLabel = formatInAppTz(snapshot.fetchedAt, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<>
			<section className="panel">
				<h2>取得状況</h2>
				<p style={{ margin: 0, fontSize: "0.9rem" }}>
					Cloudflare GraphQL Analytics（ゾーンの HTTP トラフィック）を参照しています。ページビューは{" "}
					<code>visits</code>、リクエスト数は <code>requests</code>、転送量はエッジ応答バイトです。
				</p>
				<p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
					直近 {snapshot.rangeDays} 日（日本時間の暦日）・取得: {fetchedLabel}
				</p>
			</section>

			{snapshot.zones.map((report) => {
				const totals = aggregateZoneTraffic(report.days);
				const recent7 = aggregateZoneTraffic(report.days.slice(-7));
				const maxRequests = Math.max(...report.days.map((day) => day.requests), 1);

				return (
					<section key={report.zone.id} className="panel">
						<div className="panel-head">
							<h2>{report.zone.name}</h2>
							<span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
								{report.zone.status}
							</span>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
								gap: "0.75rem",
								marginBottom: "1rem",
							}}
						>
							<div className="panel" style={{ margin: 0, padding: "0.75rem 1rem" }}>
								<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>直近7日 リクエスト</div>
								<div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
									{formatCount(recent7.requests)}
								</div>
							</div>
							<div className="panel" style={{ margin: 0, padding: "0.75rem 1rem" }}>
								<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>直近7日 ページビュー</div>
								<div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
									{formatCount(recent7.visits)}
								</div>
							</div>
							<div className="panel" style={{ margin: 0, padding: "0.75rem 1rem" }}>
								<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
									{snapshot.rangeDays}日合計 リクエスト
								</div>
								<div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
									{formatCount(totals.requests)}
								</div>
							</div>
							<div className="panel" style={{ margin: 0, padding: "0.75rem 1rem" }}>
								<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
									{snapshot.rangeDays}日合計 転送量
								</div>
								<div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
									{formatTrafficBytes(totals.bytes)}
								</div>
							</div>
						</div>

						<div className="apps-sheet-scroll">
							<table className="apps-sheet-table x-schedule-table">
								<thead>
									<tr>
										<th>日付</th>
										<th>リクエスト</th>
										<th>ページビュー</th>
										<th>転送量</th>
										<th style={{ minWidth: "8rem" }}>リクエスト推移</th>
									</tr>
								</thead>
								<tbody>
									{report.days.length === 0 ? (
										<tr>
											<td colSpan={5}>この期間のデータはありません。</td>
										</tr>
									) : (
										report.days.map((day) => {
											const width = Math.round((day.requests / maxRequests) * 100);
											return (
												<tr key={day.date}>
													<td className="when">{day.date}</td>
													<td>{formatCount(day.requests)}</td>
													<td>{formatCount(day.visits)}</td>
													<td>{formatTrafficBytes(day.bytes)}</td>
													<td>
														<div
															role="presentation"
															style={{
																height: "0.5rem",
																borderRadius: "999px",
																background: "var(--border)",
																overflow: "hidden",
															}}
														>
															<div
																style={{
																	width: `${width}%`,
																	height: "100%",
																	background: "var(--accent, #2563eb)",
																}}
															/>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</section>
				);
			})}
		</>
	);
}

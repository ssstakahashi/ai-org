import Link from "next/link";
import {
	HEALTH_LABEL,
	RUNNER_HINT,
	RUNNER_LABEL,
	STATUS_LABEL,
	type AutomationRunner,
} from "@/lib/automations";
import type { CatalogRow } from "@/lib/automation-ingest";
import { formatInAppTz } from "@/lib/timezone";

const RUNNER_ORDER: AutomationRunner[] = ["program", "cursor", "manual"];

function groupByRunner(entries: CatalogRow[]) {
	return RUNNER_ORDER.map((runner) => ({
		runner,
		items: entries.filter((e) => e.runner === runner),
	})).filter((g) => g.items.length > 0);
}

function formatWhen(value: string | null) {
	if (!value) return "—";
	const formatted = formatInAppTz(value, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	return formatted || value;
}

type Props = {
	rows: CatalogRow[];
};

export function AutomationCatalog({ rows }: Props) {
	const groups = groupByRunner(rows);

	return (
		<div className="automation-catalog">
			<section className="panel">
				<h2>実行方式の区別</h2>
				<ul className="automation-legend">
					{RUNNER_ORDER.map((runner) => (
						<li key={runner}>
							<span className={`automation-runner-badge runner-${runner}`}>
								{RUNNER_LABEL[runner]}
							</span>
							<span>{RUNNER_HINT[runner]}</span>
						</li>
					))}
				</ul>
			</section>

			{groups.map(({ runner, items }) => (
				<section key={runner} className="panel">
					<div className="panel-head">
						<h2>
							<span className={`automation-runner-badge runner-${runner}`}>
								{RUNNER_LABEL[runner]}
							</span>
							<span className="automation-count">{items.length}</span>
						</h2>
					</div>

					<div className="x-schedule-scroll">
						<table className="x-schedule-table automation-table">
							<thead>
								<tr>
									<th>ソース</th>
									<th>名称</th>
									<th>設定</th>
									<th>稼働</th>
									<th>最終成功</th>
									<th>最終失敗</th>
									<th>トリガー</th>
									<th>内容</th>
									<th>画面</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={`${item.source}:${item.id}`}>
										<td className="mono">{item.source}</td>
										<td className="title">{item.name}</td>
										<td>
											<span className={`automation-status status-${item.status}`}>
												{STATUS_LABEL[item.status]}
											</span>
										</td>
										<td>
											<span className={`automation-health health-${item.run.health}`}>
												{HEALTH_LABEL[item.run.health]}
											</span>
											{item.run.lastError ? (
												<p className="last-error" title={item.run.lastError}>
													{item.run.lastError.length > 80
														? `${item.run.lastError.slice(0, 80)}…`
														: item.run.lastError}
												</p>
											) : null}
										</td>
										<td className="when">{formatWhen(item.run.lastSuccessAt)}</td>
										<td className="when">{formatWhen(item.run.lastFailureAt)}</td>
										<td className="when">{item.trigger}</td>
										<td className="body-cell">{item.summary}</td>
										<td>
											{item.href ? (
												item.href.startsWith("http") ? (
													<a
														href={item.href}
														className="automation-link"
														target="_blank"
														rel="noreferrer"
													>
														開く
													</a>
												) : (
													<Link href={item.href} className="automation-link">
														開く
													</Link>
												)
											) : (
												<span className="muted">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
		</div>
	);
}

import { Fragment } from "react";
import { SyncSparkFromSheetButton } from "@/components/SyncSparkFromSheetButton";
import { STATUS_LABEL } from "@/lib/automations";
import type { SparkAutomation } from "@/lib/spark-automations";
import { SPARK_SHEET_URL } from "@/lib/spark-sheet-sync";

const META_COLUMNS = 3;

type Props = {
	items: SparkAutomation[];
	syncError?: string | null;
};

export function SparkAutomationsSheet({ items, syncError }: Props) {
	return (
		<section className="panel">
			<div className="panel-head">
				<h2>Google Spark（{items.length}）</h2>
			</div>

			<p className="field-hint apps-sheet-hint">
				Spark（Gemini）はシートに書き、この画面へ取得します。内容の編集はシート側で行えます。
			</p>

			<p>
				<a
					href={SPARK_SHEET_URL}
					className="automation-link"
					target="_blank"
					rel="noreferrer"
				>
					シートを開く
				</a>
			</p>

			<SyncSparkFromSheetButton />
			{syncError ? <p className="run-due-message">{syncError}</p> : null}

			{items.length === 0 ? (
				<p className="empty">Google Spark の自動化はまだありません。</p>
			) : (
				<div className="x-schedule-scroll">
					<table className="x-schedule-table automation-table">
						<thead>
							<tr>
								<th>名称</th>
								<th>設定</th>
								<th>トリガー</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<Fragment key={item.id}>
									<tr className="automation-meta-row">
										<td className="title">{item.name}</td>
										<td>
											<span className={`automation-status status-${item.status}`}>
												{STATUS_LABEL[item.status]}
											</span>
										</td>
										<td className="when">{item.trigger}</td>
									</tr>
									<tr className="automation-summary-row">
											<td colSpan={META_COLUMNS} className="automation-summary-cell">
												<span className="sr-only">内容</span>
												{item.summary}
											</td>
									</tr>
								</Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

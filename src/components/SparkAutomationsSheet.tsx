import { SyncSparkFromSheetButton } from "@/components/SyncSparkFromSheetButton";
import { STATUS_LABEL } from "@/lib/automations";
import type { SparkAutomation } from "@/lib/spark-automations";
import { SPARK_SHEET_URL } from "@/lib/spark-sheet-sync";

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
								<th>内容</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td className="title">{item.name}</td>
									<td>
										<span className={`automation-status status-${item.status}`}>
											{STATUS_LABEL[item.status]}
										</span>
									</td>
									<td className="when">{item.trigger}</td>
									<td className="body-cell">{item.summary}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

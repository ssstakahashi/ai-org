import { accountingManualTocByChapter } from "@/lib/accounting-manual";

export function AccountingManualToc() {
	const groups = accountingManualTocByChapter();

	return (
		<>
			{groups.map(({ chapter, entries }) => (
				<section key={chapter.id} className="panel" id={`chapter-${chapter.id}`}>
					<h2>{chapter.label}</h2>
					<div className="x-schedule-scroll">
						<table className="x-schedule-table">
							<thead>
								<tr>
									<th>No.</th>
									<th>項目名</th>
									<th>説明・補足</th>
									<th>ページ</th>
								</tr>
							</thead>
							<tbody>
								{entries.map((entry) => (
									<tr key={entry.no} id={`no-${entry.no}`}>
										<td>No.{entry.no}</td>
										<td className="title">{entry.title}</td>
										<td>{entry.summary}</td>
										<td>{entry.page}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
		</>
	);
}

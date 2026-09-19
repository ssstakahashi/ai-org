import Link from "next/link";
import {
	accountingManualPath,
	accountingManualTocByChapter,
} from "@/lib/accounting-manual";

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
										<td>
											<Link
												href={accountingManualPath(entry.no)}
												className="automation-link"
											>
												No.{entry.no}
											</Link>
										</td>
										<td className="title">
											<Link
												href={accountingManualPath(entry.no)}
												className="automation-link"
											>
												{entry.title}
											</Link>
										</td>
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

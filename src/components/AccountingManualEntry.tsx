import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AccountingManualContent } from "@/components/AccountingManualContent";
import {
	accountingManualPath,
	getAccountingManualChapter,
	getAccountingManualNeighbors,
	type AccountingManualTocEntry,
} from "@/lib/accounting-manual";

type Props = {
	entry: AccountingManualTocEntry;
};

export function AccountingManualEntry({ entry }: Props) {
	const chapter = getAccountingManualChapter(entry.chapterId);
	const { prev, next } = getAccountingManualNeighbors(entry.no);

	return (
		<main className="page">
			<AppHeader
				title={`No.${entry.no} ${entry.title}`}
				lede={chapter?.label ?? "会計マニュアル"}
			/>
			<section className="panel">
				<div className="panel-head">
					<h2>概要</h2>
					<div className="task-actions">
						<Link href="/accounting-manual" className="automation-link">
							目次
						</Link>
						{prev ? (
							<Link href={accountingManualPath(prev.no)} className="automation-link">
								前へ No.{prev.no}
							</Link>
						) : null}
						{next ? (
							<Link href={accountingManualPath(next.no)} className="automation-link">
								次へ No.{next.no}
							</Link>
						) : null}
					</div>
				</div>
				<p>{entry.summary}</p>
				<p className="field-hint">元資料ページ {entry.page}</p>
			</section>

			{entry.body ? (
				<section className="panel">
					<h2>詳細内容</h2>
					<AccountingManualContent markdown={entry.body} />
				</section>
			) : null}
		</main>
	);
}

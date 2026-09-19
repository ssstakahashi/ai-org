import { AppHeader } from "@/components/AppHeader";
import { AccountingManualContent } from "@/components/AccountingManualContent";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type TocEntry = {
	chapterId: string;
	no: number;
	title: string;
	summary: string;
	pageStart: number;
	pageEnd: number;
};

const CHAPTER_NAMES: Record<string, string> = {
	I: "第I章 決算準備",
	II: "第II章 決算整理",
	III: "第III章 申告書作成",
	IV: "第IV章 申告書完成",
};

async function loadToc(): Promise<TocEntry[]> {
	const tocPath = path.join(process.cwd(), "src/content/accounting-manual/toc.json");
	const content = await fs.readFile(tocPath, "utf-8");
	return JSON.parse(content);
}

async function loadContent(no: number): Promise<string | null> {
	try {
		const contentPath = path.join(
			process.cwd(),
			`src/content/accounting-manual/no-${String(no).padStart(2, "0")}.md`,
		);
		return await fs.readFile(contentPath, "utf-8");
	} catch {
		return null;
	}
}

export default async function AccountingManualPage() {
	const entries = await loadToc();

	// グループ化: chapterId -> entries
	const chapters = new Map<string, TocEntry[]>();
	for (const entry of entries) {
		if (!chapters.has(entry.chapterId)) {
			chapters.set(entry.chapterId, []);
		}
		chapters.get(entry.chapterId)!.push(entry);
	}

	// 各エントリーのコンテンツを読み込む (現在は No.1 のみ)
	const contentsMap = new Map<number, string>();
	for (const entry of entries) {
		const content = await loadContent(entry.no);
		if (content) {
			contentsMap.set(entry.no, content);
		}
	}

	return (
		<main className="page page-wide">
			<AppHeader
				title="会計マニュアル"
				lede="法人税申告の決算業務マニュアル。全62項目の手順と別表記入例を掲載しています。"
			/>

			{Array.from(chapters.entries()).map(([chapterId, chapterEntries]) => (
				<section key={chapterId} className="panel">
					<h2>{CHAPTER_NAMES[chapterId] ?? `第${chapterId}章`}</h2>

					<div className="x-schedule-scroll">
						<table className="x-schedule-table">
							<thead>
								<tr>
									<th style={{ width: "4rem" }}>No.</th>
									<th style={{ minWidth: "16rem" }}>項目</th>
									<th style={{ minWidth: "20rem" }}>概要</th>
									<th style={{ width: "6rem" }}>ページ</th>
								</tr>
							</thead>
							<tbody>
								{chapterEntries.map((entry) => (
									<tr key={entry.no}>
										<td>
											<a href={`#no-${entry.no}`} className="automation-link">
												{entry.no}
											</a>
										</td>
										<td>
											<a href={`#no-${entry.no}`} className="automation-link">
												{entry.title}
											</a>
										</td>
										<td style={{ whiteSpace: "normal" }}>{entry.summary}</td>
										<td style={{ textAlign: "right" }}>
											{entry.pageStart}
											{entry.pageEnd !== entry.pageStart && `〜${entry.pageEnd}`}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}

			{/* 詳細コンテンツセクション */}
			{entries.map((entry) => {
				const content = contentsMap.get(entry.no);
				if (!content) return null;

				return (
					<section key={`detail-${entry.no}`} id={`no-${entry.no}`} className="panel">
						<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
							<span
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: "2.5rem",
									height: "2.5rem",
									borderRadius: "50%",
									background: "var(--accent)",
									color: "#fff",
									fontWeight: 600,
									fontSize: "1.1rem",
								}}
							>
								{entry.no}
							</span>
							<h2 style={{ margin: 0 }}>{entry.title}</h2>
						</div>

						<div
							style={{
								marginBottom: "1rem",
								padding: "0.75rem 1rem",
								borderLeft: "3px solid var(--accent)",
								background: "var(--accent-soft)",
								borderRadius: "8px",
							}}
						>
							<p style={{ margin: 0, color: "var(--foreground)", lineHeight: 1.6 }}>
								{entry.summary}
							</p>
							<p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
								出典ページ: {entry.pageStart}〜{entry.pageEnd}
							</p>
						</div>

						<AccountingManualContent markdown={content} />
					</section>
				);
			})}

			{/* 追加予定の項目について */}
			<section className="panel">
				<h2>コンテンツの追加について</h2>
				<p className="lede">
					現在、No.1「同族会社を判定する」の詳細コンテンツを掲載しています。
					No.2〜62の詳細コンテンツは、<code>src/content/accounting-manual/no-XX.md</code>{" "}
					ファイルを追加することで自動的に表示されます。
				</p>
				<p className="lede" style={{ marginTop: "0.75rem" }}>
					各Markdownファイルには、見出し・段落・リスト・表・Mermaidダイアグラムなどを含めることができます。
				</p>
			</section>
		</main>
	);
}

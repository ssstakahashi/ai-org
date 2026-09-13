import { AppHeader } from "@/components/AppHeader";
import { BulletinBoard } from "@/components/BulletinBoard";
import { getLatestVersionEntry } from "@/lib/latest-version";

export const dynamic = "force-dynamic";

export default function BoardPage() {
	const latestVersion = getLatestVersionEntry();

	return (
		<main className="page">
			<AppHeader
				title="掲示板"
				lede="社内向けの掲示板です。元ファイルは Google スプレッドシートで管理します。"
			/>

			{latestVersion && (
				<section className="panel">
					<h2>最新の変更履歴</h2>
					<p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--muted)" }}>
						バージョン {latestVersion.version} ({latestVersion.date})
					</p>
					<ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
						{latestVersion.changes.map((change, idx) => (
							<li key={idx} style={{ marginBottom: "0.35rem" }}>
								{change}
							</li>
						))}
					</ul>
				</section>
			)}

			<BulletinBoard />
		</main>
	);
}

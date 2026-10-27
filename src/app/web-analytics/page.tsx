import { AppHeader } from "@/components/AppHeader";
import { WebAnalyticsPanel } from "@/components/WebAnalyticsPanel";
import { getBoundEnv } from "@/lib/db";
import {
	CloudflareAnalyticsApiError,
	CloudflareAnalyticsConfigError,
	fetchWebAnalyticsSnapshot,
} from "@/lib/cloudflare-analytics";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

function parseRangeDays(raw: string | undefined): number {
	const parsed = Number(raw);
	if (parsed === 7 || parsed === 14 || parsed === 28) return parsed;
	return 28;
}

export default async function WebAnalyticsPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const params = await searchParams;
	const rangeDays = parseRangeDays(params.days);
	const env = await getBoundEnv();

	let error: string | null = null;
	let snapshot = null;

	try {
		snapshot = await fetchWebAnalyticsSnapshot(env, { rangeDays });
	} catch (caught) {
		if (
			caught instanceof CloudflareAnalyticsConfigError ||
			caught instanceof CloudflareAnalyticsApiError
		) {
			error = caught.message;
		} else {
			console.error("web analytics fetch failed", caught);
			error = caught instanceof Error ? caught.message : String(caught);
		}
	}

	return (
		<main className="page page-wide">
			<AppHeader
				title="Web分析"
				lede="Cloudflare ゾーンの HTTP トラフィック（リクエスト・ページビュー・転送量）を一覧します。ダッシュボードの Analytics と同系の集計です。"
			/>

			<section className="panel">
				<h2>表示期間</h2>
				<div className="task-actions" style={{ flexWrap: "wrap" }}>
					{([7, 14, 28] as const).map((days) => (
						<a
							key={days}
							href={`/web-analytics?days=${days}`}
							className={rangeDays === days ? "button primary" : "button"}
							aria-current={rangeDays === days ? "page" : undefined}
						>
							直近{days}日
						</a>
					))}
				</div>
				<p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
					対象ゾーンはアカウント内の active ゾーンです。絞り込みは環境変数{" "}
					<code>CF_ANALYTICS_ZONE_NAMES</code>（カンマ区切りのホスト名）で指定できます。
				</p>
			</section>

			{error ? (
				<section className="panel">
					<h2>取得できませんでした</h2>
					<p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
					<p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
						API トークンに <strong>Zone → Read</strong> と <strong>Analytics → Read</strong>{" "}
						を付与してください。Workers AI 用の <code>CF_API_TOKEN</code> を流用できます。
					</p>
				</section>
			) : snapshot ? (
				<WebAnalyticsPanel snapshot={snapshot} />
			) : null}
		</main>
	);
}

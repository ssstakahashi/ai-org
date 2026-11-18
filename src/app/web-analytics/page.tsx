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
				lede="Cloudflare ゾーンの HTTP トラフィック（リクエスト・ページビュー・転送量）と、HTML パス別の上位アクセスを一覧します。"
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
					対象ゾーンはアカウント内の active ゾーンです。ゾーン（apex）の絞り込みは{" "}
					<code>CF_ANALYTICS_ZONE_NAMES</code>、HTTP ホスト名（サブドメイン・カスタムホスト名）の絞り込みは{" "}
					<code>CF_ANALYTICS_HTTP_HOSTS</code>（いずれもカンマ区切り）です。
				</p>
			</section>

			{error ? (
				<section className="panel">
					<h2>取得できませんでした</h2>
					<p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
					<p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
						<code>CF_ANALYTICS_API_TOKEN</code> に <strong>Zone → Read</strong> と{" "}
						<strong>Analytics → Read</strong> を付与し、<strong>Zone Resources</strong>{" "}
						に対象ゾーン（または All zones）を含めてください。文字起こし用のトークンとは別です。
					</p>
				</section>
			) : snapshot ? (
				<WebAnalyticsPanel snapshot={snapshot} />
			) : null}
		</main>
	);
}

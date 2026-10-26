import { notifyOps } from "@/lib/ops-alerts";
import { getBoundEnv } from "@/lib/db";
import { LOCAL_SOURCE, recordAutomationRun } from "@/lib/automation-ingest";

function slugsFromHtml(html: string): Set<string> {
	const found = new Set<string>();
	for (const match of html.matchAll(/\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
		const slug = match[1];
		if (slug && slug !== "page" && slug !== "category" && slug !== "tag") found.add(slug);
	}
	return found;
}

export function diffPublishedSlugs(site: ReadonlySet<string>, published: ReadonlySet<string>) {
	const missingOnSite = [...published].filter((slug) => !site.has(slug)).sort();
	const missingInDb = [...site].filter((slug) => !published.has(slug)).sort();
	return { missingOnSite, missingInDb };
}

/**
 * @automation
 * id: blog-status-reconcile
 * name: 本番ブログと記事ステータスの照合
 * runner: program
 * status: active
 * trigger: systemd timer（1時間ごと）
 * summary: 本番一覧の slug と blog_posts の published を突き合わせ、差があれば掲示板へ通知する。
 * location: scripts/run-cron.ts → runBlogStatusReconcile
 * href: /board
 */
export async function runBlogStatusReconcile() {
	const env = await getBoundEnv();
	const startedAt = new Date().toISOString();
	const indexUrl = process.env.BLOG_PUBLIC_INDEX_URL?.trim();
	if (!indexUrl) {
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "blog-status-reconcile",
			ok: false,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: "BLOG_PUBLIC_INDEX_URL が未設定です",
		});
		await notifyOps(env.DB, {
			kind: "reconcile_unconfigured",
			message: "本番照合の URL が未設定です",
		});
		return;
	}

	try {
		const response = await fetch(indexUrl, { signal: AbortSignal.timeout(15000) });
		if (!response.ok) {
			throw new Error(`本番一覧の取得に失敗しました (${response.status})`);
		}
		const site = slugsFromHtml(await response.text());
		const { results } = await env.DB
			.prepare(`SELECT slug FROM blog_posts WHERE status = 'published'`)
			.all<{ slug: string }>();
		const published = new Set((results ?? []).map((row) => row.slug));
		const diff = diffPublishedSlugs(site, published);
		const drifted = diff.missingOnSite.length > 0 || diff.missingInDb.length > 0;
		if (drifted) {
			await notifyOps(env.DB, {
				kind: "status_drift",
				message: "本番一覧と記事ステータスに差があります",
				detail: diff,
			});
		}
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "blog-status-reconcile",
			ok: !drifted,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: drifted ? "本番一覧と記事ステータスに差があります" : null,
			meta: diff,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("blog-status-reconcile failed", error);
		await notifyOps(env.DB, {
			kind: "status_drift",
			message: "本番照合に失敗しました",
			detail: { error: message },
		});
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "blog-status-reconcile",
			ok: false,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: message,
		});
	}
}

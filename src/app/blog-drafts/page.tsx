import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listBlogPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BlogDraftsManager } from "@/components/BlogDraftsManager";
import { syncStudiofoodsHpBlogPostsWithSheet } from "@/lib/blog-posts-sheets-sync";
import { isSheetsSyncConfigured } from "@/lib/x-post-sheets-sync";

export const dynamic = "force-dynamic";

export default async function BlogDraftsPage() {
	const { env } = await getCloudflareContext({ async: true });
	let sheetSyncError: string | null = null;
	try {
		if (isSheetsSyncConfigured(env)) {
			await syncStudiofoodsHpBlogPostsWithSheet(env);
		}
	} catch (error) {
		console.error("studiofoods hp blog sheet sync failed", error);
		sheetSyncError = error instanceof Error ? error.message : String(error);
	}

	const posts = await listBlogPosts();

	return (
		<main className="page page-wide">
			<AppHeader
				title="ブログ下書き"
				lede="スタジオフーズのHPと農業日誌アプリLPの下書きを確認し、公開前に承認します。"
			/>
			<BlogDraftsManager posts={posts} sheetSyncError={sheetSyncError} />
		</main>
	);
}

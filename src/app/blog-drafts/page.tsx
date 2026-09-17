import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listBlogPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BlogDraftsManager } from "@/components/BlogDraftsManager";
import { syncBlogPostsWithSheet } from "@/lib/blog-posts-sheets-sync";
import {
	BLOG_POST_DESTINATION_OPTIONS,
	type BlogPostDestination,
} from "@/lib/types";
import { isSheetsSyncConfigured } from "@/lib/x-post-sheets-sync";

export const dynamic = "force-dynamic";

export default async function BlogDraftsPage() {
	const { env } = await getCloudflareContext({ async: true });
	const sheetSyncErrors: Partial<Record<BlogPostDestination, string>> = {};
	if (isSheetsSyncConfigured(env)) {
		for (const destination of BLOG_POST_DESTINATION_OPTIONS) {
			try {
				await syncBlogPostsWithSheet(env, destination);
			} catch (error) {
				console.error(`${destination} blog sheet sync failed`, error);
				sheetSyncErrors[destination] =
					error instanceof Error ? error.message : String(error);
			}
		}
	}

	const posts = await listBlogPosts();

	return (
		<main className="page page-wide">
			<AppHeader
				title="ブログ下書き"
				lede="スタジオフーズのHPと農業日誌アプリLPの下書きを確認し、公開前に承認します。"
			/>
			<BlogDraftsManager posts={posts} sheetSyncErrors={sheetSyncErrors} />
		</main>
	);
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listBlogPostComments, listBlogPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BlogDraftsManager } from "@/components/BlogDraftsManager";
import {
	emptyBlogIdeas,
	fetchBlogIdeasFromSheets,
} from "@/lib/blog-ideas-sheets";
import { groupBlogPostComments } from "@/lib/blog-post-comments";
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
	const sheetsConfigured = isSheetsSyncConfigured(env);
	const ideasPromise = sheetsConfigured
		? fetchBlogIdeasFromSheets(env)
				.then((ideas) => ({ ideas, error: null as string | null }))
				.catch((error) => {
					console.error("blog ideas sheet fetch failed", error);
					return {
						ideas: emptyBlogIdeas(),
						error: error instanceof Error ? error.message : String(error),
					};
				})
		: Promise.resolve({
				ideas: emptyBlogIdeas(),
				error: "Google Service Account が未設定です",
			});

	if (sheetsConfigured) {
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

	const [posts, ideasResult] = await Promise.all([listBlogPosts(), ideasPromise]);
	const commentsByPostId = groupBlogPostComments(
		await listBlogPostComments(posts.map((post) => post.id)),
	);

	return (
		<main className="page page-wide">
			<AppHeader
				title="ブログ下書き"
				lede="スタジオフーズのHPと農業日誌アプリLPの下書きを確認し、公開前に承認します。ブログネタ（SideBusiness / Agri）も同じ画面で参照できます。"
			/>
			<BlogDraftsManager
				posts={posts}
				commentsByPostId={commentsByPostId}
				sheetSyncErrors={sheetSyncErrors}
				ideas={ideasResult.ideas}
				ideasError={ideasResult.error}
			/>
		</main>
	);
}

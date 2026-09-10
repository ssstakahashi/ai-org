import { listBlogPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BlogDraftsManager } from "@/components/BlogDraftsManager";

export const dynamic = "force-dynamic";

export default async function BlogDraftsPage() {
	const posts = await listBlogPosts();

	return (
		<main className="page page-wide">
			<AppHeader
				title="ブログ下書き"
				lede="スタジオフーズのHPと農業日誌アプリLPの下書きを確認し、公開前に承認します。"
			/>
			<BlogDraftsManager posts={posts} />
		</main>
	);
}

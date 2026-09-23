import { AppHeader } from "@/components/AppHeader";
import { BlogIdeasManager } from "@/components/BlogIdeasManager";
import { listBlogIdeas } from "@/lib/blog-ideas";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BlogIdeasPage() {
	const ideas = await listBlogIdeas(await getDb());

	return (
		<main className="page page-wide">
			<AppHeader
				title="ネタ"
				lede="CSV でネタを取り込みます。一覧の「下書き」列で、ブログ下書き・X下書き・両方のどれに転用したか分かります。"
			/>
			<BlogIdeasManager ideas={ideas} />
		</main>
	);
}

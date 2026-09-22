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
				lede="CSV でネタを取り込みます。各ネタがブログと X のどの媒体に転用されたかを記録します。"
			/>
			<BlogIdeasManager ideas={ideas} />
		</main>
	);
}

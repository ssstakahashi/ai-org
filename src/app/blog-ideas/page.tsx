import { listTags } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { BlogIdeasManager } from "@/components/BlogIdeasManager";
import { listBlogIdeas } from "@/lib/blog-ideas";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BlogIdeasPage() {
	const [ideas, tags] = await Promise.all([listBlogIdeas(await getDb()), listTags()]);

	return (
		<main className="page page-wide">
			<AppHeader
				title="ネタ"
				lede="CSV でネタを取り込みます。一覧の「下書き」列で転用状況が分かり、各ネタにタグを付けられます。"
			/>
			<BlogIdeasManager ideas={ideas} tags={tags} />
		</main>
	);
}

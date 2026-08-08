import { listCategories, listPages, listTags } from "@/app/actions";
import { PageManager } from "@/components/PageManager";

export const dynamic = "force-dynamic";

export default async function PagesIndexPage() {
	const [pages, categories, tags] = await Promise.all([
		listPages(),
		listCategories(),
		listTags(),
	]);

	return <PageManager pages={pages} categories={categories} tags={tags} />;
}

import { listCategories } from "@/app/actions";
import { CategoryManager } from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function PageCategoriesPage() {
	const categories = await listCategories();

	return <CategoryManager categories={categories} />;
}

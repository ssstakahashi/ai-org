import { listCategories } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { CategoryManager } from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
	const categories = await listCategories();

	return (
		<main className="page">
			<AppHeader
				title="カテゴリ"
				lede="タスク分類用のカテゴリを管理します。削除したカテゴリはタスクから外れます。"
			/>
			<CategoryManager categories={categories} />
		</main>
	);
}

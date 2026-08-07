import { listTags } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { TagManager } from "@/components/TagManager";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
	const tags = await listTags();

	return (
		<main className="page">
			<AppHeader
				title="タグ"
				lede="タスクに付けるタグを管理します。削除したタグはタスクから外れます。"
			/>
			<TagManager tags={tags} />
		</main>
	);
}

import { listXPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { XPostScheduleTable } from "@/components/XPostScheduleTable";

export const dynamic = "force-dynamic";

export default async function XSchedulePage() {
	const posts = await listXPosts();

	return (
		<main className="page page-wide">
			<AppHeader
				title="X投稿スケジュール"
				lede="投稿文・画像・予約日時を業務台帳とは別に管理します。予約時刻を過ぎた投稿は毎分自動実行されます。"
			/>

			<XPostScheduleTable posts={posts} />
		</main>
	);
}

import { listXPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { RunDuePostsButton } from "@/components/RunDuePostsButton";
import { XPostForm } from "@/components/XPostForm";
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

			<section className="panel">
				<div className="panel-head">
					<h2>新規投稿</h2>
				</div>
				<XPostForm />
			</section>

			<section className="panel">
				<div className="panel-head">
					<h2>予定一覧（{posts.length}）</h2>
					<RunDuePostsButton />
				</div>
				<XPostScheduleTable posts={posts} />
			</section>
		</main>
	);
}

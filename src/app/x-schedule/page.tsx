import { listXPostComments, listXPosts } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { XPostScheduleTable } from "@/components/XPostScheduleTable";
import { groupXPostComments } from "@/lib/x-post-comments";

export const dynamic = "force-dynamic";

export default async function XSchedulePage() {
	const posts = await listXPosts();
	const commentsByPostId = groupXPostComments(
		await listXPostComments(posts.map((post) => post.id)),
	);

	return (
		<main className="page page-wide">
			<AppHeader
				title="X投稿スケジュール"
				lede="投稿文・画像・予約日時を業務台帳とは別に管理します。予約時刻を過ぎた投稿は毎分自動実行されます。投稿済以外の記事には、複数のAIが複数コメントできます。"
			/>

			<XPostScheduleTable posts={posts} commentsByPostId={commentsByPostId} />
		</main>
	);
}

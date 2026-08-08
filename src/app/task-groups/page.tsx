import { listTaskGroups } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { TaskGroupManager } from "@/components/TaskGroupManager";

export const dynamic = "force-dynamic";

export default async function TaskGroupsPage() {
	const taskGroups = await listTaskGroups();

	return (
		<main className="page">
			<AppHeader
				title="タスクグループ"
				lede="業務タスクをまとめるグループの追加・編集・削除を行います。"
			/>
			<TaskGroupManager taskGroups={taskGroups} />
		</main>
	);
}

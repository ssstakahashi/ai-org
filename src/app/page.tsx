import { listCategories, listEmployees, listTags, listTaskGroups, listTasks } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { TaskWorkspace } from "@/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function Home() {
	const [employees, categories, taskGroups, tags, tasks] = await Promise.all([
		listEmployees(),
		listCategories(),
		listTaskGroups(),
		listTags(),
		listTasks(),
	]);

	return (
		<main className="page page-wide">
			<AppHeader
				title="業務台帳"
				lede="AI従業員の業務タスクを人間と一緒に管理します。カレンダー・ガント・看板で一覧できます。X投稿は別画面で管理します。"
			/>

			<TaskWorkspace
				employees={employees}
				categories={categories}
				taskGroups={taskGroups}
				tags={tags}
				tasks={tasks}
			/>
		</main>
	);
}

import { listTasks } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { TodayTaskList } from "@/components/TodayTaskList";
import { selectTodayTasks } from "@/lib/task-views";

export const dynamic = "force-dynamic";

export default async function TodayTasksPage() {
	const tasks = await listTasks();
	const selection = selectTodayTasks(tasks);

	return (
		<main className="page">
			<AppHeader
				title="今日のタスク"
				lede={`${selection.todayKey} にかかるタスクと、${selection.throughKey} までに終わるはずで未完了のタスクです。完了にすると業務台帳のステータスが完了になります。`}
			/>

			<section className="panel">
				<div className="panel-head">
					<h2>今日（{selection.todayKey}）</h2>
					<p className="empty">{selection.today.length} 件</p>
				</div>
				<TodayTaskList tasks={selection.today} empty="今日にかかるタスクはありません。" />
			</section>

			<section className="panel">
				<div className="panel-head">
					<h2>昨日までの未了（{selection.throughKey} まで）</h2>
					<p className="empty">{selection.unfinishedThroughYesterday.length} 件</p>
				</div>
				<TodayTaskList
					tasks={selection.unfinishedThroughYesterday}
					empty="昨日までに終わるはずで未完了のタスクはありません。"
				/>
			</section>
		</main>
	);
}

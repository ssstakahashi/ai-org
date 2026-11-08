import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeGoogleTasksOAuth, getGoogleTasksLastRun, listCategories, listEmployees, listTags, listTaskGroups, listTasks } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { PublicHome } from "@/components/PublicHome";
import { TaskWorkspace } from "@/components/TaskWorkspace";
import { requestHasAppSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "ai-org は、業務タスクを管理するためのアプリです",
	description:
		"人と AI 従業員の業務タスクを管理する社内の業務台帳です。ログインしなくても、アプリの目的とデータの取り扱いを確認できます。",
};

export default async function Home({
	searchParams,
}: {
	searchParams: Promise<{ code?: string; state?: string; error?: string }>;
}) {
	const params = await searchParams;
	const signedIn = await requestHasAppSession();
	if (!signedIn) {
		const query = new URLSearchParams();
		if (params.code) query.set("code", params.code);
		if (params.state) query.set("state", params.state);
		if (params.error) query.set("error", params.error);
		const qs = query.toString();
		if (qs) {
			redirect(`/login?next=${encodeURIComponent(`/?${qs}`)}`);
		}
		return <PublicHome />;
	}

	if (params.code) {
		const result = await completeGoogleTasksOAuth(params.code, params.state ?? "");
		if (result.error) {
			console.error("google tasks oauth", result.error);
		}
		redirect("/");
	}

	const [employees, categories, taskGroups, tags, tasks, googleTasksLastRun] = await Promise.all([
		listEmployees(),
		listCategories(),
		listTaskGroups(),
		listTags(),
		listTasks(),
		getGoogleTasksLastRun(),
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
				googleTasksLastRun={googleTasksLastRun}
			/>
		</main>
	);
}

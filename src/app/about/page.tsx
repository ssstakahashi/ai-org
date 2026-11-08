import type { Metadata } from "next";
import { PublicHome } from "@/components/PublicHome";

export const metadata: Metadata = {
	title: "ai-org は、業務タスクを管理するためのアプリです",
	description:
		"人と AI 従業員の業務タスクを管理する社内の業務台帳です。ログインしなくても、アプリの目的とデータの取り扱いを確認できます。",
};

export default function AboutPage() {
	return <PublicHome />;
}

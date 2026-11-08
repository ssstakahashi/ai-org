import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { PublicHome } from "@/components/PublicHome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "ai-org は、業務タスクを管理するためのアプリです",
	description:
		"人と AI 従業員の業務タスクを管理する社内の業務台帳です。ログインしなくても、アプリの目的とデータの取り扱いを確認できます。",
};

export default function LoginPage() {
	return (
		<>
			<PublicHome />
			<section className="page">
				<section className="panel login-panel">
					<h2>パスワードを知っている人の入口</h2>
					<p className="login-lede">業務データの画面を開くときだけ、パスワードを入力します。</p>
					<Suspense fallback={<p className="login-lede">読み込み中...</p>}>
						<LoginForm />
					</Suspense>
				</section>
			</section>
		</>
	);
}

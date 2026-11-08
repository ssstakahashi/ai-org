import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
	return (
		<main className="page login-page">
			<section className="panel login-panel">
				<h1>ai-org にログイン</h1>
				<p className="login-lede">
					ai-org は、人と AI 従業員の業務タスクを管理する社内の業務台帳です。パスワードを入力してください。
				</p>
				<Suspense fallback={<p className="login-lede">読み込み中...</p>}>
					<LoginForm />
				</Suspense>
				<p className="login-lede">
					<a href="/">アプリの説明</a>
					{" · "}
					<a href="/terms">利用規約</a>
					{" · "}
					<a href="/privacy">プライバシーポリシー</a>
				</p>
			</section>
		</main>
	);
}

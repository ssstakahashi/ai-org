import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
	return (
		<main className="page login-page">
			<section className="panel login-panel">
				<h1>ai-org にログイン</h1>
				<p className="login-lede">パスワードを入力してください。</p>
				<Suspense fallback={<p className="login-lede">読み込み中...</p>}>
					<LoginForm />
				</Suspense>
			</section>
		</main>
	);
}

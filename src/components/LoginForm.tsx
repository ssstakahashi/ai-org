"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
	const searchParams = useSearchParams();
	const nextPath = searchParams.get("next") ?? "/";
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password, next: nextPath }),
			});
			const data = (await response.json()) as { error?: string; redirectTo?: string };

			if (!response.ok) {
				setError(data.error ?? "ログインに失敗しました");
				return;
			}

			window.location.href = data.redirectTo ?? "/";
		} catch {
			setError("ログインに失敗しました");
		} finally {
			setPending(false);
		}
	}

	return (
		<form className="task-form login-form" onSubmit={onSubmit}>
			<div className="field-grid">
				<label className="full">
					パスワード
					<input
						type="password"
						name="password"
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						disabled={pending}
					/>
				</label>
			</div>

			{error ? <p className="form-error">{error}</p> : null}

			<button type="submit" className="primary" disabled={pending}>
				{pending ? "ログイン中..." : "ログイン"}
			</button>
		</form>
	);
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runDueXPosts } from "@/app/actions";

/**
 * @automation
 * id: x-due-ui
 * name: X 予約分をいま投稿
 * runner: manual
 * status: manual
 * trigger: X投稿スケジュール画面のボタン
 * summary: Cron と同じ publishDueXPosts を、人が押したタイミングで即実行する。
 * location: RunDuePostsButton → runDueXPosts
 * href: /x-schedule
 */
export function RunDuePostsButton() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);

	return (
		<div className="run-due">
			<button
				type="button"
				className="primary"
				disabled={pending}
				onClick={() => {
					setMessage(null);
					startTransition(async () => {
						try {
							const result = await runDueXPosts();
							setMessage(
								`実行: ${result.attempted}件 / 成功 ${result.succeeded} / 失敗 ${result.failed}`,
							);
							router.refresh();
						} catch (error) {
							setMessage(error instanceof Error ? error.message : String(error));
						}
					});
				}}
			>
				{pending ? "投稿中…" : "予約分をいま投稿"}
			</button>
			{message ? <p className="run-due-message">{message}</p> : null}
		</div>
	);
}

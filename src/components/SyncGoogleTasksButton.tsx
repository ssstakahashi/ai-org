"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncGoogleTasksNow } from "@/app/actions";

/**
 * @automation
 * id: google-tasks-sync-ui
 * name: Google Tasks と業務台帳を同期
 * runner: manual
 * status: manual
 * trigger: 業務台帳画面のボタン
 * summary: Google Tasks（ai-org リスト）と業務台帳を双方向同期する（手動）。
 * location: SyncGoogleTasksButton → syncGoogleTasksNow
 * href: /
 */
export function SyncGoogleTasksButton() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);

	return (
		<div className="run-due">
			<button
				type="button"
				disabled={pending}
				onClick={() => {
					setMessage(null);
					startTransition(async () => {
						try {
							const result = await syncGoogleTasksNow();
							if (result.fatalError) {
								setMessage(result.fatalError);
								return;
							}
							const incoming = result.createdLocal + result.updatedLocal;
							const outgoing = result.createdGoogle + result.updatedGoogle;
							const deferred = result.deferredGoogle ?? 0;
							if (incoming === 0 && outgoing === 0 && deferred === 0 && result.errors.length === 0) {
								setMessage(
									"同期済み（差分なし）。Google Tasks のリスト「ai-org」を開いて確認してください。",
								);
							} else {
								setMessage(
									`同期: 取込${incoming} / 送出${outgoing}` +
										(deferred > 0 ? ` / 残り${deferred}件は次回` : "") +
										(result.errors.length > 0 ? `（失敗 ${result.errors.length}）` : ""),
								);
							}
							router.refresh();
						} catch (error) {
							setMessage(error instanceof Error ? error.message : String(error));
						}
					});
				}}
			>
				{pending ? "同期中…" : "Google Tasks と同期"}
			</button>
			{message ? <p className="run-due-message">{message}</p> : null}
		</div>
	);
}

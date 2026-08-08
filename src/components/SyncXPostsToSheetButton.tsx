"use client";

import { useState, useTransition } from "react";
import { syncXPostsToSheet } from "@/app/actions";

/**
 * @automation
 * id: x-sheet-sync-ui
 * name: X 投稿をスプレッドシートへ同期
 * runner: manual
 * status: manual
 * trigger: X投稿スケジュール画面のボタン
 * summary: x_posts 全件を Google スプレッドシートへ upsert する（手動・一括同期）。
 * location: SyncXPostsToSheetButton → syncXPostsToSheet
 * href: /x-schedule
 */
export function SyncXPostsToSheetButton() {
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
							const result = await syncXPostsToSheet();
							if (result.fatalError) {
								setMessage(result.fatalError);
								return;
							}
							if (result.total === 0) {
								setMessage("同期対象の投稿がありません");
								return;
							}
							setMessage(
								`同期: ${result.synced}/${result.total}件` +
									(result.failed > 0 ? `（失敗 ${result.failed}）` : ""),
							);
						} catch (error) {
							setMessage(error instanceof Error ? error.message : String(error));
						}
					});
				}}
			>
				{pending ? "同期中…" : "スプレッドシートへ同期"}
			</button>
			{message ? <p className="run-due-message">{message}</p> : null}
		</div>
	);
}

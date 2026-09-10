"use client";

import { useState, useTransition } from "react";
import { syncSparkAutomationsFromSheet } from "@/app/actions";

/**
 * @automation
 * id: spark-sheet-sync-ui
 * name: Google Spark をスプレッドシートから取得
 * runner: manual
 * status: manual
 * trigger: 自動化一覧画面のボタン
 * summary: Spark（Gemini）が書けないため、指定スプレッドシートの自動化一覧を取得してカタログに載せる。
 * location: SyncSparkFromSheetButton → syncSparkAutomationsFromSheet
 * href: /automations
 */
export function SyncSparkFromSheetButton() {
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
							const result = await syncSparkAutomationsFromSheet();
							if (result.fatalError) {
								setMessage(result.fatalError);
								return;
							}
							setMessage(`取得: ${result.count}件`);
						} catch (error) {
							setMessage(error instanceof Error ? error.message : String(error));
						}
					});
				}}
			>
				{pending ? "取得中…" : "スプレッドシートから取得"}
			</button>
			{message ? <p className="run-due-message">{message}</p> : null}
		</div>
	);
}

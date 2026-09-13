"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { syncGoogleTasksNow } from "@/app/actions";
import {
	formatGoogleTasksSyncResult,
	type GoogleTasksLastRun,
} from "@/lib/google-tasks-sync-format";
import { formatInAppTz } from "@/lib/timezone";

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
type Props = {
	lastRun?: GoogleTasksLastRun | null;
};

function formatWhen(value: string) {
	return (
		formatInAppTz(value, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}) || value
	);
}

function formatLastRun(run: GoogleTasksLastRun): string {
	const source = run.automationId === "google-tasks-sync-cron" ? "自動" : "手動";
	const when = formatWhen(run.finishedAt);
	if (!run.ok) {
		return `${when}（${source}）失敗: ${run.error || "原因不明"}`;
	}
	if (run.counts) {
		return `${when}（${source}）${formatGoogleTasksSyncResult({ ...run.counts, errors: [] })}`;
	}
	return `${when}（${source}）同期しました`;
}

export function SyncGoogleTasksButton({ lastRun = null }: Props) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [liveMessage, setLiveMessage] = useState<string | null>(null);

	const status = busy
		? "同期しています…完了まで数十秒かかることがあります"
		: liveMessage ||
			(lastRun ? formatLastRun(lastRun) : "まだ同期結果がありません。ボタンを押すとここに出ます");

	return (
		<div className="run-due">
			<button
				type="button"
				disabled={busy}
				onClick={() => {
					setBusy(true);
					setLiveMessage(null);
					void (async () => {
						try {
							const result = await syncGoogleTasksNow();
							setLiveMessage(formatGoogleTasksSyncResult(result));
							router.refresh();
						} catch (error) {
							setLiveMessage(error instanceof Error ? error.message : String(error));
						} finally {
							setBusy(false);
						}
					})();
				}}
			>
				{busy ? "同期中…" : "Google Tasks と同期"}
			</button>
			<p className="run-due-message" aria-live="polite">
				{status}
			</p>
		</div>
	);
}

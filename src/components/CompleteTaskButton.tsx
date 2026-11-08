"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { StatusIcon } from "@/components/StatusIcon";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";

type Props = {
	taskId: string;
};

export function CompleteTaskButton({ taskId }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	function handleComplete() {
		if (pending) return;
		setError(null);
		startTransition(async () => {
			try {
				const result = await setTaskStatus(taskId, "done");
				if (result.error) {
					setError(result.error);
					return;
				}
				router.refresh();
			} catch (err) {
				if (recoverFromStaleServerAction(err)) return;
				setError(err instanceof Error ? err.message : "完了の保存に失敗しました");
			}
		});
	}

	return (
		<>
			<button type="button" className="primary" disabled={pending} onClick={handleComplete}>
				<StatusIcon status="done" className="task-detail-btn-icon" />
				<span>{pending ? "保存中…" : "完了"}</span>
			</button>
			{error ? (
				<div className="task-detail">
					<p className="form-error">{error}</p>
				</div>
			) : null}
		</>
	);
}

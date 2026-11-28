"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateAppRequirementStatus } from "@/app/actions";
import { StatusIcon } from "@/components/StatusIcon";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import {
	APP_REQUIREMENT_STATUS_LABEL,
	APP_REQUIREMENT_STATUS_OPTIONS,
	type AppRequirementStatus,
	type AppRequirementWithApp,
	type TaskStatus,
} from "@/lib/types";

const STATUS_STYLE_CLASS: Record<AppRequirementStatus, string> = {
	draft: "status-draft",
	approved: "status-approved",
	in_progress: "status-scheduled",
	done: "status-done",
	cancelled: "status-failed",
};

const STATUS_ICON: Record<AppRequirementStatus, TaskStatus> = {
	draft: "draft",
	approved: "approved",
	in_progress: "scheduled",
	done: "done",
	cancelled: "failed",
};

type Props = {
	requirement: AppRequirementWithApp;
	onUpdated?: (id: string, status: AppRequirementStatus) => void;
};

export function AppRequirementStatusButtons({ requirement, onUpdated }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [status, setStatus] = useState(requirement.status);
	const [error, setError] = useState("");

	useEffect(() => {
		setStatus(requirement.status);
	}, [requirement.status]);

	function handleSelect(next: AppRequirementStatus) {
		if (next === status || pending) return;
		const previous = status;
		setError("");
		setStatus(next);
		onUpdated?.(requirement.id, next);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", requirement.id);
				formData.set("status", next);
				await updateAppRequirementStatus(formData);
				router.refresh();
			} catch (error) {
				setStatus(previous);
				onUpdated?.(requirement.id, previous);
				if (recoverFromStaleServerAction(error)) return;
				console.error(
					error instanceof Error ? error.message : "ステータスの更新に失敗しました",
				);
				setError("ステータスを保存できませんでした。もう一度お試しください。");
			}
		});
	}

	return (
		<div className="requirement-item-status">
			<div
				className={`status-options requirement-item-status-options${
					pending ? " is-pending" : ""
				}`}
				role="group"
				aria-label={`${requirement.title} のステータス`}
			>
				{APP_REQUIREMENT_STATUS_OPTIONS.map((value) => {
					const current = status === value;
					return (
						<button
							key={value}
							type="button"
							className={`status-option ${STATUS_STYLE_CLASS[value]}${
								current ? " is-current" : ""
							}`}
							aria-pressed={current}
							disabled={pending}
							onClick={() => handleSelect(value)}
						>
							<StatusIcon status={STATUS_ICON[value]} />
							<span>{APP_REQUIREMENT_STATUS_LABEL[value]}</span>
						</button>
					);
				})}
			</div>
			{error ? (
				<p className="requirement-item-test-error" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateAppTestResultOutcome } from "@/app/actions";
import {
	APP_TEST_OUTCOME_ICON,
	APP_TEST_OUTCOME_STYLE_CLASS,
} from "@/components/AppTestResultOutcomeField";
import { StatusIcon } from "@/components/StatusIcon";
import { recoverFromStaleServerAction } from "@/lib/server-action-client";
import {
	APP_TEST_RESULT_OUTCOME_LABEL,
	APP_TEST_RESULT_OUTCOME_OPTIONS,
	type AppTestResultOutcome,
	type AppTestResultWithApp,
} from "@/lib/types";

type Props = {
	result: AppTestResultWithApp;
	onUpdated?: (id: string, outcome: AppTestResultOutcome) => void;
};

export function AppTestResultOutcomeButtons({ result, onUpdated }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [outcome, setOutcome] = useState(result.outcome);

	useEffect(() => {
		setOutcome(result.outcome);
	}, [result.outcome]);

	function handleSelect(next: AppTestResultOutcome) {
		if (next === outcome || pending) return;
		const previous = outcome;
		setOutcome(next);
		onUpdated?.(result.id, next);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.set("id", result.id);
				formData.set("outcome", next);
				await updateAppTestResultOutcome(formData);
				router.refresh();
			} catch (error) {
				setOutcome(previous);
				onUpdated?.(result.id, previous);
				if (recoverFromStaleServerAction(error)) return;
				console.error(
					error instanceof Error ? error.message : "結果の更新に失敗しました",
				);
			}
		});
	}

	return (
		<div
			className="requirement-item-status"
			onClick={(event) => event.stopPropagation()}
			onKeyDown={(event) => event.stopPropagation()}
		>
			<div
				className={`status-options requirement-item-status-options${
					pending ? " is-pending" : ""
				}`}
				role="group"
				aria-label={`${result.title} の結果`}
			>
				{APP_TEST_RESULT_OUTCOME_OPTIONS.map((value) => {
					const current = outcome === value;
					return (
						<button
							key={value}
							type="button"
							className={`status-option ${APP_TEST_OUTCOME_STYLE_CLASS[value]}${
								current ? " is-current" : ""
							}`}
							aria-pressed={current}
							disabled={pending}
							onClick={() => handleSelect(value)}
						>
							<StatusIcon status={APP_TEST_OUTCOME_ICON[value]} />
							<span>{APP_TEST_RESULT_OUTCOME_LABEL[value]}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

import { StatusIcon } from "@/components/StatusIcon";
import {
	APP_TEST_RESULT_OUTCOME_LABEL,
	APP_TEST_RESULT_OUTCOME_OPTIONS,
	type AppTestResultOutcome,
	type TaskStatus,
} from "@/lib/types";

const OUTCOME_STYLE_CLASS: Record<AppTestResultOutcome, string> = {
	pass: "status-done",
	fail: "status-failed",
	partial: "status-scheduled",
	blocked: "status-failed",
	skipped: "status-draft",
	info: "status-approved",
};

const OUTCOME_ICON: Record<AppTestResultOutcome, TaskStatus> = {
	pass: "done",
	fail: "failed",
	partial: "scheduled",
	blocked: "failed",
	skipped: "draft",
	info: "approved",
};

type Props = {
	selectedOutcome?: AppTestResultOutcome;
	defaultOutcome?: AppTestResultOutcome;
	formId?: string;
	variant?: "default" | "table";
};

export function AppTestResultOutcomeField({
	selectedOutcome,
	defaultOutcome = "info",
	formId,
	variant = "default",
}: Props) {
	const current = selectedOutcome ?? defaultOutcome;

	return (
		<div
			className={[
				"status-field",
				variant === "default" ? "full" : "",
				variant === "table" ? "requirement-status-table" : "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			{variant === "default" ? <span>結果</span> : null}
			<div className="status-options" role="radiogroup" aria-label="テスト結果">
				{APP_TEST_RESULT_OUTCOME_OPTIONS.map((outcome) => (
					<label
						key={outcome}
						className={`status-option ${OUTCOME_STYLE_CLASS[outcome]}`}
					>
						<input
							type="radio"
							name="outcome"
							value={outcome}
							form={formId}
							defaultChecked={outcome === current}
						/>
						<StatusIcon status={OUTCOME_ICON[outcome]} />
						<span>{APP_TEST_RESULT_OUTCOME_LABEL[outcome]}</span>
					</label>
				))}
			</div>
		</div>
	);
}

export const APP_TEST_OUTCOME_STYLE_CLASS = OUTCOME_STYLE_CLASS;
export const APP_TEST_OUTCOME_ICON = OUTCOME_ICON;

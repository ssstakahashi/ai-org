import { StatusIcon } from "@/components/StatusIcon";
import {
	APP_REQUIREMENT_STATUS_LABEL,
	APP_REQUIREMENT_STATUS_OPTIONS,
	type AppRequirementStatus,
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
	selectedStatus?: AppRequirementStatus;
	defaultStatus?: AppRequirementStatus;
	formId?: string;
	variant?: "default" | "table";
};

export function AppRequirementStatusField({
	selectedStatus,
	defaultStatus = "draft",
	formId,
	variant = "default",
}: Props) {
	const current = selectedStatus ?? defaultStatus;

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
			{variant === "default" ? <span>ステータス</span> : null}
			<div className="status-options" role="radiogroup" aria-label="ステータス">
				{APP_REQUIREMENT_STATUS_OPTIONS.map((status) => (
					<label
						key={status}
						className={`status-option ${STATUS_STYLE_CLASS[status]}`}
					>
						<input
							type="radio"
							name="status"
							value={status}
							form={formId}
							defaultChecked={status === current}
						/>
						<StatusIcon status={STATUS_ICON[status]} />
						<span>{APP_REQUIREMENT_STATUS_LABEL[status]}</span>
					</label>
				))}
			</div>
		</div>
	);
}

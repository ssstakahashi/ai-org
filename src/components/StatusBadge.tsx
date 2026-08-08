import { StatusIcon } from "@/components/StatusIcon";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";

type Props = {
	status: TaskStatus;
	className?: string;
};

export function StatusBadge({ status, className = "" }: Props) {
	return (
		<span
			className={`status-badge status-${status}${className ? ` ${className}` : ""}`}
		>
			<StatusIcon status={status} />
			{TASK_STATUS_LABEL[status]}
		</span>
	);
}

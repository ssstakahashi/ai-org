import { CompleteTaskButton } from "@/components/CompleteTaskButton";
import { StatusIcon } from "@/components/StatusIcon";
import { employeeTintStyle, tintStyle } from "@/lib/colors";
import { formatPeriodLabel } from "@/lib/task-views";
import { TASK_STATUS_LABEL, type TaskWithEmployee } from "@/lib/types";

type Props = {
	tasks: TaskWithEmployee[];
	empty: string;
};

export function TodayTaskList({ tasks, empty }: Props) {
	if (tasks.length === 0) {
		return <p className="empty">{empty}</p>;
	}

	return (
		<ul className="task-list">
			{tasks.map((task) => (
				<li key={task.id} className={`task-item status-${task.status}`}>
					<div className="task-main">
						<div className="task-meta">
							<span className={`status-badge status-${task.status}`}>
								<StatusIcon status={task.status} />
								{TASK_STATUS_LABEL[task.status]}
							</span>
							<span
								className="employee"
								style={employeeTintStyle(task.employee_color, task.employee_text_color)}
							>
								{task.employee_name}
							</span>
							{task.category_name ? (
								<span className="badge badge-category" style={tintStyle(task.category_color)}>
									{task.category_name}
								</span>
							) : null}
							<span className="when">{formatPeriodLabel(task)}</span>
						</div>
						<h2 className={task.status === "done" ? "task-done-strike" : undefined}>{task.title}</h2>
					</div>
					{task.status !== "done" ? (
						<div className="task-actions">
							<CompleteTaskButton taskId={task.id} />
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}

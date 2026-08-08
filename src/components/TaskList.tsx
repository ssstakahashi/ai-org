import { deleteTask, updateTaskStatus } from "@/app/actions";
import { masterTintStyle, tintStyle } from "@/lib/colors";
import { formatInAppTz } from "@/lib/timezone";
import { TASK_STATUS_LABEL, type TaskStatus, type TaskWithEmployee } from "@/lib/types";

type Props = {
	tasks: TaskWithEmployee[];
};

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
	draft: "approved",
	approved: "scheduled",
	scheduled: "done",
	failed: "draft",
};

function formatWhen(value: string | null) {
	if (!value) return "—";
	const formatted = formatInAppTz(value, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	return formatted || value;
}

export function TaskList({ tasks }: Props) {
	if (tasks.length === 0) {
		return <p className="empty">まだタスクがありません。上のフォームから追加してください。</p>;
	}

	return (
		<ul className="task-list">
			{tasks.map((task) => {
				const next = NEXT_STATUS[task.status];
				return (
					<li key={task.id} className={`task-item status-${task.status}`}>
						<div className="task-main">
							<div className="task-meta">
								<span className="badge">{TASK_STATUS_LABEL[task.status]}</span>
								{task.category_name ? (
									<span
										className="badge badge-category"
										style={tintStyle(task.category_color)}
									>
										{task.category_name}
									</span>
								) : null}
								<span className="employee" style={tintStyle(task.employee_color)}>
									{task.employee_name}
								</span>
								<span className="when">{formatWhen(task.start_at)}</span>
							</div>
							{task.tags.length > 0 ? (
								<ul className="tag-list">
									{task.tags.map((tag) => (
										<li key={tag.id} className="tag-chip" style={masterTintStyle(tag.color, tag.text_color)}>
											{tag.name}
										</li>
									))}
								</ul>
							) : null}
							<h2>{task.title}</h2>
							{task.body ? <p className="body">{task.body}</p> : null}
							{task.notes ? <p className="notes">メモ: {task.notes}</p> : null}
							{task.image_key ? <p className="image-key">画像: {task.image_key}</p> : null}
						</div>
						<div className="task-actions">
							{next ? (
								<form action={updateTaskStatus}>
									<input type="hidden" name="id" value={task.id} />
									<input type="hidden" name="status" value={next} />
									<button type="submit">→ {TASK_STATUS_LABEL[next]}</button>
								</form>
							) : null}
							{task.status !== "failed" && task.status !== "done" ? (
								<form action={updateTaskStatus}>
									<input type="hidden" name="id" value={task.id} />
									<input type="hidden" name="status" value="failed" />
									<button type="submit" className="danger">
										失敗
									</button>
								</form>
							) : null}
							<form action={deleteTask}>
								<input type="hidden" name="id" value={task.id} />
								<button type="submit" className="ghost">
									削除
								</button>
							</form>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

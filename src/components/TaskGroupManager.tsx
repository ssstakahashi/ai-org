import {
	createTaskGroup,
	deleteTaskGroup,
	updateTaskGroup,
} from "@/app/actions";
import { colorInputValue } from "@/lib/colors";
import type { TaskGroup } from "@/lib/types";

type Props = {
	taskGroups: TaskGroup[];
};

export function TaskGroupManager({ taskGroups }: Props) {
	return (
		<section className="panel">
			<h2>タスクグループ（{taskGroups.length}）</h2>
			<form action={createTaskGroup} className="inline-add-form">
				<input name="name" required placeholder="新しいグループ名" />
				<label className="color-field">
					<span className="sr-only">色</span>
					<input type="color" name="color" defaultValue={colorInputValue("")} />
				</label>
				<button type="submit" className="primary">
					追加
				</button>
			</form>
			{taskGroups.length === 0 ? (
				<p className="empty">タスクグループがありません。</p>
			) : (
				<ul className="master-list">
					{taskGroups.map((taskGroup) => (
						<li key={taskGroup.id} className="master-item">
							<form action={updateTaskGroup} className="master-edit-form">
								<input type="hidden" name="id" value={taskGroup.id} />
								<label>
									<span>名前</span>
									<input name="name" required defaultValue={taskGroup.name} />
								</label>
								<label className="color-field">
									<span>色</span>
									<input
										type="color"
										name="color"
										defaultValue={colorInputValue(taskGroup.color)}
									/>
								</label>
								<label className="sort-field">
									<span>並び</span>
									<input
										name="sort_order"
										type="number"
										defaultValue={taskGroup.sort_order}
									/>
								</label>
								<button type="submit">保存</button>
							</form>
							<form action={deleteTaskGroup}>
								<input type="hidden" name="id" value={taskGroup.id} />
								<button type="submit" className="ghost">
									削除
								</button>
							</form>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

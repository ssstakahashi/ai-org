"use client";

import { useEffect, useState, type DragEvent } from "react";
import {
	createAppCron,
	deleteAppCron,
	reorderAppCrons,
	updateAppCron,
} from "@/app/actions";
import type { AppCron } from "@/lib/types";

type Props = {
	crons: AppCron[];
};

function withSortOrders<T extends { id: string; sort_order: number }>(items: T[]): T[] {
	return items.map((item, index) => ({
		...item,
		sort_order: (index + 1) * 10,
	}));
}

export function AppCronsSheet({ crons: initialCrons }: Props) {
	const [crons, setCrons] = useState(initialCrons);
	const [draggingCronId, setDraggingCronId] = useState<string | null>(null);
	const [dropTargetCronId, setDropTargetCronId] = useState<string | null>(null);
	const [reorderingCrons, setReorderingCrons] = useState(false);

	useEffect(() => {
		setCrons(initialCrons);
	}, [initialCrons]);

	async function moveCron(sourceId: string, targetId: string) {
		if (sourceId === targetId || reorderingCrons) return;

		const fromIndex = crons.findIndex((cron) => cron.id === sourceId);
		const toIndex = crons.findIndex((cron) => cron.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...crons];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		const ordered = withSortOrders(next);
		setCrons(ordered);
		setReorderingCrons(true);
		try {
			await reorderAppCrons(ordered.map((cron) => cron.id));
		} catch (error) {
			setCrons(initialCrons);
			throw error;
		} finally {
			setReorderingCrons(false);
		}
	}

	function onCronDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingCronId(id);
	}

	function onCronDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetCronId !== id) setDropTargetCronId(id);
	}

	async function onCronDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
		event.preventDefault();
		const sourceId = event.dataTransfer.getData("text/plain") || draggingCronId;
		setDraggingCronId(null);
		setDropTargetCronId(null);
		if (!sourceId) return;
		await moveCron(sourceId, targetId);
	}

	function onCronDragEnd() {
		setDraggingCronId(null);
		setDropTargetCronId(null);
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<h2>cron（{crons.length}）</h2>
			</div>

			<form action={createAppCron} className="inline-add-form">
				<input name="environment" placeholder="環境" />
				<input name="schedule" placeholder="スケジュール" />
				<input name="kind" placeholder="種別" />
				<input name="target" placeholder="対象" />
				<button type="submit" className="primary">
					行を追加
				</button>
			</form>

			{crons.length === 0 ? (
				<p className="empty">cron の登録はまだありません。</p>
			) : (
				<div className="x-schedule-scroll">
					<p className="field-hint apps-sheet-hint">
						左のハンドルをドラッグして表示順を変更できます。
					</p>
					<table className="x-schedule-table apps-sheet-table">
						<thead>
							<tr>
								<th>並び</th>
								<th>環境</th>
								<th>スケジュール</th>
								<th>種別</th>
								<th>対象</th>
								<th>備考</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody>
							{crons.map((cron) => {
								const formId = `cron-edit-${cron.id}`;
								const isDragging = draggingCronId === cron.id;
								const isDropTarget =
									dropTargetCronId === cron.id && draggingCronId !== cron.id;
								return (
									<tr
										key={cron.id}
										className={[
											isDragging ? "is-dragging" : "",
											isDropTarget ? "is-drop-target" : "",
										]
											.filter(Boolean)
											.join(" ")}
										onDragOver={(event) => onCronDragOver(event, cron.id)}
										onDrop={(event) => void onCronDrop(event, cron.id)}
										onDragLeave={() => {
											if (dropTargetCronId === cron.id) {
												setDropTargetCronId(null);
											}
										}}
									>
										<td>
											<button
												type="button"
												className="apps-sheet-drag-handle"
												draggable={!reorderingCrons}
												aria-label="cron を並び替え"
												title="ドラッグして並び替え"
												onDragStart={(event) => onCronDragStart(event, cron.id)}
												onDragEnd={onCronDragEnd}
											>
												<span aria-hidden="true">⋮⋮</span>
											</button>
											<form id={formId} action={updateAppCron}>
												<input type="hidden" name="id" value={cron.id} />
											</form>
										</td>
										<td>
											<input
												form={formId}
												name="environment"
												defaultValue={cron.environment}
												aria-label="環境"
											/>
										</td>
										<td>
											<input
												form={formId}
												name="schedule"
												defaultValue={cron.schedule}
												aria-label="スケジュール"
											/>
										</td>
										<td>
											<input
												form={formId}
												name="kind"
												defaultValue={cron.kind}
												aria-label="種別"
											/>
										</td>
										<td>
											<input
												form={formId}
												name="target"
												defaultValue={cron.target}
												aria-label="対象"
											/>
										</td>
										<td>
											<input
												form={formId}
												name="notes"
												defaultValue={cron.notes}
												aria-label="備考"
											/>
										</td>
										<td>
											<div className="task-actions">
												<button form={formId} type="submit">
													保存
												</button>
												<form action={deleteAppCron}>
													<input type="hidden" name="id" value={cron.id} />
													<button type="submit" className="ghost">
														削除
													</button>
												</form>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

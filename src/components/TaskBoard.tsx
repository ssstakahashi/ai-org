"use client";

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	getGanttScrollLeft,
	saveGanttScrollLeft,
} from "@/lib/gantt-scroll-storage";
import { setTaskStatus } from "@/app/actions";
import { employeeTintStyle, masterTintStyle, tintStyle } from "@/lib/colors";
import {
	TASK_STATUS_LABEL,
	type TaskStatus,
	type TaskWithEmployee,
} from "@/lib/types";
import {
	addDays,
	addMonths,
	buildMonthCells,
	formatMonthLabel,
	formatPeriodLabel,
	ganttRangeForMonth,
	ganttSpanInDays,
	parseDateKey,
	startOfMonth,
	taskCoversDate,
	taskOverlapsMonth,
	taskPeriod,
	showsInUnscheduledList,
	showsOnScheduleBoard,
	toDateKey,
} from "@/lib/task-views";
import { getZonedParts } from "@/lib/timezone";

type ViewKey = "calendar" | "gantt" | "kanban";

type Props = {
	tasks: TaskWithEmployee[];
	onDayClick?: (dateKey: string) => void;
	onTaskClick?: (task: TaskWithEmployee) => void;
};

const VIEWS: { key: ViewKey; label: string }[] = [
	{ key: "calendar", label: "カレンダー" },
	{ key: "gantt", label: "ガント" },
	{ key: "kanban", label: "看板" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const KANBAN_COLUMNS: TaskStatus[] = ["draft", "approved", "scheduled", "done", "failed"];

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
	draft: "approved",
	approved: "scheduled",
	scheduled: "done",
	failed: "draft",
};

export function TaskBoard({ tasks, onDayClick, onTaskClick }: Props) {
	const [view, setView] = useState<ViewKey>("calendar");
	const [month, setMonth] = useState(() => startOfMonth(new Date()));

	const unscheduled = useMemo(
		() => tasks.filter(showsInUnscheduledList),
		[tasks],
	);

	const monthTasks = useMemo(
		() => tasks.filter((task) => showsOnScheduleBoard(task) && taskOverlapsMonth(task, month)),
		[tasks, month],
	);

	return (
		<div className="task-board">
			<div className="view-tabs" role="tablist" aria-label="表示切替">
				{VIEWS.map((item) => (
					<button
						key={item.key}
						type="button"
						role="tab"
						aria-selected={view === item.key}
						className={view === item.key ? "view-tab active" : "view-tab"}
						onClick={() => setView(item.key)}
					>
						{item.label}
					</button>
				))}
			</div>

			{(view === "calendar" || view === "gantt") && (
				<div className="view-toolbar">
					<div className="view-toolbar-side view-toolbar-start">
						<button type="button" onClick={() => setMonth((m) => addMonths(m, -1))}>
							前月
						</button>
					</div>
					<p className="view-month">{formatMonthLabel(month)}</p>
					<div className="view-toolbar-side view-toolbar-end">
						<button type="button" onClick={() => setMonth((m) => addMonths(m, 1))}>
							翌月
						</button>
						<button
							type="button"
							className="ghost"
							onClick={() => setMonth(startOfMonth(new Date()))}
						>
							今月
						</button>
					</div>
				</div>
			)}

			{view === "calendar" ? (
				<CalendarView
					month={month}
					tasks={monthTasks}
					unscheduled={unscheduled}
					onDayClick={onDayClick}
					onTaskClick={onTaskClick}
				/>
			) : null}
			{view === "gantt" ? (
				<GanttView
					month={month}
					tasks={monthTasks}
					unscheduled={unscheduled}
					onTaskClick={onTaskClick}
				/>
			) : null}
			{view === "kanban" ? (
				<KanbanView tasks={tasks} onTaskClick={onTaskClick} />
			) : null}
		</div>
	);
}

function CalendarView({
	month,
	tasks,
	unscheduled,
	onDayClick,
	onTaskClick,
}: {
	month: Date;
	tasks: TaskWithEmployee[];
	unscheduled: TaskWithEmployee[];
	onDayClick?: (dateKey: string) => void;
	onTaskClick?: (task: TaskWithEmployee) => void;
}) {
	const cells = buildMonthCells(month);
	const byDay = useMemo(() => {
		const map = new Map<string, TaskWithEmployee[]>();
		for (const task of tasks) {
			const period = taskPeriod(task);
			if (!period) continue;
			let cursor = period.start;
			while (cursor <= period.end) {
				const list = map.get(cursor) ?? [];
				list.push(task);
				map.set(cursor, list);
				cursor = toDateKey(addDays(parseDateKey(cursor), 1));
			}
		}
		return map;
	}, [tasks]);

	const todayKey = toDateKey(new Date());

	return (
		<div className="calendar-view">
			<div className="calendar-weekdays">
				{WEEKDAYS.map((label) => (
					<div key={label} className="calendar-weekday">
						{label}
					</div>
				))}
			</div>
			<div className="calendar-grid">
				{cells.map((day, index) => {
					if (!day) {
						return <div key={`empty-${index}`} className="calendar-cell empty" />;
					}
					const key = toDateKey(day);
					const dayTasks = byDay.get(key) ?? [];
					return (
						<div
							key={key}
							role="button"
							tabIndex={0}
							className={
								key === todayKey
									? "calendar-cell today clickable"
									: "calendar-cell clickable"
							}
							onClick={() => onDayClick?.(key)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onDayClick?.(key);
								}
							}}
							aria-label={`${key} にタスクを追加`}
						>
							<span className="calendar-day">{getZonedParts(day).day}</span>
							<ul
								className="calendar-events"
								onClick={(event) => event.stopPropagation()}
							>
								{dayTasks.map((task) => {
									const period = taskPeriod(task);
									const isStart = period?.start === key;
									const isMulti = period ? period.start !== period.end : false;
									return (
										<li
											key={task.id}
											role={onTaskClick ? "button" : undefined}
											tabIndex={onTaskClick ? 0 : undefined}
											className={`calendar-event status-${task.status}${isMulti ? " multi-day" : ""}${isStart ? " is-start" : ""}${onTaskClick ? " clickable" : ""}`}
											onClick={(event) => {
												if (!onTaskClick) return;
												event.stopPropagation();
												onTaskClick(task);
											}}
											onKeyDown={(event) => {
												if (!onTaskClick) return;
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													event.stopPropagation();
													onTaskClick(task);
												}
											}}
											aria-label={onTaskClick ? `${task.title} の詳細` : undefined}
										>
											<span className="calendar-event-title">{task.title}</span>
											{isStart && task.category_name ? (
												<span
													className="calendar-event-cat"
													style={tintStyle(task.category_color)}
												>
													{task.category_name}
												</span>
											) : null}
											{isStart && task.tags.length > 0 ? (
												<ul className="tag-list calendar-event-tags">
													{task.tags.map((tag) => (
														<li
															key={tag.id}
															className="tag-chip"
															style={masterTintStyle(tag.color, tag.text_color)}
														>
															{tag.name}
														</li>
													))}
												</ul>
											) : null}
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</div>
			{unscheduled.length > 0 ? (
				<div className="unscheduled-block">
					<h3>日付未定（{unscheduled.length}）</h3>
					<ul className="unscheduled-list">
						{unscheduled.map((task) => (
							<li key={task.id}>
								{onTaskClick ? (
									<button
										type="button"
										className="unscheduled-edit"
										onClick={() => onTaskClick(task)}
									>
										<span className="badge">{TASK_STATUS_LABEL[task.status]}</span>
										{task.category_name ? (
											<span
												className="badge badge-category"
												style={tintStyle(task.category_color)}
											>
												{task.category_name}
											</span>
										) : null}
										{task.tags.map((tag) => (
											<span
												key={tag.id}
												className="tag-chip"
												style={masterTintStyle(tag.color, tag.text_color)}
											>
												{tag.name}
											</span>
										))}
										<span className={task.status === "done" ? "task-done-strike" : undefined}>
											{task.title}
										</span>
										<span className="employee" style={employeeTintStyle(task.employee_color, task.employee_text_color)}>
											{task.employee_name}
										</span>
										<span className="muted">詳細</span>
									</button>
								) : (
									<>
										<span className="badge">{TASK_STATUS_LABEL[task.status]}</span>
										{task.category_name ? (
											<span
												className="badge badge-category"
												style={tintStyle(task.category_color)}
											>
												{task.category_name}
											</span>
										) : null}
										{task.tags.map((tag) => (
											<span
												key={tag.id}
												className="tag-chip"
												style={masterTintStyle(tag.color, tag.text_color)}
											>
												{tag.name}
											</span>
										))}
										<span className={task.status === "done" ? "task-done-strike" : undefined}>
											{task.title}
										</span>
										<span className="employee" style={employeeTintStyle(task.employee_color, task.employee_text_color)}>
											{task.employee_name}
										</span>
									</>
								)}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

function GanttView({
	month,
	tasks,
	unscheduled,
	onTaskClick,
}: {
	month: Date;
	tasks: TaskWithEmployee[];
	unscheduled: TaskWithEmployee[];
	onTaskClick?: (task: TaskWithEmployee) => void;
}) {
	const { days } = ganttRangeForMonth(month);
	const todayKey = toDateKey(new Date());
	const monthKey = toDateKey(startOfMonth(month)).slice(0, 7);
	const scrollRef = useRef<HTMLDivElement>(null);
	const restoringRef = useRef(false);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sorted = useMemo(
		() =>
			[...tasks].sort((a, b) => {
				const pa = taskPeriod(a);
				const pb = taskPeriod(b);
				return String(pa?.start).localeCompare(String(pb?.start));
			}),
		[tasks],
	);

	const persistScroll = useCallback(() => {
		if (restoringRef.current) return;
		const el = scrollRef.current;
		if (!el) return;
		saveGanttScrollLeft(monthKey, el.scrollLeft);
	}, [monthKey]);

	const handleScroll = useCallback(() => {
		if (restoringRef.current) return;
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(persistScroll, 100);
	}, [persistScroll]);

	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const saved = getGanttScrollLeft(monthKey);
		if (saved == null) return;
		restoringRef.current = true;
		el.scrollLeft = saved;
		requestAnimationFrame(() => {
			restoringRef.current = false;
		});
	}, [monthKey, sorted.length]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			persistScroll();
		};
	}, [persistScroll]);

	return (
		<div className="gantt-view">
			{sorted.length === 0 ? (
				<p className="empty">この月に期間のあるタスクはありません。</p>
			) : (
				<div className="gantt-scroll" ref={scrollRef} onScroll={handleScroll}>
					<table className="gantt-table">
						<thead>
							<tr>
								<th className="gantt-label-col">タスク</th>
								{days.map((day) => {
									const key = toDateKey(day);
									const parts = getZonedParts(day);
									return (
										<th
											key={key}
											className={key === todayKey ? "gantt-day today" : "gantt-day"}
										>
											<span>{parts.day}</span>
											<small>{WEEKDAYS[parts.weekday]}</small>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{sorted.map((task) => {
								const span = ganttSpanInDays(task, days);
								const cells: ReactNode[] = [];
								let i = 0;
								while (i < days.length) {
									const dayKey = toDateKey(days[i]);
									if (span && i === span.startIndex) {
										const length = span.endIndex - span.startIndex + 1;
										cells.push(
											<td
												key={`${task.id}-bar`}
												colSpan={length}
												className={
													dayKey === todayKey || taskCoversDate(task, todayKey)
														? "gantt-cell gantt-span today"
														: "gantt-cell gantt-span"
												}
											>
												<button
													type="button"
													className={`gantt-bar continuous status-${task.status}${onTaskClick ? " clickable" : ""}`}
													title={`${task.title}（${formatPeriodLabel(task)}）`}
													onClick={() => onTaskClick?.(task)}
												>
													{task.title}
												</button>
											</td>,
										);
										i += length;
										continue;
									}
									cells.push(
										<td
											key={dayKey}
											className={dayKey === todayKey ? "gantt-cell today" : "gantt-cell"}
										/>,
									);
									i += 1;
								}

								return (
									<tr key={task.id}>
										<td className="gantt-label-col">
											{onTaskClick ? (
												<button
													type="button"
													className={`gantt-task-meta clickable status-${task.status}`}
													onClick={() => onTaskClick(task)}
												>
													<span className="gantt-task-title">{task.title}</span>
													<span className="muted">
														{TASK_STATUS_LABEL[task.status]}
														{task.category_name ? ` · ${task.category_name}` : ""}
														{` · ${formatPeriodLabel(task)}`}
													</span>
												</button>
											) : (
												<div className={`gantt-task-meta status-${task.status}`}>
													<span className="gantt-task-title">{task.title}</span>
													<span className="muted">
														{TASK_STATUS_LABEL[task.status]}
														{task.category_name ? ` · ${task.category_name}` : ""}
														{` · ${formatPeriodLabel(task)}`}
													</span>
												</div>
											)}
										</td>
										{cells}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			{unscheduled.length > 0 ? (
				<div className="unscheduled-block">
					<h3>日付未定（{unscheduled.length}）</h3>
					<ul className="unscheduled-list">
						{unscheduled.map((task) => (
							<li key={task.id}>
								{onTaskClick ? (
									<button
										type="button"
										className="unscheduled-edit"
										onClick={() => onTaskClick(task)}
									>
										<span className="badge">{TASK_STATUS_LABEL[task.status]}</span>
										<span className={task.status === "done" ? "task-done-strike" : undefined}>
											{task.title}
										</span>
										<span className="muted">詳細</span>
									</button>
								) : (
									<>
										<span className="badge">{TASK_STATUS_LABEL[task.status]}</span>
										<span className={task.status === "done" ? "task-done-strike" : undefined}>
											{task.title}
										</span>
									</>
								)}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

function KanbanView({
	tasks,
	onTaskClick,
}: {
	tasks: TaskWithEmployee[];
	onTaskClick?: (task: TaskWithEmployee) => void;
}) {
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const byStatus = useMemo(() => {
		const map = Object.fromEntries(
			KANBAN_COLUMNS.map((status) => [status, [] as TaskWithEmployee[]]),
		) as Record<TaskStatus, TaskWithEmployee[]>;
		for (const task of tasks) {
			map[task.status].push(task);
		}
		return map;
	}, [tasks]);

	async function moveToStatus(taskId: string, status: TaskStatus) {
		setPending(true);
		try {
			await setTaskStatus(taskId, status);
		} finally {
			setPending(false);
			setDraggingId(null);
		}
	}

	return (
		<div className={`kanban-board${pending ? " is-pending" : ""}`}>
			{KANBAN_COLUMNS.map((status) => (
				<section
					key={status}
					className="kanban-column"
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event) => {
						event.preventDefault();
						const id = event.dataTransfer.getData("text/task-id") || draggingId;
						if (!id) return;
						const task = tasks.find((item) => item.id === id);
						if (!task || task.status === status) return;
						void moveToStatus(id, status);
					}}
				>
					<header className="kanban-column-head">
						<h3>{TASK_STATUS_LABEL[status]}</h3>
						<span className="kanban-count">{byStatus[status].length}</span>
					</header>
					<ul className="kanban-cards">
						{byStatus[status].map((task) => {
							const next = NEXT_STATUS[task.status];
							const periodLabel = formatPeriodLabel(task);
							return (
								<li
									key={task.id}
									className={`kanban-card status-${task.status}${onTaskClick ? " clickable" : ""}`}
									draggable={!pending}
									onDragStart={(event) => {
										setDraggingId(task.id);
										event.dataTransfer.setData("text/task-id", task.id);
										event.dataTransfer.effectAllowed = "move";
									}}
									onDragEnd={() => setDraggingId(null)}
									onClick={() => onTaskClick?.(task)}
								>
									<div className="kanban-card-meta">
										{task.category_name ? (
											<span
												className="badge badge-category"
												style={tintStyle(task.category_color)}
											>
												{task.category_name}
											</span>
										) : null}
										<span className="employee" style={employeeTintStyle(task.employee_color, task.employee_text_color)}>
											{task.employee_name}
										</span>
									</div>
									<p className="kanban-card-title">{task.title}</p>
									{task.tags.length > 0 ? (
										<ul className="tag-list">
											{task.tags.map((tag) => (
												<li key={tag.id} className="tag-chip" style={masterTintStyle(tag.color, tag.text_color)}>
													{tag.name}
												</li>
											))}
										</ul>
									) : null}
									{periodLabel ? <p className="muted kanban-when">{periodLabel}</p> : null}
									{next ? (
										<button
											type="button"
											className="kanban-advance"
											disabled={pending}
											onClick={(event) => {
												event.stopPropagation();
												void moveToStatus(task.id, next);
											}}
										>
											→ {TASK_STATUS_LABEL[next]}
										</button>
									) : null}
								</li>
							);
						})}
					</ul>
				</section>
			))}
		</div>
	);
}

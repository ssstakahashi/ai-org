import type { TaskWithEmployee } from "@/lib/types";
import {
	addAppCalendarDays,
	formatInAppTz,
	fromZonedParts,
	getZonedParts,
	startOfAppDay,
	startOfAppMonth,
	toAppDateKey,
} from "@/lib/timezone";

/** 表示用の日付キー（日本時間 YYYY-MM-DD） */
export function toDateKey(value: string | Date): string {
	return toAppDateKey(value);
}

export function parseDateKey(key: string): Date {
	const [y, m, d] = key.split("-").map(Number);
	return fromZonedParts({
		year: y,
		month: m,
		day: d,
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});
}

export function startOfMonth(date: Date): Date {
	return startOfAppMonth(date);
}

export function addMonths(date: Date, delta: number): Date {
	const p = getZonedParts(date);
	const utc = new Date(Date.UTC(p.year, p.month - 1 + delta, 1));
	return fromZonedParts({
		year: utc.getUTCFullYear(),
		month: utc.getUTCMonth() + 1,
		day: 1,
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});
}

export function addDays(date: Date, delta: number): Date {
	return addAppCalendarDays(date, delta);
}

export function daysInMonth(date: Date): number {
	const p = getZonedParts(date);
	return new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
}

/** 日曜始まりの月カレンダー格子 */
export function buildMonthCells(month: Date): (Date | null)[] {
	const first = startOfMonth(month);
	const total = daysInMonth(month);
	const lead = getZonedParts(first).weekday;
	const cells: (Date | null)[] = [];
	for (let i = 0; i < lead; i++) cells.push(null);
	const firstParts = getZonedParts(first);
	for (let day = 1; day <= total; day++) {
		cells.push(
			fromZonedParts({
				year: firstParts.year,
				month: firstParts.month,
				day,
				hour: 0,
				minute: 0,
				second: 0,
				millisecond: 0,
			}),
		);
	}
	while (cells.length % 7 !== 0) cells.push(null);
	return cells;
}

export type TaskPeriod = {
	start: string;
	end: string;
};

/** start_at/end_at があれば期間として扱う */
export function taskPeriod(task: TaskWithEmployee): TaskPeriod | null {
	if (task.start_at || task.end_at) {
		const start = toDateKey(task.start_at ?? task.end_at ?? "");
		const end = toDateKey(task.end_at ?? task.start_at ?? "");
		if (!start || !end) return null;
		return start <= end ? { start, end } : { start: end, end: start };
	}
	return null;
}

export function taskCoversDate(task: TaskWithEmployee, dateKey: string): boolean {
	const period = taskPeriod(task);
	if (!period) return false;
	return period.start <= dateKey && dateKey <= period.end;
}

export function taskOverlapsMonth(task: TaskWithEmployee, month: Date): boolean {
	const period = taskPeriod(task);
	if (!period) return false;
	const monthStart = toDateKey(startOfMonth(month));
	const monthParts = getZonedParts(month);
	const lastDay = daysInMonth(month);
	const monthEnd = `${monthParts.year}-${String(monthParts.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
	return period.start <= monthEnd && period.end >= monthStart;
}

export function formatMonthLabel(date: Date): string {
	return formatInAppTz(date, {
		year: "numeric",
		month: "long",
	});
}

export function formatShortTime(value: string | null): string {
	if (!value) return "";
	return formatInAppTz(value, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatPeriodLabel(task: TaskWithEmployee): string {
	const period = taskPeriod(task);
	if (!period) return "";
	if (period.start === period.end) {
		const time = formatShortTime(task.start_at);
		return time ? `${period.start} ${time}` : period.start;
	}
	return `${period.start} 〜 ${period.end}`;
}

export function eachDayInclusive(start: Date, end: Date): Date[] {
	const days: Date[] = [];
	let cursor = startOfAppDay(start);
	const last = startOfAppDay(end);
	while (cursor.getTime() <= last.getTime()) {
		days.push(new Date(cursor));
		cursor = addDays(cursor, 1);
	}
	return days;
}

export function ganttRangeForMonth(month: Date): { start: Date; end: Date; days: Date[] } {
	const start = startOfMonth(month);
	const monthParts = getZonedParts(month);
	const end = fromZonedParts({
		year: monthParts.year,
		month: monthParts.month,
		day: daysInMonth(month),
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});
	return { start, end, days: eachDayInclusive(start, end) };
}

/** ガント表示用: 月内にクランプした開始・終了インデックス */
export function ganttSpanInDays(
	task: TaskWithEmployee,
	days: Date[],
): { startIndex: number; endIndex: number } | null {
	const period = taskPeriod(task);
	if (!period || days.length === 0) return null;

	const firstKey = toDateKey(days[0]);
	const lastKey = toDateKey(days[days.length - 1]);
	if (period.end < firstKey || period.start > lastKey) return null;

	const clampedStart = period.start < firstKey ? firstKey : period.start;
	const clampedEnd = period.end > lastKey ? lastKey : period.end;

	let startIndex = -1;
	let endIndex = -1;
	for (let i = 0; i < days.length; i++) {
		const key = toDateKey(days[i]);
		if (key === clampedStart) startIndex = i;
		if (key === clampedEnd) endIndex = i;
	}
	if (startIndex < 0 || endIndex < 0) return null;
	return { startIndex, endIndex };
}

/** 繰り返しタスクの発生日を展開する（日本時間基準） */

import {
	addAppCalendarDays,
	addAppMonthsKeepDay,
	endOfAppDay,
	getZonedParts,
	parseAppDateTime,
	startOfAppDay,
} from "@/lib/timezone";
import type { RecurrenceEditScope } from "@/lib/types";

export type RecurrenceKind = "none" | "daily" | "weekly" | "monthly";

export const RECURRENCE_MAX = 366;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export { WEEKDAY_LABELS };

export type ExpandRecurrenceInput = {
	kind: RecurrenceKind;
	anchor: Date;
	weekdays: number[];
	until: Date | null;
	count: number | null;
};

export function expandRecurrenceDates(input: ExpandRecurrenceInput): Date[] {
	const { kind, anchor } = input;
	if (kind === "none") return [new Date(anchor)];

	const countLimit = input.count && input.count > 0 ? Math.min(input.count, RECURRENCE_MAX) : null;
	const untilLimit = input.until ? endOfAppDay(input.until).getTime() : null;

	if (!countLimit && untilLimit === null) {
		throw new Error("繰り返しには終了日または回数のいずれかが必要です");
	}

	const anchorParts = getZonedParts(anchor);
	const weekdays =
		input.weekdays.length > 0
			? [...new Set(input.weekdays)].sort()
			: [anchorParts.weekday];

	const results: Date[] = [];
	const dayOfMonth = anchorParts.day;
	let cursor = new Date(anchor);
	let guard = 0;
	const maxGuard = RECURRENCE_MAX * 40;

	while (results.length < (countLimit ?? RECURRENCE_MAX) && guard < maxGuard) {
		guard += 1;

		if (untilLimit !== null && cursor.getTime() > untilLimit) break;

		const cursorParts = getZonedParts(cursor);
		let include = false;
		if (kind === "daily") {
			include = true;
		} else if (kind === "weekly") {
			include = weekdays.includes(cursorParts.weekday);
		} else if (kind === "monthly") {
			include = true;
		}

		if (include) {
			results.push(new Date(cursor));
			if (countLimit !== null && results.length >= countLimit) break;
		}

		if (kind === "daily" || kind === "weekly") {
			cursor = addAppCalendarDays(cursor, 1);
		} else {
			cursor = addAppMonthsKeepDay(cursor, 1, dayOfMonth);
		}

		if (untilLimit === null && countLimit === null) break;
	}

	if (results.length === 0) {
		throw new Error("条件に合う繰り返し日がありません。曜日や期間を確認してください");
	}

	return results;
}

export function shiftDateKeepingDuration(
	baseStart: Date,
	baseEnd: Date,
	occurrenceStart: Date,
): { start: Date; end: Date } {
	const duration = Math.max(0, baseEnd.getTime() - baseStart.getTime());
	const start = new Date(occurrenceStart);
	const end = new Date(occurrenceStart.getTime() + duration);
	return { start, end };
}

export function parseRecurrenceKind(raw: string): RecurrenceKind {
	if (raw === "daily" || raw === "weekly" || raw === "monthly") return raw;
	return "none";
}

export function parseRecurrenceEditScope(raw: string): RecurrenceEditScope {
	if (raw === "future" || raw === "all") return raw;
	return "this";
}

export function parseWeekdays(values: string[]): number[] {
	return values
		.map((value) => Number.parseInt(value, 10))
		.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function parseOptionalDate(raw: string): Date | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		return startOfAppDay(parseAppDateTime(trimmed));
	} catch {
		throw new Error("終了日の形式が不正です");
	}
}

export function parseOptionalCount(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const count = Number.parseInt(trimmed, 10);
	if (!Number.isInteger(count) || count < 1) {
		throw new Error("回数は1以上の整数にしてください");
	}
	return Math.min(count, RECURRENCE_MAX);
}

/**
 * アプリ基準タイムゾーン。
 * Cloudflare Workers のローカル時刻は UTC のため、日時の解釈・表示は常にここを使う。
 */
export const APP_TIMEZONE = "Asia/Tokyo";

/** 日本は通年 UTC+9（DST なし） */
const APP_OFFSET = "+09:00";

const DATETIME_LOCAL_RE =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
	weekday: number;
};

const WEEKDAY_MAP: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function pad3(n: number): string {
	return String(n).padStart(3, "0");
}

/** datetime-local / date 入力を日本時間として解釈する */
export function parseAppDateTime(raw: string): Date {
	const trimmed = raw.trim();
	const match = DATETIME_LOCAL_RE.exec(trimmed);
	if (match) {
		const [, y, mo, d, h = "00", mi = "00", s = "00"] = match;
		const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${APP_OFFSET}`);
		if (Number.isNaN(date.getTime())) {
			throw new Error("日時が不正です");
		}
		return date;
	}

	const date = new Date(trimmed);
	if (Number.isNaN(date.getTime())) {
		throw new Error("日時が不正です");
	}
	return date;
}

/** 日本時間の暦要素を取り出す */
export function getZonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		weekday: "short",
	}).formatToParts(date);

	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return {
		year: Number(get("year")),
		month: Number(get("month")),
		day: Number(get("day")),
		hour: Number(get("hour")),
		minute: Number(get("minute")),
		second: Number(get("second")),
		millisecond: date.getMilliseconds(),
		weekday: WEEKDAY_MAP[get("weekday")] ?? 0,
	};
}

/** 日本時間の暦要素から Date（UTC 瞬間）を作る */
export function fromZonedParts(
	parts: Omit<ZonedParts, "weekday" | "millisecond"> & {
		millisecond?: number;
	},
): Date {
	const ms = parts.millisecond ?? 0;
	const date = new Date(
		`${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}.${pad3(ms)}${APP_OFFSET}`,
	);
	if (Number.isNaN(date.getTime())) {
		throw new Error("日時が不正です");
	}
	return date;
}

export function startOfAppDay(date: Date): Date {
	const p = getZonedParts(date);
	return fromZonedParts({
		year: p.year,
		month: p.month,
		day: p.day,
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});
}

export function endOfAppDay(date: Date): Date {
	const p = getZonedParts(date);
	return fromZonedParts({
		year: p.year,
		month: p.month,
		day: p.day,
		hour: 23,
		minute: 59,
		second: 59,
		millisecond: 999,
	});
}

/** 日本時間の暦日を加減する（時刻は維持） */
export function addAppCalendarDays(date: Date, days: number): Date {
	const p = getZonedParts(date);
	const utc = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12, 0, 0));
	return fromZonedParts({
		year: utc.getUTCFullYear(),
		month: utc.getUTCMonth() + 1,
		day: utc.getUTCDate(),
		hour: p.hour,
		minute: p.minute,
		second: p.second,
		millisecond: p.millisecond,
	});
}

/** 同じ「日」を保って月を進める（存在しない日は月末に丸める） */
export function addAppMonthsKeepDay(date: Date, months: number, dayOfMonth: number): Date {
	const p = getZonedParts(date);
	const anchor = new Date(Date.UTC(p.year, p.month - 1 + months, 1));
	const lastDay = new Date(
		Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
	).getUTCDate();
	const day = Math.min(dayOfMonth, lastDay);
	return fromZonedParts({
		year: anchor.getUTCFullYear(),
		month: anchor.getUTCMonth() + 1,
		day,
		hour: p.hour,
		minute: p.minute,
		second: p.second,
		millisecond: p.millisecond,
	});
}

/** 表示用の日付キー（日本時間 YYYY-MM-DD） */
export function toAppDateKey(value: string | Date): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const p = getZonedParts(date);
	return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** datetime-local 入力用（日本時間 YYYY-MM-DDTHH:mm） */
export function toAppDateTimeLocal(value: string | Date | null | undefined): string {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const p = getZonedParts(date);
	return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatInAppTz(
	value: string | Date,
	options: Intl.DateTimeFormatOptions,
	locale = "ja-JP",
): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(locale, {
		timeZone: APP_TIMEZONE,
		...options,
	}).format(date);
}

/** いまの日本時間の年月初日 */
export function startOfAppMonth(date: Date = new Date()): Date {
	const p = getZonedParts(date);
	return fromZonedParts({
		year: p.year,
		month: p.month,
		day: 1,
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});
}

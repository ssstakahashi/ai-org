import {
	addAppCalendarDays,
	parseAppDateTime,
	startOfAppDay,
	toAppDateKey,
} from "@/lib/timezone";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const ZONES_URL = "https://api.cloudflare.com/client/v4/zones";

type CloudflareApiResponse<T> = {
	success?: boolean;
	result?: T;
	errors?: { message?: string; code?: number }[];
};

type GraphqlResponse<T> = {
	data?: T;
	errors?: { message?: string }[];
};

export type CfZoneSummary = {
	id: string;
	name: string;
	status: string;
};

export type CfZoneTrafficDay = {
	date: string;
	requests: number;
	pageViews: number;
	bytes: number;
};

export type CfZonePathTraffic = {
	path: string;
	requests: number;
	visits: number;
	bytes: number;
};

export type CfZoneTrafficReport = {
	zone: CfZoneSummary;
	days: CfZoneTrafficDay[];
	topHtmlPaths: CfZonePathTraffic[];
	range: { since: string; until: string; dayCount: number };
};

/** Cloudflare から多めに取り、HTML っぽいパスに絞ったあと残す件数 */
export const WEB_ANALYTICS_TOP_HTML_PATHS_LIMIT = 20;

const TOP_PATHS_GRAPHQL_FETCH_LIMIT = 200;

const NON_HTML_PATH_EXTENSIONS = new Set([
	"avif",
	"css",
	"eot",
	"gif",
	"ico",
	"jpeg",
	"jpg",
	"js",
	"json",
	"map",
	"mjs",
	"mp3",
	"mp4",
	"pdf",
	"png",
	"svg",
	"ttf",
	"txt",
	"wasm",
	"webm",
	"webp",
	"woff",
	"woff2",
	"xml",
	"zip",
]);

/** 静的配信・ビルド成果物など、ページ HTML ではないパスを除外する */
export function isHtmlLikeClientRequestPath(path: string): boolean {
	const withoutQuery = path.split("?")[0]?.split("#")[0] ?? path;
	if (!withoutQuery || withoutQuery === "/") return true;

	const lower = withoutQuery.toLowerCase();
	if (lower.startsWith("/_next/") || lower.startsWith("/static/")) return false;

	const segments = withoutQuery.split("/");
	const last = segments[segments.length - 1] ?? "";
	if (!last) return true;

	const dotIndex = last.lastIndexOf(".");
	if (dotIndex <= 0) return true;

	const ext = last.slice(dotIndex + 1).toLowerCase();
	if (ext === "html" || ext === "htm") return true;
	return !NON_HTML_PATH_EXTENSIONS.has(ext);
}

export type CfWebAnalyticsSnapshot = {
	fetchedAt: string;
	rangeDays: number;
	zones: CfZoneTrafficReport[];
};

export class CloudflareAnalyticsConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CloudflareAnalyticsConfigError";
	}
}

export class CloudflareAnalyticsApiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CloudflareAnalyticsApiError";
	}
}

function explainCloudflareError(message: string): string {
	if (message.includes("zone.analytics.read") || message.includes("analytics.read")) {
		return "API トークンに Zone Analytics Read がありません。CF_ANALYTICS_API_TOKEN の権限に Analytics → Read を追加し、Zone Resources に対象ゾーン（または All zones）を含めてください。";
	}
	return message;
}

function parseZoneNameFilter(raw: string | undefined): Set<string> | null {
	if (!raw?.trim()) return null;
	const names = raw
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
	return names.length > 0 ? new Set(names) : null;
}

function appDateRange(dayCount: number): { since: string; until: string } {
	const today = startOfAppDay(new Date());
	const sinceDate = addAppCalendarDays(today, -(dayCount - 1));
	return { since: toAppDateKey(sinceDate), until: toAppDateKey(today) };
}

function appDateRangeAdaptiveTimes(dayCount: number): { datetimeGeq: string; datetimeLt: string } {
	const range = appDateRange(dayCount);
	const sinceStart = parseAppDateTime(`${range.since}T00:00:00`);
	const untilStart = parseAppDateTime(`${range.until}T00:00:00`);
	const untilExclusive = addAppCalendarDays(untilStart, 1);
	return { datetimeGeq: sinceStart.toISOString(), datetimeLt: untilExclusive.toISOString() };
}

async function cfRestGet<T>(apiToken: string, url: string): Promise<T> {
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${apiToken}` },
	});
	const payload = (await response.json()) as CloudflareApiResponse<T>;
	if (!response.ok || payload.success === false) {
		const message =
			payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
			`Cloudflare API error (${response.status})`;
		throw new CloudflareAnalyticsApiError(explainCloudflareError(message));
	}
	return payload.result as T;
}

async function cfGraphql<TData>(
	apiToken: string,
	query: string,
	variables: Record<string, unknown>,
): Promise<TData> {
	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, variables }),
	});

	const payload = (await response.json()) as GraphqlResponse<TData>;
	if (!response.ok) {
		throw new CloudflareAnalyticsApiError(`GraphQL HTTP error (${response.status})`);
	}
	if (payload.errors?.length) {
		const message = payload.errors.map((error) => error.message).filter(Boolean).join("; ");
		throw new CloudflareAnalyticsApiError(explainCloudflareError(message));
	}
	if (!payload.data) {
		throw new CloudflareAnalyticsApiError("GraphQL response had no data");
	}
	return payload.data;
}

export async function listCloudflareZones(apiToken: string): Promise<CfZoneSummary[]> {
	const zones: CfZoneSummary[] = [];
	let page = 1;
	const perPage = 50;

	while (page <= 20) {
		const result = await cfRestGet<
			{ id: string; name: string; status: string }[]
		>(apiToken, `${ZONES_URL}?per_page=${perPage}&page=${page}&status=active`);
		for (const zone of result) {
			zones.push({ id: zone.id, name: zone.name, status: zone.status });
		}
		if (result.length < perPage) break;
		page += 1;
	}

	return zones.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

const DAILY_TRAFFIC_QUERY = `
query ZoneDailyTraffic($zoneTag: string, $since: Date, $until: Date) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequests1dGroups(
        limit: 10000
        filter: { date_geq: $since, date_leq: $until }
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        sum { requests pageViews bytes }
      }
    }
  }
}
`;

type DailyTrafficQueryResult = {
	viewer: {
		zones: {
			httpRequests1dGroups: {
				dimensions: { date: string };
				sum: { requests: number; pageViews: number; bytes: number };
			}[];
		}[];
	};
};

const TOP_PATHS_QUERY = `
query ZoneTopPaths($zoneTag: String!, $datetimeGeq: Time!, $datetimeLt: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(
        limit: ${TOP_PATHS_GRAPHQL_FETCH_LIMIT}
        orderBy: [count_DESC]
        filter: {
          datetime_geq: $datetimeGeq
          datetime_lt: $datetimeLt
          requestSource: "eyeball"
        }
      ) {
        count
        sum { visits edgeResponseBytes }
        dimensions { clientRequestPath }
      }
    }
  }
}
`;

type TopPathsQueryResult = {
	viewer: {
		zones: {
			httpRequestsAdaptiveGroups: {
				count: number;
				sum: { visits: number; edgeResponseBytes: number };
				dimensions: { clientRequestPath: string };
			}[];
		}[];
	};
};

export function pickTopHtmlPaths(
	groups: TopPathsQueryResult["viewer"]["zones"][0]["httpRequestsAdaptiveGroups"],
	limit = WEB_ANALYTICS_TOP_HTML_PATHS_LIMIT,
): CfZonePathTraffic[] {
	const rows: CfZonePathTraffic[] = [];
	for (const group of groups) {
		const path = group.dimensions.clientRequestPath;
		if (!path || !isHtmlLikeClientRequestPath(path)) continue;
		rows.push({
			path,
			requests: group.count ?? 0,
			visits: group.sum.visits ?? 0,
			bytes: group.sum.edgeResponseBytes ?? 0,
		});
		if (rows.length >= limit) break;
	}
	return rows;
}

async function fetchZoneTopHtmlPaths(
	apiToken: string,
	zoneId: string,
	dayCount: number,
): Promise<CfZonePathTraffic[]> {
	const times = appDateRangeAdaptiveTimes(dayCount);
	const data = await cfGraphql<TopPathsQueryResult>(apiToken, TOP_PATHS_QUERY, {
		zoneTag: zoneId,
		datetimeGeq: times.datetimeGeq,
		datetimeLt: times.datetimeLt,
	});
	const groups = data.viewer.zones[0]?.httpRequestsAdaptiveGroups ?? [];
	return pickTopHtmlPaths(groups);
}

export async function fetchZoneDailyTraffic(
	apiToken: string,
	zone: CfZoneSummary,
	dayCount: number,
): Promise<CfZoneTrafficReport> {
	const range = appDateRange(dayCount);
	const [dailyData, topHtmlPaths] = await Promise.all([
		cfGraphql<DailyTrafficQueryResult>(apiToken, DAILY_TRAFFIC_QUERY, {
			zoneTag: zone.id,
			since: range.since,
			until: range.until,
		}),
		fetchZoneTopHtmlPaths(apiToken, zone.id, dayCount),
	]);

	const groups = dailyData.viewer.zones[0]?.httpRequests1dGroups ?? [];
	const days = groups.map((group) => ({
		date: group.dimensions.date,
		requests: group.sum.requests ?? 0,
		pageViews: group.sum.pageViews ?? 0,
		bytes: group.sum.bytes ?? 0,
	}));

	return {
		zone,
		days,
		topHtmlPaths,
		range: { ...range, dayCount },
	};
}

function sumDays(days: CfZoneTrafficDay[]) {
	return days.reduce(
		(acc, day) => ({
			requests: acc.requests + day.requests,
			pageViews: acc.pageViews + day.pageViews,
			bytes: acc.bytes + day.bytes,
		}),
		{ requests: 0, pageViews: 0, bytes: 0 },
	);
}

export function aggregateZoneTraffic(days: CfZoneTrafficDay[]) {
	return sumDays(days);
}

function getAnalyticsApiToken(env: CloudflareEnv): string | undefined {
	const raw = env.CF_ANALYTICS_API_TOKEN ?? process.env.CF_ANALYTICS_API_TOKEN;
	const trimmed = raw?.trim();
	return trimmed ? trimmed : undefined;
}

export async function fetchWebAnalyticsSnapshot(
	env: CloudflareEnv,
	options?: { rangeDays?: number; zoneNameFilter?: string },
): Promise<CfWebAnalyticsSnapshot> {
	const apiToken = getAnalyticsApiToken(env);
	if (!apiToken) {
		throw new CloudflareAnalyticsConfigError(
			"CF_ANALYTICS_API_TOKEN が未設定です。文字起こし用とは別のトークンで、Analytics Read と Zone Read が必要です。",
		);
	}

	const rangeDays = options?.rangeDays ?? 28;
	const filter =
		parseZoneNameFilter(options?.zoneNameFilter ?? env.CF_ANALYTICS_ZONE_NAMES) ??
		parseZoneNameFilter(env.CF_ANALYTICS_ZONES);

	let zones = await listCloudflareZones(apiToken);
	if (filter) {
		zones = zones.filter((zone) => filter.has(zone.name.toLowerCase()));
	}

	if (zones.length === 0) {
		throw new CloudflareAnalyticsApiError(
			filter
				? "条件に一致するアクティブなゾーンがありません。CF_ANALYTICS_ZONE_NAMES を確認してください。"
				: "API トークンからゾーンを取得できませんでした。CF_ANALYTICS_API_TOKEN に Zone → Read と Analytics → Read を付け、Zone Resources に対象ゾーン（または All zones）を含めてください。",
		);
	}

	const reports = await Promise.all(
		zones.map((zone) => fetchZoneDailyTraffic(apiToken, zone, rangeDays)),
	);

	return {
		fetchedAt: new Date().toISOString(),
		rangeDays,
		zones: reports,
	};
}

export function formatTrafficBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"] as const;
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

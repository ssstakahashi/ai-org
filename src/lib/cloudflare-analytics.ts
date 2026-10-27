import { getWorkersAiApiToken } from "@/lib/workers-ai-rest";
import { addAppCalendarDays, startOfAppDay, toAppDateKey } from "@/lib/timezone";

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
	visits: number;
	bytes: number;
};

export type CfZoneTrafficReport = {
	zone: CfZoneSummary;
	days: CfZoneTrafficDay[];
	range: { since: string; until: string; dayCount: number };
};

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

async function cfRestGet<T>(apiToken: string, url: string): Promise<T> {
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${apiToken}` },
	});
	const payload = (await response.json()) as CloudflareApiResponse<T>;
	if (!response.ok || payload.success === false) {
		const message =
			payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
			`Cloudflare API error (${response.status})`;
		throw new CloudflareAnalyticsApiError(message);
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
		throw new CloudflareAnalyticsApiError(
			payload.errors.map((error) => error.message).filter(Boolean).join("; "),
		);
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
        sum { requests visits bytes }
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
				sum: { requests: number; visits: number; bytes: number };
			}[];
		}[];
	};
};

export async function fetchZoneDailyTraffic(
	apiToken: string,
	zone: CfZoneSummary,
	dayCount: number,
): Promise<CfZoneTrafficReport> {
	const range = appDateRange(dayCount);
	const data = await cfGraphql<DailyTrafficQueryResult>(apiToken, DAILY_TRAFFIC_QUERY, {
		zoneTag: zone.id,
		since: range.since,
		until: range.until,
	});

	const groups = data.viewer.zones[0]?.httpRequests1dGroups ?? [];
	const days = groups.map((group) => ({
		date: group.dimensions.date,
		requests: group.sum.requests ?? 0,
		visits: group.sum.visits ?? 0,
		bytes: group.sum.bytes ?? 0,
	}));

	return {
		zone,
		days,
		range: { ...range, dayCount },
	};
}

function sumDays(days: CfZoneTrafficDay[]) {
	return days.reduce(
		(acc, day) => ({
			requests: acc.requests + day.requests,
			visits: acc.visits + day.visits,
			bytes: acc.bytes + day.bytes,
		}),
		{ requests: 0, visits: 0, bytes: 0 },
	);
}

export function aggregateZoneTraffic(days: CfZoneTrafficDay[]) {
	return sumDays(days);
}

export async function fetchWebAnalyticsSnapshot(
	env: CloudflareEnv,
	options?: { rangeDays?: number; zoneNameFilter?: string },
): Promise<CfWebAnalyticsSnapshot> {
	const apiToken = getWorkersAiApiToken(env);
	if (!apiToken) {
		throw new CloudflareAnalyticsConfigError(
			"CF_API_TOKEN（または CLOUDFLARE_API_TOKEN）が未設定です。Analytics Read と Zone Read 権限が必要です。",
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
				: "アクティブな Cloudflare ゾーンがありません。",
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

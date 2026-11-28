import {
	APP_REQUIREMENT_STATUS_OPTIONS,
	type AppRequirementStatus,
} from "@/lib/types";

const STORAGE_KEY = "ai-org:app-requirements-prefs";

export const APP_LIST_SORTS = ["manual", "count-desc", "count-asc"] as const;

export type AppListSort = (typeof APP_LIST_SORTS)[number];

export const REQUIREMENT_LIST_SORTS = ["status", "updated", "manual"] as const;

export type RequirementListSort = (typeof REQUIREMENT_LIST_SORTS)[number];

export type AppRequirementsPrefs = {
	sort: AppListSort;
	requirementListSort: RequirementListSort;
	hiddenAppIds: string[];
	/** 表示する要件ステータス。空配列はすべて表示 */
	statusFilter: AppRequirementStatus[];
};

export const DEFAULT_APP_REQUIREMENTS_PREFS: AppRequirementsPrefs = {
	sort: "manual",
	requirementListSort: "status",
	hiddenAppIds: [],
	statusFilter: [],
};

function isAppListSort(value: unknown): value is AppListSort {
	return APP_LIST_SORTS.some((sort) => sort === value);
}

export function isRequirementListSort(
	value: unknown,
): value is RequirementListSort {
	return REQUIREMENT_LIST_SORTS.some((sort) => sort === value);
}

function isAppRequirementStatus(value: unknown): value is AppRequirementStatus {
	return APP_REQUIREMENT_STATUS_OPTIONS.some((status) => status === value);
}

function uniqueStatuses(values: unknown[]): AppRequirementStatus[] {
	return [...new Set(values.filter(isAppRequirementStatus))];
}

function uniqueIds(values: string[]): string[] {
	return [...new Set(values.filter((id) => id.length > 0))];
}

function defaultPrefs(): AppRequirementsPrefs {
	return {
		...DEFAULT_APP_REQUIREMENTS_PREFS,
		hiddenAppIds: [],
		statusFilter: [],
	};
}

export function getAppRequirementsPrefs(): AppRequirementsPrefs {
	if (typeof window === "undefined") {
		return defaultPrefs();
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultPrefs();
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") {
			return defaultPrefs();
		}
		const record = parsed as Record<string, unknown>;
		const sort = isAppListSort(record.sort)
			? record.sort
			: DEFAULT_APP_REQUIREMENTS_PREFS.sort;
		const requirementListSort = isRequirementListSort(record.requirementListSort)
			? record.requirementListSort
			: DEFAULT_APP_REQUIREMENTS_PREFS.requirementListSort;
		const hiddenAppIds = Array.isArray(record.hiddenAppIds)
			? uniqueIds(
					record.hiddenAppIds.filter(
						(id): id is string => typeof id === "string",
					),
				)
			: [];
		const statusFilter = Array.isArray(record.statusFilter)
			? uniqueStatuses(record.statusFilter)
			: [];
		return { sort, requirementListSort, hiddenAppIds, statusFilter };
	} catch {
		return defaultPrefs();
	}
}

export function saveAppRequirementsPrefs(
	prefs: AppRequirementsPrefs,
	knownAppIds?: Iterable<string>,
): void {
	const known =
		knownAppIds === undefined ? null : new Set(knownAppIds);
	const hiddenAppIds = uniqueIds(prefs.hiddenAppIds).filter(
		(id) => known === null || known.has(id),
	);
	const sort = isAppListSort(prefs.sort)
		? prefs.sort
		: DEFAULT_APP_REQUIREMENTS_PREFS.sort;
	const requirementListSort = isRequirementListSort(prefs.requirementListSort)
		? prefs.requirementListSort
		: DEFAULT_APP_REQUIREMENTS_PREFS.requirementListSort;
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				sort,
				requirementListSort,
				hiddenAppIds,
				statusFilter: uniqueStatuses(prefs.statusFilter),
			} satisfies AppRequirementsPrefs),
		);
	} catch {
		// 保存できない場合は何もしない
	}
}

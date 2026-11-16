const STORAGE_KEY = "ai-org:app-requirements-prefs";

export const APP_LIST_SORTS = ["manual", "count-desc", "count-asc"] as const;

export type AppListSort = (typeof APP_LIST_SORTS)[number];

export const REQUIREMENT_LIST_SORTS = ["status", "manual"] as const;

export type RequirementListSort = (typeof REQUIREMENT_LIST_SORTS)[number];

export type AppRequirementsPrefs = {
	sort: AppListSort;
	requirementListSort: RequirementListSort;
	hiddenAppIds: string[];
};

export const DEFAULT_APP_REQUIREMENTS_PREFS: AppRequirementsPrefs = {
	sort: "manual",
	requirementListSort: "status",
	hiddenAppIds: [],
};

function isAppListSort(value: unknown): value is AppListSort {
	return APP_LIST_SORTS.some((sort) => sort === value);
}

function isRequirementListSort(
	value: unknown,
): value is RequirementListSort {
	return REQUIREMENT_LIST_SORTS.some((sort) => sort === value);
}

function uniqueIds(values: string[]): string[] {
	return [...new Set(values.filter((id) => id.length > 0))];
}

export function getAppRequirementsPrefs(): AppRequirementsPrefs {
	if (typeof window === "undefined") {
		return { ...DEFAULT_APP_REQUIREMENTS_PREFS, hiddenAppIds: [] };
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_APP_REQUIREMENTS_PREFS, hiddenAppIds: [] };
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") {
			return { ...DEFAULT_APP_REQUIREMENTS_PREFS, hiddenAppIds: [] };
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
		return { sort, requirementListSort, hiddenAppIds };
	} catch {
		return { ...DEFAULT_APP_REQUIREMENTS_PREFS, hiddenAppIds: [] };
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
			} satisfies AppRequirementsPrefs),
		);
	} catch {
		// 保存できない場合は何もしない
	}
}

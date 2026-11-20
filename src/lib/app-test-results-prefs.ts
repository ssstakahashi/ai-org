import {
	APP_LIST_SORTS,
	type AppListSort,
} from "@/lib/app-requirements-prefs";

const STORAGE_KEY = "ai-org:app-test-results-prefs";

export type AppTestResultsPrefs = {
	sort: AppListSort;
	hiddenAppIds: string[];
};

export const DEFAULT_APP_TEST_RESULTS_PREFS: AppTestResultsPrefs = {
	sort: "manual",
	hiddenAppIds: [],
};

function isAppListSort(value: unknown): value is AppListSort {
	return APP_LIST_SORTS.some((sort) => sort === value);
}

function uniqueIds(values: string[]): string[] {
	return [...new Set(values.filter((id) => id.length > 0))];
}

export function getAppTestResultsPrefs(): AppTestResultsPrefs {
	if (typeof window === "undefined") {
		return { ...DEFAULT_APP_TEST_RESULTS_PREFS, hiddenAppIds: [] };
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_APP_TEST_RESULTS_PREFS, hiddenAppIds: [] };
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") {
			return { ...DEFAULT_APP_TEST_RESULTS_PREFS, hiddenAppIds: [] };
		}
		const record = parsed as Record<string, unknown>;
		const sort = isAppListSort(record.sort)
			? record.sort
			: DEFAULT_APP_TEST_RESULTS_PREFS.sort;
		const hiddenAppIds = Array.isArray(record.hiddenAppIds)
			? uniqueIds(
					record.hiddenAppIds.filter(
						(id): id is string => typeof id === "string",
					),
				)
			: [];
		return { sort, hiddenAppIds };
	} catch {
		return { ...DEFAULT_APP_TEST_RESULTS_PREFS, hiddenAppIds: [] };
	}
}

export function saveAppTestResultsPrefs(
	prefs: AppTestResultsPrefs,
	knownAppIds?: Iterable<string>,
): void {
	const known = knownAppIds === undefined ? null : new Set(knownAppIds);
	const hiddenAppIds = uniqueIds(prefs.hiddenAppIds).filter(
		(id) => known === null || known.has(id),
	);
	const sort = isAppListSort(prefs.sort)
		? prefs.sort
		: DEFAULT_APP_TEST_RESULTS_PREFS.sort;
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				sort,
				hiddenAppIds,
			} satisfies AppTestResultsPrefs),
		);
	} catch {
		// 保存できない場合は何もしない
	}
}

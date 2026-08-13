const STORAGE_KEY = "ai-org:gantt-scroll";

type GanttScrollStore = Record<string, number>;

function readStore(): GanttScrollStore {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return {};
		const store: GanttScrollStore = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
				store[key] = value;
			}
		}
		return store;
	} catch {
		return {};
	}
}

function writeStore(store: GanttScrollStore): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// 保存できない場合は何もしない
	}
}

export function getGanttScrollLeft(monthKey: string): number | null {
	const value = readStore()[monthKey];
	return typeof value === "number" ? value : null;
}

export function saveGanttScrollLeft(monthKey: string, scrollLeft: number): void {
	if (!Number.isFinite(scrollLeft) || scrollLeft < 0) return;
	const store = readStore();
	store[monthKey] = scrollLeft;
	writeStore(store);
}

export const APPS_TABS = [
	{ href: "/apps", label: "リスト", match: "exact" as const },
	{ href: "/apps/names", label: "App", match: "prefix" as const },
	{ href: "/apps/groups", label: "AppGroup", match: "prefix" as const },
	{ href: "/apps/types", label: "AppType", match: "prefix" as const },
	{ href: "/apps/requirements", label: "要件定義", match: "prefix" as const },
] as const;

export type AppsTabHref = (typeof APPS_TABS)[number]["href"];

const STORAGE_KEY = "ai-org:apps-tab";
const DEFAULT_TAB: AppsTabHref = "/apps";

export function isAppsSectionPath(path: string): boolean {
	return path === "/apps" || path.startsWith("/apps/");
}

function isAppsTabHref(path: string): path is AppsTabHref {
	return APPS_TABS.some((tab) => tab.href === path);
}

export function normalizeAppsTabPath(path: string): AppsTabHref | null {
	if (isAppsTabHref(path)) return path;
	const matched = APPS_TABS.find(
		(tab) =>
			tab.href !== "/apps" &&
			(path === tab.href || path.startsWith(`${tab.href}/`)),
	);
	return matched?.href ?? null;
}

export function getSavedAppsTab(): AppsTabHref {
	if (typeof window === "undefined") return DEFAULT_TAB;
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && isAppsTabHref(saved)) return saved;
	} catch {
		// localStorage が使えない環境ではデフォルトへ
	}
	return DEFAULT_TAB;
}

export function saveAppsTab(path: string): void {
	const normalized = normalizeAppsTabPath(path);
	if (!normalized) return;
	try {
		localStorage.setItem(STORAGE_KEY, normalized);
	} catch {
		// 保存できない場合は何もしない
	}
}

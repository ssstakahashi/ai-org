import type { XPostDestination } from "@/lib/types";

/** Agri 系 / 会計（kaikei）系 / スタジオフーズ公式 */
export type XPostContentSubcategoryGroup = "agri" | "kaikei" | "studiofoods";

const AGRI_DESTINATIONS = new Set<XPostDestination>(["agri", "studiofoods"]);
const KAIKEI_DESTINATIONS = new Set<XPostDestination>(["mieru", "mieru_manga"]);

export type XPostContentSubcategoryOption = {
	value: string;
	label: string;
};

const SUBCATEGORY_OPTIONS: Record<
	XPostContentSubcategoryGroup,
	readonly XPostContentSubcategoryOption[]
> = {
	agri: [
		{ value: "nichiji", label: "農業日誌・記録" },
		{ value: "cultivation", label: "栽培・作付" },
		{ value: "harvest_sales", label: "収穫・出荷・販路" },
		{ value: "subsidy", label: "補助金・制度" },
		{ value: "management", label: "経営・集計" },
		{ value: "agri_dx", label: "農業DX" },
		{ value: "manga", label: "漫画・広報" },
		{ value: "other", label: "その他" },
	],
	kaikei: [
		{ value: "tax", label: "税務" },
		{ value: "accounting", label: "会計・経理" },
		{ value: "invoice_dencho", label: "インボイス・電帳法" },
		{ value: "dx", label: "DX・業務効率化" },
		{ value: "labor", label: "労務" },
		{ value: "startup", label: "開業・創業" },
		{ value: "ma", label: "M&A・事業承継" },
		{ value: "process", label: "業務プロセス改革" },
		{ value: "manga", label: "漫画・広報" },
		{ value: "other", label: "その他" },
	],
	studiofoods: [
		{ value: "company", label: "会社・採用" },
		{ value: "product", label: "商品・サービス" },
		{ value: "food", label: "食品・卸" },
		{ value: "other", label: "その他" },
	],
};

export function xPostContentSubcategoryGroup(
	destination: XPostDestination,
): XPostContentSubcategoryGroup | null {
	if (AGRI_DESTINATIONS.has(destination)) return "agri";
	if (KAIKEI_DESTINATIONS.has(destination)) return "kaikei";
	if (destination === "studiofoods_official") return "studiofoods";
	return null;
}

export function xPostContentSubcategoryOptions(
	destination: XPostDestination,
): readonly XPostContentSubcategoryOption[] {
	const group = xPostContentSubcategoryGroup(destination);
	if (!group) return [];
	return SUBCATEGORY_OPTIONS[group];
}

export function xPostContentSubcategoryLabel(
	destination: XPostDestination,
	value: string | null | undefined,
): string | null {
	const key = String(value ?? "").trim();
	if (!key) return null;
	const match = xPostContentSubcategoryOptions(destination).find((o) => o.value === key);
	return match?.label ?? key;
}

export function parseXPostContentSubcategory(
	raw: unknown,
	destination: XPostDestination,
): string {
	const value = String(raw ?? "").trim();
	if (!value) return "";
	const allowed = xPostContentSubcategoryOptions(destination);
	if (allowed.length === 0) return "";
	if (!allowed.some((o) => o.value === value)) {
		throw new Error("サブカテゴリーが不正です");
	}
	return value;
}

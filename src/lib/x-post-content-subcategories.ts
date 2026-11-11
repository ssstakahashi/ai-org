import type { XPostDestination } from "@/lib/types";

export type XPostContentSubcategoryOption = {
	value: string;
	label: string;
};

/** 投稿先ごとの推奨分類（排他的）。値は `content_subcategory` に保存する英小文字キー */
const SUBCATEGORY_BY_DESTINATION: Record<
	XPostDestination,
	readonly XPostContentSubcategoryOption[]
> = {
	agri: [
		{ value: "news", label: "業界ニュース" },
		{ value: "market", label: "相場・需給" },
		{ value: "policy", label: "制度・政策" },
		{ value: "tech", label: "栽培技術" },
		{ value: "smart", label: "スマート農業" },
		{ value: "product", label: "プロダクト" },
	],
	studiofoods_official: [
		{ value: "work-tip", label: "実践・気づき" },
		{ value: "dx", label: "DX・AI活用" },
		{ value: "bpr", label: "現場改善" },
		{ value: "labor", label: "労務" },
		{ value: "tax", label: "税務" },
		{ value: "compare", label: "3社比較" },
		{ value: "ma", label: "M&A・事業承継" },
		{ value: "sidebusiness", label: "副業・D2C" },
	],
	mieru: [
		{ value: "tax", label: "税務ネタ" },
		{ value: "aruaru", label: "経理あるある" },
		{ value: "payroll", label: "給与・労務" },
		{ value: "product", label: "プロダクト" },
		{ value: "dx", label: "DX・効率化" },
	],
	studiofoods: [
		{ value: "aruaru", label: "農業あるある" },
		{ value: "shuno", label: "新規就農" },
		{ value: "product", label: "アプリ活用" },
		{ value: "keiei", label: "農業経営" },
		{ value: "smart", label: "スマート農業" },
	],
	mieru_manga: [
		{ value: "aruaru", label: "経理あるある" },
		{ value: "monthend", label: "月末・請求" },
		{ value: "tax", label: "税務" },
		{ value: "payroll", label: "給与・労務" },
		{ value: "product", label: "プロダクト" },
	],
};

const CONTENT_SUBCATEGORY_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;

export function xPostContentSubcategoryOptions(
	destination: XPostDestination,
): readonly XPostContentSubcategoryOption[] {
	return SUBCATEGORY_BY_DESTINATION[destination] ?? [];
}

export function normalizeXPostContentSubcategoryKey(raw: string): string {
	return String(raw ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/_+/g, "-")
		.replace(/-+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+/, "")
		.slice(0, 40);
}

export function isKnownXPostContentSubcategory(
	destination: XPostDestination,
	value: string,
): boolean {
	return xPostContentSubcategoryOptions(destination).some((o) => o.value === value);
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
	if (isKnownXPostContentSubcategory(destination, value)) {
		return value;
	}
	const normalized = normalizeXPostContentSubcategoryKey(value);
	if (!normalized) {
		throw new Error("サブカテゴリーのキーを入力してください");
	}
	if (!CONTENT_SUBCATEGORY_KEY_PATTERN.test(normalized)) {
		throw new Error(
			"サブカテゴリーは英小文字・数字・ハイフン（先頭は英字）で指定してください",
		);
	}
	return normalized;
}

/** 一覧のセレクト用: 現在値が候補に無いときは選択を空にし、テキスト欄に残す */
export function xPostContentSubcategoryPresetSelectValue(
	destination: XPostDestination,
	stored: string,
): string {
	if (!stored) return "";
	return isKnownXPostContentSubcategory(destination, stored) ? stored : "";
}

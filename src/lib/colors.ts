import type { CSSProperties } from "react";

/** color input の初期値（未設定時） */
export const COLOR_INPUT_FALLBACK = "#64748b";

export function normalizeColor(raw: unknown): string {
	const value = String(raw ?? "").trim();
	if (!value) return "";
	if (/^#[0-9a-fA-F]{6}$/.test(value)) {
		return value.toLowerCase();
	}
	if (/^#[0-9a-fA-F]{3}$/.test(value)) {
		const hex = value.slice(1);
		return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
	}
	throw new Error("色は #RRGGBB 形式で指定してください");
}

/** バッジ・チップ向けの塗りつぶし（背景色がはっきり分かる濃さ） */
export function tintStyle(color: string | null | undefined): CSSProperties | undefined {
	if (!color) return undefined;
	return {
		background: `color-mix(in srgb, ${color} 38%, white)`,
		borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
		color,
	};
}

/** アプリマスタ用：背景色とテキスト色を分けて指定 */
export function masterTintStyle(
	backgroundColor: string | null | undefined,
	textColor?: string | null,
): CSSProperties | undefined {
	const bg = String(backgroundColor ?? "").trim();
	const fg = String(textColor ?? "").trim();
	if (!bg && !fg) return undefined;

	const style: CSSProperties = {};
	if (bg) {
		style.background = `color-mix(in srgb, ${bg} 38%, white)`;
		style.borderColor = `color-mix(in srgb, ${bg} 55%, transparent)`;
	}
	if (fg) {
		style.color = fg;
	} else if (bg) {
		style.color = bg;
	}
	return style;
}

/** 社員カラー：内側の背景色を主に反映し、枠は背景を濃くした色 */
export function employeeTintStyle(
	backgroundColor: string | null | undefined,
	textColor?: string | null,
): CSSProperties | undefined {
	const bg = String(backgroundColor ?? "").trim();
	const fg = String(textColor ?? "").trim();
	if (!bg && !fg) return undefined;

	const style: CSSProperties = {};
	if (bg) {
		const fill = `color-mix(in srgb, ${bg} 70%, white)`;
		const border = `color-mix(in srgb, ${fill} 90%, black)`;
		style.background = fill;
		style.borderColor = border;
		(style as CSSProperties & Record<string, string>)["--employee-fill"] = fill;
		(style as CSSProperties & Record<string, string>)["--employee-border"] = border;
	}
	if (fg) {
		style.color = fg;
	} else if (bg) {
		style.color = bg;
	}
	return style;
}

export function colorInputValue(color: string | null | undefined): string {
	return color && /^#[0-9a-fA-F]{6}$/i.test(color) ? color : COLOR_INPUT_FALLBACK;
}

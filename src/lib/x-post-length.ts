/** X の文字数（全角=2、半角=1）。全角140文字相当 = 280 */
export const X_POST_MAX_WEIGHT = 280;

/** 全角文字かどうか（X のカウントに準拠した簡易判定） */
function isFullWidthChar(codePoint: number): boolean {
	return (
		(codePoint >= 0x1100 && codePoint <= 0x115f) ||
		(codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
		(codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
		(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
		(codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
		(codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
		(codePoint >= 0xff00 && codePoint <= 0xff60) ||
		(codePoint >= 0xffe0 && codePoint <= 0xffe6)
	);
}

export function xPostCharWeight(char: string): number {
	const codePoint = char.codePointAt(0);
	if (codePoint === undefined) return 0;
	return isFullWidthChar(codePoint) ? 2 : 1;
}

export function xPostTextWeight(text: string): number {
	let weight = 0;
	for (const char of text) {
		weight += xPostCharWeight(char);
	}
	return weight;
}

export type XPostLengthInfo = {
	weight: number;
	max: number;
	remaining: number;
	over: boolean;
	/** 全角換算（半角1文字は 0.5） */
	fullWidth: number;
};

export function xPostLengthInfo(text: string): XPostLengthInfo {
	const weight = xPostTextWeight(text);
	return {
		weight,
		max: X_POST_MAX_WEIGHT,
		remaining: X_POST_MAX_WEIGHT - weight,
		over: weight > X_POST_MAX_WEIGHT,
		fullWidth: weight / 2,
	};
}

function formatFullWidth(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatXPostLengthInfo(info: XPostLengthInfo): string {
	return `${info.weight} / ${info.max}（全角 ${formatFullWidth(info.fullWidth)} / 140）`;
}

/** 全角140文字（weight 280）以内に切り詰める */
export function truncateXPostText(text: string, maxWeight = X_POST_MAX_WEIGHT): string {
	let weight = 0;
	let result = "";
	for (const char of text) {
		const charWeight = xPostCharWeight(char);
		if (weight + charWeight > maxWeight) break;
		weight += charWeight;
		result += char;
	}
	return result.trimEnd();
}

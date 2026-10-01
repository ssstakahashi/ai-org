import type { BlogIdeaDetail } from "@/lib/blog-ideas-sheets";

/** 円建てのレンジだけをドル軸に載せるときの換算。図の位置用で、相場の更新はしない。 */
const YEN_PER_USD_FOR_AXIS = 150;

const DIFFICULTY_BANDS = [
	{ label: "低〜中", score: 38 },
	{ label: "中〜高", score: 78 },
	{ label: "低〜高", score: 50 },
	{ label: "高", score: 92 },
	{ label: "中", score: 58 },
	{ label: "低", score: 18 },
] as const;

/** この点数以上を「参入が重い」側（中・中〜高・高）にする。 */
export const SIDE_BUSINESS_DIFFICULTY_SPLIT = 50;

export const SIDE_BUSINESS_QUADRANTS = {
	priority: { label: "優先", hint: "月収が高め、参入は易しい" },
	commit: { label: "本業候補", hint: "月収が高め、参入は重い" },
	experiment: { label: "実験", hint: "月収は控えめ、参入は易しい" },
	later: { label: "後回し", hint: "月収は控えめ、参入は重い" },
} as const;

export type SideBusinessQuadrantId = keyof typeof SIDE_BUSINESS_QUADRANTS;

export type SideBusinessPoint = {
	id: string;
	no: string;
	title: string;
	difficultyLabel: string;
	difficultyScore: number;
	/** 縦軸に使った月収（副業時のレンジ中央。副業時が無ければ記載レンジ）。USD。 */
	monthlyUsd: number;
	mainMonthlyUsd: number | null;
	usedYen: boolean;
	quadrant: SideBusinessQuadrantId;
	/** 0〜100。右が高い難易度。境界をまたがない。 */
	x: number;
	/** 0〜100。上が高い月収。境界をまたがない。 */
	y: number;
};

export type SideBusinessPlacement = {
	points: SideBusinessPoint[];
	unscored: number;
	medianMonthlyUsd: number;
	/** 縦の境界。0〜100 で、上ほど月収が高い。 */
	medianY: number;
	counts: Record<SideBusinessQuadrantId, number>;
};

type ScoreInput = {
	id: string;
	no: string;
	title: string;
	details: BlogIdeaDetail[];
};

function detailText(details: BlogIdeaDetail[]): string {
	return details.map((item) => `${item.label}\n${item.value}`).join("\n");
}

function fieldFromDetails(details: BlogIdeaDetail[], key: string): string {
	const normalizedKey = key.replace(/\s/g, "");
	const labeled = details.find((item) => item.label.replace(/\s/g, "").includes(normalizedKey));
	if (labeled?.value.trim()) return labeled.value.trim();
	return fieldValue(detailText(details), key);
}

function fieldValue(text: string, key: string): string {
	const table = text.match(new RegExp(`\\|\\s*\\*\\*${key}[^|]*\\*\\*\\s*\\|\\s*([^|\\n]+)`));
	if (table?.[1]) return table[1].trim();
	const heading = text.match(new RegExp(`###\\s*${key}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|\\n## |$)`));
	return heading?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function difficultyOf(text: string): { label: string; score: number } | null {
	const head = text.trim().slice(0, 8);
	for (const band of DIFFICULTY_BANDS) {
		if (head.startsWith(band.label)) return band;
	}
	return null;
}

function parseAmount(raw: string): number {
	return Number(raw.replace(/,/g, ""));
}

function rangeUsd(segment: string): { usd: number; usedYen: boolean } | null {
	const usd = /\$\s*([0-9][0-9,]*)\s*[〜~～\-]\s*\$\s*([0-9][0-9,]*)/.exec(segment);
	const yen = /([0-9][0-9,]*)\s*万\s*[〜~～\-]\s*([0-9][0-9,]*)\s*万/.exec(segment);
	const usdAt = usd?.index ?? Number.POSITIVE_INFINITY;
	const yenAt = yen?.index ?? Number.POSITIVE_INFINITY;
	if (usd && usdAt <= yenAt) {
		let mid = (parseAmount(usd[1]) + parseAmount(usd[2])) / 2;
		const prefix = segment.slice(Math.max(0, usdAt - 8), usdAt);
		if (prefix.includes("年")) mid /= 12;
		return { usd: mid, usedYen: false };
	}
	if (yen) {
		let mid = ((parseAmount(yen[1]) + parseAmount(yen[2])) / 2) * 10_000;
		const prefix = segment.slice(Math.max(0, yenAt - 8), yenAt);
		if (prefix.includes("年")) mid /= 12;
		return { usd: mid / YEN_PER_USD_FOR_AXIS, usedYen: true };
	}
	return null;
}

function segmentAfter(text: string, marker: RegExp, until: RegExp): string {
	const start = text.search(marker);
	if (start < 0) return "";
	const rest = text.slice(start);
	const end = rest.search(until);
	return end >= 0 ? rest.slice(0, end) : rest;
}

function hashUnit(id: string): number {
	let hash = 0;
	for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
	return (hash % 1000) / 999;
}

function rankPercent(index: number, count: number): number {
	if (count <= 1) return 50;
	return 10 + (index / (count - 1)) * 80;
}

function quadrantOf(hard: boolean, rich: boolean): SideBusinessQuadrantId {
	if (rich && !hard) return "priority";
	if (rich && hard) return "commit";
	if (!rich && !hard) return "experiment";
	return "later";
}

function clampToSide(value: number, split: number, highSide: boolean): number {
	const clamped = Math.min(96, Math.max(4, value));
	if (highSide) return Math.max(clamped, split + 2);
	return Math.min(clamped, split - 2);
}

export function scoreSideBusinessIdeas(rows: ScoreInput[]): SideBusinessPlacement {
	const emptyCounts: Record<SideBusinessQuadrantId, number> = {
		priority: 0,
		commit: 0,
		experiment: 0,
		later: 0,
	};
	const drafts: {
		id: string;
		no: string;
		title: string;
		difficultyLabel: string;
		difficultyScore: number;
		monthlyUsd: number;
		mainMonthlyUsd: number | null;
		usedYen: boolean;
	}[] = [];

	for (const row of rows) {
		const revenueText = fieldFromDetails(row.details, "収益性目安");
		const difficultyText = fieldFromDetails(row.details, "参入難易度");
		const band = difficultyOf(difficultyText);
		const sideSegment = segmentAfter(revenueText, /副業/, /本業/);
		const side = rangeUsd(sideSegment) ?? rangeUsd(revenueText);
		const main = rangeUsd(segmentAfter(revenueText, /本業/, /$/));
		if (!band || !side) continue;
		drafts.push({
			id: row.id,
			no: row.no,
			title: row.title,
			difficultyLabel: band.label,
			difficultyScore: band.score,
			monthlyUsd: side.usd,
			mainMonthlyUsd: main?.usd ?? null,
			usedYen: side.usedYen || Boolean(main?.usedYen),
		});
	}

	if (drafts.length === 0) {
		return {
			points: [],
			unscored: rows.length,
			medianMonthlyUsd: 0,
			medianY: 50,
			counts: emptyCounts,
		};
	}

	const sortedUsd = drafts.map((item) => item.monthlyUsd).sort((a, b) => a - b);
	const mid = Math.floor((sortedUsd.length - 1) / 2);
	const medianMonthlyUsd =
		sortedUsd.length % 2 === 1 ? sortedUsd[mid] : (sortedUsd[mid] + sortedUsd[mid + 1]) / 2;
	const byIncome = [...drafts].sort(
		(a, b) => a.monthlyUsd - b.monthlyUsd || a.id.localeCompare(b.id),
	);
	const yById = new Map(byIncome.map((item, index) => [item.id, rankPercent(index, byIncome.length)]));
	const firstRich = byIncome.findIndex((item) => item.monthlyUsd >= medianMonthlyUsd);
	const belowY = firstRich <= 0 ? 10 : (yById.get(byIncome[firstRich - 1].id) ?? 10);
	const aboveY = yById.get(byIncome[Math.max(0, firstRich)].id) ?? 90;
	const medianY = firstRich <= 0 ? 10 : (belowY + aboveY) / 2;

	const points: SideBusinessPoint[] = drafts.map((draft) => {
		const hard = draft.difficultyScore >= SIDE_BUSINESS_DIFFICULTY_SPLIT;
		const rich = draft.monthlyUsd >= medianMonthlyUsd;
		const quadrant = quadrantOf(hard, rich);
		const spread = (hashUnit(draft.id) - 0.5) * 8;
		emptyCounts[quadrant] += 1;
		return {
			...draft,
			quadrant,
			x: clampToSide(draft.difficultyScore + spread, SIDE_BUSINESS_DIFFICULTY_SPLIT, hard),
			y: clampToSide(yById.get(draft.id) ?? 50, medianY, rich),
		};
	});

	return {
		points,
		unscored: rows.length - points.length,
		medianMonthlyUsd,
		medianY,
		counts: emptyCounts,
	};
}

export function formatAxisUsd(value: number): string {
	const rounded = Math.round(value);
	return `$${rounded.toLocaleString("en-US")}`;
}

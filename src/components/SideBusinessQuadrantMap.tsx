"use client";

import { useMemo, useRef, useState } from "react";
import {
	SIDE_BUSINESS_QUADRANTS,
	formatAxisUsd,
	scoreSideBusinessIdeas,
	type SideBusinessPoint,
	type SideBusinessQuadrantId,
} from "@/lib/sidebusiness-quadrant";
import type { BlogIdeaRow } from "@/lib/blog-ideas-sheets";

type Props = {
	rows: BlogIdeaRow[];
	onSelect: (row: BlogIdeaRow) => void;
};

const VIEW_W = 760;
const VIEW_H = 460;
const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 40;

const QUADRANT_FILL: Record<SideBusinessQuadrantId, string> = {
	priority: "#d7ebe1",
	commit: "#e7f0f8",
	experiment: "#f4f1e4",
	later: "#f8ecea",
};

function plotX(x: number): number {
	return PAD_L + (x / 100) * (VIEW_W - PAD_L - PAD_R);
}

function plotY(y: number): number {
	return PAD_T + ((100 - y) / 100) * (VIEW_H - PAD_T - PAD_B);
}

export function SideBusinessQuadrantMap({ rows, onSelect }: Props) {
	const placement = useMemo(() => scoreSideBusinessIdeas(rows), [rows]);
	const plotRef = useRef<HTMLDivElement>(null);
	const [tip, setTip] = useState<{ point: SideBusinessPoint; left: number; top: number } | null>(
		null,
	);
	const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

	if (placement.points.length === 0) return null;

	const splitX = plotX(50);
	const splitY = plotY(placement.medianY);

	function showTip(point: SideBusinessPoint) {
		const bounds = plotRef.current?.getBoundingClientRect();
		if (!bounds) return;
		setTip({
			point,
			left: (plotX(point.x) / VIEW_W) * bounds.width,
			top: (plotY(point.y) / VIEW_H) * bounds.height,
		});
	}

	function openPoint(point: SideBusinessPoint) {
		const row = byId.get(point.id);
		if (!row) return;
		setTip(null);
		onSelect(row);
	}

	const regions: { id: SideBusinessQuadrantId; x: number; y: number; w: number; h: number }[] = [
		{
			id: "priority",
			x: PAD_L,
			y: PAD_T,
			w: splitX - PAD_L,
			h: splitY - PAD_T,
		},
		{
			id: "commit",
			x: splitX,
			y: PAD_T,
			w: VIEW_W - PAD_R - splitX,
			h: splitY - PAD_T,
		},
		{
			id: "experiment",
			x: PAD_L,
			y: splitY,
			w: splitX - PAD_L,
			h: VIEW_H - PAD_B - splitY,
		},
		{
			id: "later",
			x: splitX,
			y: splitY,
			w: VIEW_W - PAD_R - splitX,
			h: VIEW_H - PAD_B - splitY,
		},
	];

	return (
		<div className="idea-quadrant">
			<p className="field-hint idea-quadrant-lead">
				収益性目安の月収レンジを1つの金額（下限と上限の中央）にまとめ、参入難易度との4象限に置いています。横の境界は「中」以上を右側、縦の境界はこの一覧の中央値（
				{formatAxisUsd(placement.medianMonthlyUsd)}
				/月）です。点を押すと詳細を開きます。
			</p>
			<div className="idea-quadrant-counts">
				{(Object.keys(SIDE_BUSINESS_QUADRANTS) as SideBusinessQuadrantId[]).map((id) => (
					<span key={id}>
						{SIDE_BUSINESS_QUADRANTS[id].label} {placement.counts[id]}
					</span>
				))}
			</div>
			<div className="idea-quadrant-plot" ref={plotRef}>
				<svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="SideBusiness の4象限">
					{regions.map((region) => (
						<rect
							key={region.id}
							x={region.x}
							y={region.y}
							width={region.w}
							height={region.h}
							fill={QUADRANT_FILL[region.id]}
						/>
					))}
					<line x1={splitX} y1={PAD_T} x2={splitX} y2={VIEW_H - PAD_B} className="idea-quadrant-axis" />
					<line x1={PAD_L} y1={splitY} x2={VIEW_W - PAD_R} y2={splitY} className="idea-quadrant-axis" />
					{regions.map((region) => (
						<text
							key={`${region.id}-label`}
							x={
								region.id === "priority" || region.id === "experiment"
									? region.x + 10
									: region.x + region.w - 10
							}
							y={
								region.id === "experiment" || region.id === "later"
									? region.y + region.h - 12
									: region.y + 18
							}
							textAnchor={region.id === "priority" || region.id === "experiment" ? "start" : "end"}
							className="idea-quadrant-region"
						>
							{SIDE_BUSINESS_QUADRANTS[region.id].label}（{placement.counts[region.id]}）
						</text>
					))}
					<text x={(PAD_L + VIEW_W - PAD_R) / 2} y={VIEW_H - 8} textAnchor="middle" className="idea-quadrant-axis-label">
						参入難易度
					</text>
					<text x={PAD_L} y={VIEW_H - 22} className="idea-quadrant-tick">
						低
					</text>
					<text x={VIEW_W - PAD_R} y={VIEW_H - 22} textAnchor="end" className="idea-quadrant-tick">
						高
					</text>
					<text
						x={16}
						y={(PAD_T + VIEW_H - PAD_B) / 2}
						textAnchor="middle"
						className="idea-quadrant-axis-label"
						transform={`rotate(-90 16 ${(PAD_T + VIEW_H - PAD_B) / 2})`}
					>
						副業時の月収
					</text>
					<text x={PAD_L - 8} y={PAD_T + 12} textAnchor="end" className="idea-quadrant-tick">
						高
					</text>
					<text x={PAD_L - 8} y={VIEW_H - PAD_B} textAnchor="end" className="idea-quadrant-tick">
						低
					</text>
					{placement.points.map((point) => (
						<g
							key={point.id}
							tabIndex={0}
							role="button"
							aria-label={`${point.no ? `No.${point.no} ` : ""}${point.title}。${SIDE_BUSINESS_QUADRANTS[point.quadrant].label}`}
							onMouseEnter={() => showTip(point)}
							onMouseLeave={() => setTip((current) => (current?.point.id === point.id ? null : current))}
							onFocus={() => showTip(point)}
							onBlur={() => setTip((current) => (current?.point.id === point.id ? null : current))}
							onClick={() => openPoint(point)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									openPoint(point);
								}
							}}
						>
							<circle cx={plotX(point.x)} cy={plotY(point.y)} r={12} className="idea-quadrant-hit" />
							<circle cx={plotX(point.x)} cy={plotY(point.y)} r={6} className="idea-quadrant-dot" />
						</g>
					))}
				</svg>
				{tip ? (
					<div
						className="idea-quadrant-tip"
						style={{
							left: Math.min(tip.left + 12, (plotRef.current?.clientWidth ?? 0) - 180),
							top: Math.max(8, tip.top - 72),
						}}
					>
						<p className="idea-quadrant-tip-title">
							{tip.point.no ? `No.${tip.point.no} ` : ""}
							{tip.point.title}
						</p>
						<p>
							{SIDE_BUSINESS_QUADRANTS[tip.point.quadrant].label}
							{" · "}
							難易度 {tip.point.difficultyLabel}
							{" · "}
							{formatAxisUsd(tip.point.monthlyUsd)}/月
							{tip.point.mainMonthlyUsd
								? `（本業化 ${formatAxisUsd(tip.point.mainMonthlyUsd)}）`
								: ""}
						</p>
					</div>
				) : null}
			</div>
			{placement.unscored > 0 ? (
				<p className="field-hint">
					収益性目安か参入難易度の記載がない {placement.unscored} 件は図に入れていません。
				</p>
			) : null}
		</div>
	);
}

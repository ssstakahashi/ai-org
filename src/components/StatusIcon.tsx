import type { TaskStatus } from "@/lib/types";

type Props = {
	status: TaskStatus;
	className?: string;
};

export function StatusIcon({ status, className = "status-icon" }: Props) {
	const common = {
		className,
		width: 14,
		height: 14,
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.75,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true as const,
	};

	switch (status) {
		case "draft":
			return (
				<svg {...common}>
					<path d="M3.5 12.5h2.2L12.8 5.4a1.1 1.1 0 0 0 0-1.6L11.2 2.2a1.1 1.1 0 0 0-1.6 0L2.5 9.3v3.2z" />
					<path d="M9.2 3.2 11.8 5.8" />
				</svg>
			);
		case "approved":
			return (
				<svg {...common}>
					<circle cx="8" cy="8" r="5.25" />
					<path d="M5.5 8.1 7.2 9.8 10.6 6.2" />
				</svg>
			);
		case "scheduled":
			return (
				<svg {...common}>
					<rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
					<path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
				</svg>
			);
		case "done":
			return (
				<svg {...common}>
					<path d="M2.5 8.2 5.3 11l3.4-4.2" />
					<path d="M7.2 11 10 13.8 14 7.5" />
				</svg>
			);
		case "failed":
			return (
				<svg {...common}>
					<circle cx="8" cy="8" r="5.25" />
					<path d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2" />
				</svg>
			);
	}
}

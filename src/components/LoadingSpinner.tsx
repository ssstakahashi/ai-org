type Props = {
	label: string;
	className?: string;
};

export function LoadingSpinner({ label, className = "" }: Props) {
	return (
		<p className={`field-loading${className ? ` ${className}` : ""}`} role="status" aria-live="polite">
			<svg
				className="field-loading-icon"
				width={16}
				height={16}
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.75}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden
			>
				<path d="M13.2 2.8A6.5 6.5 0 1 0 4.1 13.9" />
				<path d="M13.2 2.8V6.2" />
				<path d="M13.2 2.8H9.8" />
			</svg>
			<span>{label}</span>
		</p>
	);
}

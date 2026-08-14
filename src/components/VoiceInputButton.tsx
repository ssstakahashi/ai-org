"use client";

import type { VoiceInputState } from "@/lib/voice-input";

type Props = {
	state: VoiceInputState;
	onClick: () => void;
	disabled?: boolean;
};

export function VoiceInputButton({ state, onClick, disabled = false }: Props) {
	const isBusy = state === "recording" || state === "transcribing";
	const label =
		state === "recording"
			? "録音を停止して文字起こし"
			: state === "transcribing"
				? "文字起こし中"
				: "音声入力";

	return (
		<button
			type="button"
			className={`voice-input-btn${state === "recording" ? " is-recording" : ""}`}
			onClick={onClick}
			onMouseDown={(event) => event.preventDefault()}
			disabled={disabled || state === "transcribing"}
			aria-pressed={state === "recording"}
			aria-label={label}
			title={label}
		>
			<MicIcon recording={state === "recording"} />
			<span className="voice-input-btn-label">
				{state === "recording" ? "停止" : state === "transcribing" ? "起こし中…" : "音声"}
			</span>
			{isBusy ? <span className="voice-input-pulse" aria-hidden /> : null}
		</button>
	);
}

function MicIcon({ recording }: { recording: boolean }) {
	return (
		<svg
			className="voice-input-icon"
			width={14}
			height={14}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			{recording ? (
				<>
					<rect x="4.5" y="4.5" width="7" height="7" rx="1.2" fill="currentColor" stroke="none" />
				</>
			) : (
				<>
					<path d="M8 2.2a2.2 2.2 0 0 1 2.2 2.2v3.6a2.2 2.2 0 0 1-4.4 0V4.4A2.2 2.2 0 0 1 8 2.2Z" />
					<path d="M4.2 7.2a3.8 3.8 0 0 0 7.6 0" />
					<path d="M8 11v2.3" />
					<path d="M6.1 13.3h3.8" />
				</>
			)}
		</svg>
	);
}

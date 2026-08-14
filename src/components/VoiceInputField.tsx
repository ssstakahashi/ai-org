"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { appendTranscript } from "@/lib/voice-input";

type Props = {
	label: string;
	name: string;
	defaultValue?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	multiline?: boolean;
	rows?: number;
};

export function VoiceInputField({
	label,
	name,
	defaultValue = "",
	placeholder,
	required = false,
	disabled = false,
	multiline = false,
	rows = 4,
}: Props) {
	const inputId = useId();
	const [value, setValue] = useState(defaultValue);
	const lastDefaultRef = useRef(defaultValue);

	useEffect(() => {
		if (lastDefaultRef.current === defaultValue) return;
		lastDefaultRef.current = defaultValue;
		setValue(defaultValue);
	}, [defaultValue]);

	const handleTranscript = useCallback(
		(text: string) => {
			setValue((current) => appendTranscript(current, text, { multiline }));
		},
		[multiline],
	);

	const { state, error, toggle, isRecording } = useVoiceInput({
		disabled,
		onTranscript: handleTranscript,
	});

	return (
		<div className="full voice-input-field">
			<div className="voice-input-label">
				<label htmlFor={inputId}>{label}</label>
				<VoiceInputButton state={state} onClick={toggle} disabled={disabled} />
			</div>
			{multiline ? (
				<textarea
					id={inputId}
					name={name}
					rows={rows}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
				/>
			) : (
				<input
					id={inputId}
					name={name}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
				/>
			)}
			{isRecording ? (
				<p className="field-hint voice-input-hint">録音中… もう一度押すと文字起こしします</p>
			) : null}
			{error ? <p className="field-hint voice-input-error">{error}</p> : null}
		</div>
	);
}

"use client";

import { useCallback, useEffect, useState } from "react";
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
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	const handleTranscript = useCallback((text: string) => {
		setValue((current) => appendTranscript(current, text));
	}, []);

	const { state, error, toggle, isRecording } = useVoiceInput({
		disabled,
		onTranscript: handleTranscript,
	});

	return (
		<label className="full voice-input-field">
			<span className="voice-input-label">
				<span>{label}</span>
				<VoiceInputButton state={state} onClick={toggle} disabled={disabled} />
			</span>
			{multiline ? (
				<textarea
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
		</label>
	);
}

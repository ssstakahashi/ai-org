export type VoiceInputState = "idle" | "recording" | "transcribing";

export function appendTranscript(
	current: string,
	transcript: string,
	options?: { multiline?: boolean },
) {
	const trimmed = transcript.trim();
	if (!trimmed) return current;
	if (!current.trim()) return trimmed;
	if (options?.multiline) {
		const separator = current.endsWith("\n") ? "" : "\n";
		return current + separator + trimmed;
	}
	const separator = current.endsWith("\n") || current.endsWith(" ") ? "" : " ";
	return current + separator + trimmed;
}

export function pickRecordingMimeType() {
	if (typeof MediaRecorder === "undefined") return "";
	const candidates = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/mp4",
		"audio/ogg;codecs=opus",
	];
	return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

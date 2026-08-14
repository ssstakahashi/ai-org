"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecordingMimeType, type VoiceInputState } from "@/lib/voice-input";

const MAX_RECORDING_MS = 2 * 60 * 1000;

type Options = {
	disabled?: boolean;
	onTranscript: (text: string) => void;
};

export function useVoiceInput({ disabled = false, onTranscript }: Options) {
	const [state, setState] = useState<VoiceInputState>("idle");
	const [error, setError] = useState<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const stopTimerRef = useRef<number | null>(null);

	const cleanupStream = useCallback(() => {
		if (stopTimerRef.current != null) {
			window.clearTimeout(stopTimerRef.current);
			stopTimerRef.current = null;
		}
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		mediaRecorderRef.current = null;
		chunksRef.current = [];
	}, []);

	useEffect(() => cleanupStream, [cleanupStream]);

	const transcribeBlob = useCallback(
		async (blob: Blob) => {
			setState("transcribing");
			setError(null);
			try {
				const formData = new FormData();
				formData.set("audio", blob, "recording.webm");
				const response = await fetch("/api/transcribe", {
					method: "POST",
					body: formData,
				});
				const payload = (await response.json()) as { text?: string; error?: string };
				if (!response.ok) {
					throw new Error(payload.error || "文字起こしに失敗しました");
				}
				if (!payload.text?.trim()) {
					throw new Error("音声を認識できませんでした");
				}
				onTranscript(payload.text);
			} catch (caught) {
				const message =
					caught instanceof Error ? caught.message : "文字起こしに失敗しました";
				setError(message);
			} finally {
				setState("idle");
			}
		},
		[onTranscript],
	);

	const stopRecording = useCallback(async () => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") return;

		await new Promise<void>((resolve) => {
			recorder.addEventListener(
				"stop",
				() => {
					resolve();
				},
				{ once: true },
			);
			recorder.stop();
		});

		const mimeType = recorder.mimeType || "audio/webm";
		const blob = new Blob(chunksRef.current, { type: mimeType });
		cleanupStream();

		if (blob.size === 0) {
			setState("idle");
			setError("録音データがありません");
			return;
		}

		await transcribeBlob(blob);
	}, [cleanupStream, transcribeBlob]);

	const startRecording = useCallback(async () => {
		if (disabled || state !== "idle") return;
		setError(null);

		if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			setError("このブラウザでは音声入力に対応していません");
			return;
		}

		const mimeType = pickRecordingMimeType();
		if (!mimeType) {
			setError("このブラウザでは音声録音に対応していません");
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const recorder = new MediaRecorder(stream, { mimeType });
			mediaRecorderRef.current = recorder;
			chunksRef.current = [];

			recorder.addEventListener("dataavailable", (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			});

			recorder.start();
			setState("recording");
			stopTimerRef.current = window.setTimeout(() => {
				void stopRecording();
			}, MAX_RECORDING_MS);
		} catch {
			cleanupStream();
			setState("idle");
			setError("マイクの利用が許可されていません");
		}
	}, [cleanupStream, disabled, state, stopRecording]);

	const toggle = useCallback(() => {
		if (disabled) return;
		if (state === "recording") {
			void stopRecording();
			return;
		}
		if (state === "idle") {
			void startRecording();
		}
	}, [disabled, startRecording, state, stopRecording]);

	return {
		state,
		error,
		toggle,
		isRecording: state === "recording",
		isTranscribing: state === "transcribing",
	};
}

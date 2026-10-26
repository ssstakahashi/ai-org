import { getAppEnv } from "@/lib/app-env";
import {
	getWorkersAiAccountId,
	getWorkersAiApiToken,
	runWorkersAiRestApi,
} from "@/lib/workers-ai-rest";

const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo" as const;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

type WhisperResult = {
	text?: string;
};

export async function transcribeAudioBuffer(
	audio: ArrayBuffer,
	options?: { language?: string },
): Promise<string> {
	if (audio.byteLength === 0) {
		throw new Error("音声データが空です");
	}
	if (audio.byteLength > MAX_AUDIO_BYTES) {
		throw new Error("音声は 5MB 以下にしてください");
	}

	const env = getAppEnv();
	const accountId = getWorkersAiAccountId(env);
	const apiToken = getWorkersAiApiToken(env);
	if (!accountId || !apiToken) {
		throw new Error(
			"CF_ACCOUNT_ID と CF_API_TOKEN が必要です。.env または /etc/ai-org.env に設定してください。",
		);
	}

	const language = options?.language ?? "ja";
	const base64 = Buffer.from(audio).toString("base64");
	const result = await runWorkersAiRestApi<WhisperResult>(accountId, apiToken, WHISPER_MODEL, {
		audio: base64,
		task: "transcribe",
		language,
	});

	const text = result.text?.trim() ?? "";
	if (!text) {
		throw new Error("音声を認識できませんでした");
	}
	return text;
}

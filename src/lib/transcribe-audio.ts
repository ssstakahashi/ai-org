import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
	getWorkersAiAccountId,
	getWorkersAiApiToken,
	runWorkersAiRestApi,
	shouldUseWorkersAiRestApi,
} from "@/lib/workers-ai-rest";

const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo" as const;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

type WhisperResult = {
	text?: string;
};

async function transcribeViaBinding(
	env: CloudflareEnv,
	base64: string,
	language: string,
): Promise<WhisperResult> {
	return (await env.AI.run(WHISPER_MODEL, {
		audio: base64,
		task: "transcribe",
		language,
	})) as WhisperResult;
}

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

	const { env } = await getCloudflareContext({ async: true });
	const language = options?.language ?? "ja";
	const base64 = Buffer.from(audio).toString("base64");

	let result: WhisperResult;
	if (shouldUseWorkersAiRestApi(env)) {
		const accountId = getWorkersAiAccountId(env);
		const apiToken = getWorkersAiApiToken(env);
		if (!accountId || !apiToken) {
			throw new Error("CF_ACCOUNT_ID と CF_API_TOKEN が必要です");
		}
		result = await runWorkersAiRestApi<WhisperResult>(accountId, apiToken, WHISPER_MODEL, {
			audio: base64,
			task: "transcribe",
			language,
		});
	} else if (env.NEXTJS_ENV === "development") {
		throw new Error(
			"ローカル開発では CF_API_TOKEN が必要です。Cloudflare ダッシュボード > Workers AI > Use REST API でトークンを作成し、.dev.vars に CF_API_TOKEN=... を追加してください。",
		);
	} else {
		try {
			result = await transcribeViaBinding(env, base64, language);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes("Too many redirects")) {
				throw new Error(
					"文字起こし API に接続できませんでした。CF_API_TOKEN を .dev.vars に設定して再試行してください。",
				);
			}
			throw error;
		}
	}

	const text = result.text?.trim() ?? "";
	if (!text) {
		throw new Error("音声を認識できませんでした");
	}
	return text;
}

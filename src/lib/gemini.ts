const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash"] as const;

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

type GeminiGenerateContentResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
	error?: {
		message?: string;
		status?: string;
		code?: number;
	};
};

export function getGeminiApiKey(env: CloudflareEnv): string | undefined {
	return env.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
}

export type GeminiImageInput = {
	base64: string;
	mimeType: string;
};

export type GeminiGenerateOptions = {
	temperature?: number;
	maxOutputTokens?: number;
	image?: GeminiImageInput;
};

const CAPACITY_MESSAGE =
	"画像解析モデルが混み合っています。しばらくして「AI解析する」でもう一度お試しください";

function shouldTryNextModel(status: number, message: string): boolean {
	if (status === 429 || status === 503) return true;
	const lower = message.toLowerCase();
	return (
		lower.includes("high demand") ||
		lower.includes("overloaded") ||
		lower.includes("unavailable") ||
		lower.includes("try again later") ||
		lower.includes("no capacity") ||
		lower.includes("no longer available")
	);
}

async function generateWithModel(
	apiKey: string,
	model: string,
	parts: GeminiPart[],
	options?: GeminiGenerateOptions,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
	const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			contents: [{ parts }],
			generationConfig: {
				temperature: options?.temperature ?? 0.2,
				maxOutputTokens: options?.maxOutputTokens ?? 512,
			},
		}),
	});

	const payload = (await response.json()) as GeminiGenerateContentResponse;
	if (!response.ok) {
		const message = payload.error?.message ?? `Gemini API error (${response.status})`;
		return { ok: false, status: response.status, message };
	}

	const text = payload.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? "")
		.join("")
		.trim();

	if (!text) {
		return { ok: false, status: response.status, message: "Gemini API からテキストを取得できませんでした" };
	}

	return { ok: true, text };
}

export async function geminiGenerateContent(
	apiKey: string,
	prompt: string,
	options?: GeminiGenerateOptions,
): Promise<string> {
	const parts: GeminiPart[] = [];

	if (options?.image) {
		parts.push({
			inline_data: {
				mime_type: options.image.mimeType || "image/jpeg",
				data: options.image.base64,
			},
		});
	}
	parts.push({ text: prompt });

	const models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
	let lastCapacityError: string | null = null;

	for (const model of models) {
		const result = await generateWithModel(apiKey, model, parts, options);
		if (result.ok) {
			if (model !== DEFAULT_MODEL) {
				console.warn(`gemini: fell back to ${model}`);
			}
			return result.text;
		}

		if (!shouldTryNextModel(result.status, result.message)) {
			throw new Error(result.message);
		}

		lastCapacityError = result.message;
		console.warn(`gemini: ${model} unavailable (${result.status}) ${result.message}`);
	}

	throw new Error(lastCapacityError ? CAPACITY_MESSAGE : "投稿文の生成に失敗しました");
}

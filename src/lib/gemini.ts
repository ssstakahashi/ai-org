const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.0-flash";

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

type GeminiGenerateContentResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
	error?: {
		message?: string;
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

	const url = `${GEMINI_API_BASE}/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
		throw new Error(message);
	}

	const text = payload.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? "")
		.join("")
		.trim();

	if (!text) {
		throw new Error("Gemini API からテキストを取得できませんでした");
	}

	return text;
}

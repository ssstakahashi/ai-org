import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { geminiGenerateContent, getGeminiApiKey } from "@/lib/gemini";
import { parseGeneratedPost } from "@/lib/x-post-parse";
import {
	getWorkersAiAccountId,
	getWorkersAiApiToken,
	runWorkersAiRestApi,
	shouldUseWorkersAiRestApi,
} from "@/lib/workers-ai-rest";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct" as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PAST_POSTS_LIMIT = 5;

type PastPost = {
	title: string;
	body: string;
};

type AiTextResult = {
	response?: string;
	description?: string;
	text?: string;
};

function extractAiText(result: AiTextResult | null | undefined): string {
	if (!result) return "";
	if (typeof result.response === "string" && result.response.trim()) return result.response.trim();
	if (typeof result.description === "string" && result.description.trim()) {
		return result.description.trim();
	}
	if (typeof result.text === "string" && result.text.trim()) return result.text.trim();
	return "";
}

export type SuggestXPostOptions = {
	notes?: string;
	mimeType?: string;
};

export type SuggestXPostResult = {
	title: string;
	body: string;
};

function summarizePastStyle(pastPosts: PastPost[]): string {
	if (pastPosts.length === 0) {
		return "親しみやすい農家アカウントのカジュアルな口調";
	}

	const lengths = pastPosts.map((post) => post.body.trim().length).filter(Boolean);
	const avgLength =
		lengths.length > 0
			? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length)
			: 80;
	const usesEmoji = pastPosts.some((post) => /[\u{1F300}-\u{1FAFF}]/u.test(post.body));
	const usesHashtag = pastPosts.some((post) => /#[\w\u3040-\u30FF\u4E00-\u9FFF]+/u.test(post.body));

	return [
		"口調: カジュアルで親しみやすい",
		`本文の長さ目安: ${avgLength}文字前後`,
		usesEmoji ? "絵文字: たまに使う" : "絵文字: ほぼ使わない",
		usesHashtag ? "ハッシュタグ: たまに使う" : "ハッシュタグ: ほぼ使わない",
	].join("、");
}

function buildImageDescriptionPrompt(): string {
	return `この画像を注意深く観察し、日本語で見えている内容だけを具体的に描写してください。

次の観点を箇条書きで書いてください:
- 主な被写体（作物名、道具、人物、動物など。名前が分かれば書く）
- 色・大きさ・量・熟れ具合などの状態
- 行われている作業や状況
- 場所の手がかり（屋内/屋外、畑、ハウス、厨房など）

ルール:
- 推測や一般知識で補わない
- 確信が持てない場合は「判別困難」と書く
- 投稿文やタイトルは書かない。描写のみ。`;
}

function buildPostDraftPrompt(
	imageDescription: string,
	styleHint: string,
	options?: SuggestXPostOptions,
): string {
	const notesLine = options?.notes?.trim()
		? `\n## 追加の指示（メモ）\n${options.notes.trim()}`
		: "";

	return `あなたは農家のX（Twitter）アカウントの投稿を書くアシスタントです。
以下の「画像の描写」だけを根拠に、タイトルと投稿文を作成してください。

## 画像の描写
${imageDescription}

## 文体の参考（トーンのみ。過去の題材・文言は使わない）
${styleHint}
${notesLine}

## 重要
- 画像の描写にない内容は書かない
- 過去の投稿と同じ題材・フレーズをコピーしない
- 投稿文は全角換算140文字以内

## 出力形式（厳守。見本のように書く）

**タイトル**
収穫の様子

**投稿文**
今日はハウスでトマトを収穫しました。`;
}

async function listPastXPostsForAi(): Promise<PastPost[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT title, body
			 FROM x_posts
			 WHERE status = 'done' AND TRIM(body) != ''
			 ORDER BY COALESCE(scheduled_at, created_at) DESC
			 LIMIT ?`,
		)
		.bind(PAST_POSTS_LIMIT)
		.all<PastPost>();
	return results ?? [];
}

type RestCredentials = { accountId: string; apiToken: string };

async function runTextModel(
	env: CloudflareEnv,
	prompt: string,
	rest?: RestCredentials,
): Promise<AiTextResult> {
	const input = {
		prompt,
		max_tokens: 512,
		temperature: 0.5,
	};

	if (rest) {
		return runWorkersAiRestApi<AiTextResult>(rest.accountId, rest.apiToken, TEXT_MODEL, input);
	}
	return (await env.AI.run(TEXT_MODEL, input)) as AiTextResult;
}

async function describeImage(
	geminiApiKey: string,
	base64: string,
	mimeType: string,
): Promise<string> {
	const description = await geminiGenerateContent(geminiApiKey, buildImageDescriptionPrompt(), {
		temperature: 0.2,
		image: { base64, mimeType },
	});
	if (!description) {
		throw new Error("画像の内容を読み取れませんでした");
	}
	return description;
}

async function draftPostFromDescription(
	env: CloudflareEnv,
	imageDescription: string,
	pastPosts: PastPost[],
	options: SuggestXPostOptions | undefined,
	rest: RestCredentials | undefined,
	geminiApiKey: string,
	base64: string,
	mimeType: string,
): Promise<SuggestXPostResult> {
	const prompt = buildPostDraftPrompt(imageDescription, summarizePastStyle(pastPosts), options);
	let parsed: SuggestXPostResult = { title: "", body: "" };

	try {
		const result = await runTextModel(env, prompt, rest);
		const raw = extractAiText(result);
		parsed = parseGeneratedPost(raw);
		if (!parsed.title && !parsed.body && raw) {
			console.warn("x-post-ai: text model output could not be parsed", raw.slice(0, 500));
		}
	} catch (error) {
		console.warn("x-post-ai: text model failed, falling back to Gemini vision", error);
	}

	if (!parsed.title && !parsed.body) {
		parsed = await draftPostViaGemini(
			geminiApiKey,
			base64,
			mimeType,
			imageDescription,
			pastPosts,
			options,
		);
	}

	if (!parsed.title && !parsed.body) {
		throw new Error("投稿文を生成できませんでした");
	}
	return parsed;
}

async function draftPostViaGemini(
	geminiApiKey: string,
	base64: string,
	mimeType: string,
	imageDescription: string,
	pastPosts: PastPost[],
	options?: SuggestXPostOptions,
): Promise<SuggestXPostResult> {
	const prompt = `${buildPostDraftPrompt(imageDescription, summarizePastStyle(pastPosts), options)}

上記の画像の描写と添付画像の両方を見て、出力形式どおりに書いてください。`;
	const raw = await geminiGenerateContent(geminiApiKey, prompt, {
		temperature: 0.5,
		image: { base64, mimeType },
	});
	const parsed = parseGeneratedPost(raw);
	if (!parsed.title && !parsed.body) {
		console.warn("x-post-ai: Gemini draft fallback could not be parsed", raw.slice(0, 500));
	}
	return parsed;
}

export async function suggestXPostFromImage(
	image: ArrayBuffer,
	options?: SuggestXPostOptions,
): Promise<SuggestXPostResult> {
	if (image.byteLength === 0) {
		throw new Error("画像データが空です");
	}
	if (image.byteLength > MAX_IMAGE_BYTES) {
		throw new Error("画像は 8MB 以下にしてください");
	}

	const { env } = await getCloudflareContext({ async: true });
	const geminiApiKey = getGeminiApiKey(env);
	if (!geminiApiKey) {
		throw new Error(
			"GEMINI_API_KEY が必要です。Google AI Studio で API キーを作成し、.dev.vars または Workers シークレットに設定してください。",
		);
	}

	const pastPosts = await listPastXPostsForAi();
	const base64 = Buffer.from(image).toString("base64");
	const mimeType = options?.mimeType?.trim() || "image/jpeg";

	let rest: RestCredentials | undefined;
	if (shouldUseWorkersAiRestApi(env)) {
		const accountId = getWorkersAiAccountId(env);
		const apiToken = getWorkersAiApiToken(env);
		if (!accountId || !apiToken) {
			throw new Error("CF_ACCOUNT_ID と CF_API_TOKEN が必要です");
		}
		rest = { accountId, apiToken };
	} else if (env.NEXTJS_ENV === "development") {
		throw new Error(
			"ローカル開発では CF_API_TOKEN が必要です。Cloudflare ダッシュボード > Workers AI > Use REST API でトークンを作成し、.dev.vars に CF_API_TOKEN=... を追加してください。",
		);
	}

	try {
		const imageDescription = await describeImage(geminiApiKey, base64, mimeType);
		return await draftPostFromDescription(
			env,
			imageDescription,
			pastPosts,
			options,
			rest,
			geminiApiKey,
			base64,
			mimeType,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Too many redirects")) {
			throw new Error(
				"画像解析 API に接続できませんでした。GEMINI_API_KEY と CF_API_TOKEN を .dev.vars に設定して再試行してください。",
			);
		}
		throw error;
	}
}

/** @deprecated suggestXPostFromImage を使用 */
export async function suggestXPostBodyFromImage(
	image: ArrayBuffer,
	options?: SuggestXPostOptions,
): Promise<string> {
	const result = await suggestXPostFromImage(image, options);
	return result.body;
}

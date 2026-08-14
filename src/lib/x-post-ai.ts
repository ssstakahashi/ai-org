import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct" as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PAST_POSTS_LIMIT = 10;
const PAST_BODY_SNIPPET_CHARS = 200;
const X_POST_MAX_CHARS = 280;

type PastPost = {
	title: string;
	body: string;
	notes: string;
};

type VisionResult = {
	response?: string;
};

type CloudflareApiResponse = {
	success?: boolean;
	result?: VisionResult;
	errors?: { message?: string }[];
};

export type SuggestXPostOptions = {
	title?: string;
	notes?: string;
};

function getApiToken(env: CloudflareEnv): string | undefined {
	return (
		env.CF_API_TOKEN ??
		env.CLOUDFLARE_API_TOKEN ??
		process.env.CF_API_TOKEN ??
		process.env.CLOUDFLARE_API_TOKEN
	);
}

function shouldUseRestApi(env: CloudflareEnv) {
	return env.NEXTJS_ENV === "development" && Boolean(getApiToken(env) && env.CF_ACCOUNT_ID);
}

function trimSnippet(text: string, max = PAST_BODY_SNIPPET_CHARS): string {
	const trimmed = text.trim();
	if (!trimmed) return "";
	return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function buildPrompt(pastPosts: PastPost[], options?: SuggestXPostOptions): string {
	const pastSection =
		pastPosts.length > 0
			? pastPosts
					.map(
						(post, index) =>
							`${index + 1}. タイトル: ${post.title.trim() || "（なし）"}
   本文: ${trimSnippet(post.body)}
   ${post.notes.trim() ? `メモ: ${trimSnippet(post.notes, 120)}` : ""}`.trimEnd(),
					)
					.join("\n\n")
			: "（まだ投稿実績がありません。親しみやすい農家アカウントのトーンで書いてください）";

	const titleLine = options?.title?.trim()
		? `\n## 今回のタイトル（参考）\n${options.title.trim()}`
		: "";
	const notesLine = options?.notes?.trim()
		? `\n## 追加の指示（メモ）\n${options.notes.trim()}`
		: "";

	return `あなたは農家のX（Twitter）アカウントの投稿文を書くアシスタントです。
添付画像の内容を見て、X用の投稿文を日本語で1つ作成してください。

## 過去の投稿（文体・長さ・絵文字の使い方の参考）
${pastSection}
${titleLine}${notesLine}

## 制約
- ${X_POST_MAX_CHARS}文字以内（厳守）
- 画像の内容を具体的に伝える
- 過去の投稿と同じようなトーン・文体に合わせる
- ハッシュタグは0〜2個まで（無理に付けない）
- 投稿文の本文だけを出力する（説明・前置き・引用符は不要）`;
}

function normalizeGeneratedBody(text: string): string {
	let body = text.trim();
	body = body.replace(/^["「『]|["」』]$/g, "").trim();
	body = body.replace(/^(投稿文|本文)[:：]\s*/u, "").trim();
	if (body.length > X_POST_MAX_CHARS) {
		body = body.slice(0, X_POST_MAX_CHARS).trimEnd();
	}
	return body;
}

async function listPastXPostsForAi(): Promise<PastPost[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT title, body, notes
			 FROM x_posts
			 WHERE status = 'done' AND TRIM(body) != ''
			 ORDER BY COALESCE(scheduled_at, created_at) DESC
			 LIMIT ?`,
		)
		.bind(PAST_POSTS_LIMIT)
		.all<PastPost>();
	return results ?? [];
}

async function suggestViaBinding(
	env: CloudflareEnv,
	base64: string,
	prompt: string,
): Promise<VisionResult> {
	return (await env.AI.run(VISION_MODEL, {
		image: base64,
		prompt,
		max_tokens: 512,
		temperature: 0.4,
	})) as VisionResult;
}

async function suggestViaRestApi(
	accountId: string,
	apiToken: string,
	base64: string,
	prompt: string,
): Promise<VisionResult> {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(VISION_MODEL)}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				image: base64,
				prompt,
				max_tokens: 512,
				temperature: 0.4,
			}),
		},
	);

	const payload = (await response.json()) as CloudflareApiResponse;
	if (!response.ok || payload.success === false) {
		const message =
			payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
			`Workers AI API error (${response.status})`;
		throw new Error(message);
	}

	return payload.result ?? {};
}

export async function suggestXPostBodyFromImage(
	image: ArrayBuffer,
	options?: SuggestXPostOptions,
): Promise<string> {
	if (image.byteLength === 0) {
		throw new Error("画像データが空です");
	}
	if (image.byteLength > MAX_IMAGE_BYTES) {
		throw new Error("画像は 8MB 以下にしてください");
	}

	const { env } = await getCloudflareContext({ async: true });
	const pastPosts = await listPastXPostsForAi();
	const prompt = buildPrompt(pastPosts, options);
	const base64 = Buffer.from(image).toString("base64");

	let result: VisionResult;
	if (shouldUseRestApi(env)) {
		const accountId = env.CF_ACCOUNT_ID;
		const apiToken = getApiToken(env);
		if (!accountId || !apiToken) {
			throw new Error("CF_ACCOUNT_ID と CF_API_TOKEN が必要です");
		}
		result = await suggestViaRestApi(accountId, apiToken, base64, prompt);
	} else if (env.NEXTJS_ENV === "development") {
		throw new Error(
			"ローカル開発では CF_API_TOKEN が必要です。Cloudflare ダッシュボード > Workers AI > Use REST API でトークンを作成し、.dev.vars に CF_API_TOKEN=... を追加してください。",
		);
	} else {
		try {
			result = await suggestViaBinding(env, base64, prompt);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes("Too many redirects")) {
				throw new Error(
					"画像解析 API に接続できませんでした。CF_API_TOKEN を .dev.vars に設定して再試行してください。",
				);
			}
			throw error;
		}
	}

	const body = normalizeGeneratedBody(result.response?.trim() ?? "");
	if (!body) {
		throw new Error("投稿文を生成できませんでした");
	}
	return body;
}

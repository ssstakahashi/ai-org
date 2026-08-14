import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { geminiGenerateContent, getGeminiApiKey } from "@/lib/gemini";
import { parseXPostAnalysis } from "@/lib/x-post-parse";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PAST_POSTS_LIMIT = 5;

type PastPost = {
	title: string;
	body: string;
};

export type SuggestXPostOptions = {
	notes?: string;
	mimeType?: string;
};

export type SuggestXPostResult = {
	title: string;
	body: string;
	analysis: string;
};

function summarizePastStyle(pastPosts: PastPost[]): string {
	if (pastPosts.length === 0) {
		return "親しみやすい農家・個人事業主向けのカジュアルな口調";
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

function buildXPostAnalysisPrompt(styleHint: string, options?: SuggestXPostOptions): string {
	const notesLine = options?.notes?.trim()
		? `\n## 追加の指示（メモ）\n${options.notes.trim()}`
		: "";

	return `あなたはSNS（X）投稿の企画・文案作成アシスタントです。
添付画像を分析し、投稿企画を作成してください。

画像は写真・イラスト・漫画・インフォグラフィック・広告バナーなど形式は問いません。
画像内のテキスト（セリフ、見出し、キャッチコピー、注釈）をすべて読み取り、
「何を訴えているか」「誰のどんな悩みに刺さるか」を把握してください。

## 文体の参考
${styleHint}
${notesLine}

## 重要ルール
- **テーマ**（管理用タイトル）には画像の体裁名（「漫画」「イラスト」「日本の漫画」など）を書かない
- テーマは訴求内容・メッセージを要約する（例: 書類・経理業務の山積み（電帳法・インボイス対応））
- 画像内のキャッチコピーやキーフレーズを投稿文に活かす
- 過去の投稿と同じ題材・フレーズをコピーしない
- 投稿文案は3パターン。パターン1をいちばんおすすめにする
- ハッシュタグを適宜含める

## 出力形式（厳守。この見出し名をそのまま使う）

## テーマ
（管理用タイトル。訴求テーマを1行で）

## 分析コメント
今回のテーマは「（テーマ要約）」ですね！
（画像の刺さるポイントを2〜4文。画像内のコピーやメッセージに言及する）
今回もX（旧Twitter）投稿用のコメント案を3パターンご提案します！

## おすすめ投稿文
（パターン1の投稿文全文。コピペしてそのまま使える形）

## 投稿文案
### パターン1：共感＆現場の本音重視（一番おすすめ）
（投稿文）

### パターン2：課題解決・機能アピール型
（投稿文）

### パターン3：シンプル＆インパクト型
（投稿文）

## 投稿のワンポイント
（箇条書きで2〜3点。キーワードや訴求のコツ）`;
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

async function analyzeImageForXPost(
	geminiApiKey: string,
	base64: string,
	mimeType: string,
	pastPosts: PastPost[],
	options?: SuggestXPostOptions,
): Promise<SuggestXPostResult> {
	const prompt = buildXPostAnalysisPrompt(summarizePastStyle(pastPosts), options);
	const raw = await geminiGenerateContent(geminiApiKey, prompt, {
		temperature: 0.6,
		maxOutputTokens: 4096,
		image: { base64, mimeType },
	});

	const parsed = parseXPostAnalysis(raw);
	if (!parsed.title && !parsed.body) {
		console.warn("x-post-ai: Gemini analysis could not be parsed", raw.slice(0, 500));
	}

	if (!parsed.title && !parsed.body) {
		throw new Error("投稿文を生成できませんでした");
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

	return analyzeImageForXPost(geminiApiKey, base64, mimeType, pastPosts, options);
}

/** @deprecated suggestXPostFromImage を使用 */
export async function suggestXPostBodyFromImage(
	image: ArrayBuffer,
	options?: SuggestXPostOptions,
): Promise<string> {
	const result = await suggestXPostFromImage(image, options);
	return result.body;
}

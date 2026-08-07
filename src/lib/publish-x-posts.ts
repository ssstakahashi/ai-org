import { createXPost, getXCredentials, uploadXMedia } from "@/lib/x-client";

export type PublishEnv = {
	DB: D1Database;
	MEDIA: R2Bucket;
	X_API_KEY?: string;
	X_API_SECRET?: string;
	X_ACCESS_TOKEN?: string;
	X_ACCESS_TOKEN_SECRET?: string;
};

export type PublishResult = {
	attempted: number;
	succeeded: number;
	failed: number;
	errors: { postId: string; message: string }[];
};

type DuePost = {
	id: string;
	title: string;
	body: string;
	image_key: string | null;
};

function postText(post: DuePost) {
	const text = (post.body || post.title).trim();
	if (!text) {
		throw new Error("投稿文が空です");
	}
	// ざっくり上限。厳密なウェイト計算は後続で強化可
	if ([...text].length > 280) {
		throw new Error("投稿文が280文字を超えています");
	}
	return text;
}

async function markDone(db: D1Database, postId: string, xPostId: string) {
	await db
		.prepare(
			`UPDATE x_posts
			 SET status = 'done', x_post_id = ?, last_error = '', updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(xPostId, postId)
		.run();
}

async function markFailed(db: D1Database, postId: string, message: string) {
	await db
		.prepare(
			`UPDATE x_posts
			 SET status = 'failed', last_error = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(message.slice(0, 1000), postId)
		.run();
}

async function publishOne(env: PublishEnv, post: DuePost) {
	const creds = getXCredentials(env);
	const text = postText(post);

	let mediaIds: string[] | undefined;
	if (post.image_key) {
		const object = await env.MEDIA.get(post.image_key);
		if (!object) {
			throw new Error(`画像が見つかりません: ${post.image_key}`);
		}
		const mediaId = await uploadXMedia(
			creds,
			await object.arrayBuffer(),
			object.httpMetadata?.contentType || "application/octet-stream",
		);
		mediaIds = [mediaId];
	}

	const { id } = await createXPost(creds, { text, mediaIds });
	await markDone(env.DB, post.id, id);
	return id;
}

/** 予約時刻を過ぎた scheduled の x_posts を投稿 */
export async function publishDueXPosts(env: PublishEnv): Promise<PublishResult> {
	const now = new Date().toISOString();
	const { results } = await env.DB.prepare(
		`SELECT id, title, body, image_key
		 FROM x_posts
		 WHERE status = 'scheduled'
		   AND scheduled_at IS NOT NULL
		   AND scheduled_at <= ?
		 ORDER BY scheduled_at ASC
		 LIMIT 20`,
	)
		.bind(now)
		.all<DuePost>();

	const posts = results ?? [];
	const result: PublishResult = { attempted: 0, succeeded: 0, failed: 0, errors: [] };

	for (const post of posts) {
		result.attempted += 1;
		try {
			await publishOne(env, post);
			result.succeeded += 1;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			await markFailed(env.DB, post.id, message);
			result.failed += 1;
			result.errors.push({ postId: post.id, message });
		}
	}

	return result;
}

/** 指定の x_posts をいま投稿（予約時刻を待たない） */
export async function publishXPostNow(env: PublishEnv, postId: string): Promise<void> {
	const post = await env.DB.prepare(
		`SELECT id, title, body, image_key, status
		 FROM x_posts
		 WHERE id = ?`,
	)
		.bind(postId)
		.first<DuePost & { status: string }>();

	if (!post) {
		throw new Error("投稿が見つかりません");
	}
	if (post.status === "done") {
		throw new Error("すでに投稿済みです");
	}
	if (post.status !== "scheduled" && post.status !== "approved" && post.status !== "failed") {
		throw new Error("承認済・予約・失敗の投稿のみ投稿できます");
	}

	try {
		await publishOne(env, post);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await markFailed(env.DB, post.id, message);
		throw error;
	}
}

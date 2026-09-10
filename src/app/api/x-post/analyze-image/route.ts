import { NextRequest, NextResponse } from "next/server";
import { getMediaBucket } from "@/lib/db";
import { getUploadFile, isAllowedMediaKey } from "@/lib/media-upload";
import { suggestXPostFromImage } from "@/lib/x-post-ai";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/"];

async function loadStoredXPostImage(imageKey: string): Promise<
	{ buffer: ArrayBuffer; mimeType: string } | { error: string; status: number }
> {
	if (!isAllowedMediaKey(imageKey) || !imageKey.startsWith("x-posts/")) {
		return { error: "画像キーが不正です", status: 400 };
	}

	try {
		const media = await getMediaBucket();
		const object = await media.get(imageKey);
		if (!object) {
			return { error: "保存済み画像が見つかりません", status: 404 };
		}

		const buffer = await object.arrayBuffer();
		if (buffer.byteLength === 0) {
			return { error: "画像データが空です", status: 400 };
		}
		if (buffer.byteLength > MAX_IMAGE_BYTES) {
			return { error: "画像は 8MB 以下にしてください", status: 400 };
		}

		const mimeType = object.httpMetadata?.contentType?.trim() || "image/webp";
		if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
			return { error: "対応していない画像形式です", status: 400 };
		}

		return { buffer, mimeType };
	} catch (error) {
		console.error("x-post analyze-image load stored image failed", error);
		return { error: "保存済み画像を取得できませんでした", status: 500 };
	}
}

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const image = getUploadFile(formData, "image");
	const imageKey = String(formData.get("image_key") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();

	let buffer: ArrayBuffer;
	let mimeType: string;

	if (image) {
		if (image.size > MAX_IMAGE_BYTES) {
			return NextResponse.json({ error: "画像は 8MB 以下にしてください" }, { status: 400 });
		}

		mimeType = image.type?.trim() || "image/webp";
		if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
			return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
		}

		buffer = await image.arrayBuffer();
	} else if (imageKey) {
		const stored = await loadStoredXPostImage(imageKey);
		if ("error" in stored) {
			return NextResponse.json({ error: stored.error }, { status: stored.status });
		}
		buffer = stored.buffer;
		mimeType = stored.mimeType;
	} else {
		return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
	}

	try {
		const result = await suggestXPostFromImage(buffer, {
			notes: notes || undefined,
			mimeType,
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("x-post analyze-image failed", error);
		const message = error instanceof Error ? error.message : "投稿文の生成に失敗しました";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

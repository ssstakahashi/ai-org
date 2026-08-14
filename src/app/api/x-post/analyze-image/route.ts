import { NextRequest, NextResponse } from "next/server";
import { suggestXPostBodyFromImage } from "@/lib/x-post-ai";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/"];

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const image = formData.get("image");
	const title = String(formData.get("title") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();

	if (!(image instanceof File) || image.size === 0) {
		return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
	}

	if (image.size > MAX_IMAGE_BYTES) {
		return NextResponse.json({ error: "画像は 8MB 以下にしてください" }, { status: 400 });
	}

	const mimeType = image.type || "application/octet-stream";
	if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
		return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
	}

	try {
		const buffer = await image.arrayBuffer();
		const body = await suggestXPostBodyFromImage(buffer, {
			title: title || undefined,
			notes: notes || undefined,
		});
		return NextResponse.json({ body });
	} catch (error) {
		console.error("x-post analyze-image failed", error);
		const message = error instanceof Error ? error.message : "投稿文の生成に失敗しました";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

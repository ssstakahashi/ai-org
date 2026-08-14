import { NextRequest, NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/transcribe-audio";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["audio/", "video/webm"];

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const audio = formData.get("audio");

	if (!(audio instanceof File) || audio.size === 0) {
		return NextResponse.json({ error: "音声ファイルが必要です" }, { status: 400 });
	}

	if (audio.size > MAX_AUDIO_BYTES) {
		return NextResponse.json({ error: "音声は 5MB 以下にしてください" }, { status: 400 });
	}

	const mimeType = audio.type || "application/octet-stream";
	if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
		return NextResponse.json({ error: "対応していない音声形式です" }, { status: 400 });
	}

	try {
		const buffer = await audio.arrayBuffer();
		const text = await transcribeAudioBuffer(buffer);
		return NextResponse.json({ text });
	} catch (error) {
		console.error("transcribe failed", error);
		const message = error instanceof Error ? error.message : "文字起こしに失敗しました";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

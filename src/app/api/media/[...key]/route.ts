import { NextRequest, NextResponse } from "next/server";
import { getMediaBucket } from "@/lib/db";
import { isAllowedMediaKey } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
	const { key: parts } = await context.params;
	const key = parts.map((part) => decodeURIComponent(part)).join("/");

	if (!isAllowedMediaKey(key)) {
		return new NextResponse("Not found", { status: 404 });
	}

	try {
		const media = await getMediaBucket();
		const object = await media.get(key);
		if (!object) {
			return new NextResponse("Not found", { status: 404 });
		}

		const headers = new Headers();
		const contentType =
			object.httpMetadata?.contentType || "application/octet-stream";
		headers.set("Content-Type", contentType);
		headers.set("Cache-Control", "private, max-age=3600");
		if (object.size != null) {
			headers.set("Content-Length", String(object.size));
		}

		return new NextResponse(object.body, { status: 200, headers });
	} catch (error) {
		console.error("media serve failed", error);
		return new NextResponse("Failed to load media", { status: 500 });
	}
}

import { NextRequest, NextResponse } from "next/server";
import { fetchLinkPreview, isValidPreviewUrl } from "@/lib/link-preview";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";
	if (!url || !isValidPreviewUrl(url)) {
		return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
	}

	try {
		const preview = await fetchLinkPreview(url);
		return NextResponse.json(preview, {
			headers: {
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (error) {
		console.error("link preview failed", url, error);
		return NextResponse.json({ error: "Preview unavailable" }, { status: 502 });
	}
}

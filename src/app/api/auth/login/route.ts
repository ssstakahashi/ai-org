import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
	createSessionToken,
	isAuthConfigured,
	sessionCookieOptions,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SEC,
	verifyPassword,
} from "@/lib/app-auth";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | null) {
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return "/";
	}
	return value;
}

export async function POST(request: NextRequest) {
	const { env } = await getCloudflareContext({ async: true });
	if (!isAuthConfigured(env)) {
		return NextResponse.json(
			{ error: "Server misconfiguration: set APP_AUTH_PASSWORD and APP_AUTH_SECRET" },
			{ status: 503 },
		);
	}

	let body: { password?: string; next?: string };
	try {
		body = (await request.json()) as { password?: string; next?: string };
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const password = typeof body.password === "string" ? body.password : "";
	if (!verifyPassword(password, env.APP_AUTH_PASSWORD!.trim())) {
		return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 });
	}

	const token = await createSessionToken(env.APP_AUTH_SECRET!.trim());
	const secure = request.nextUrl.protocol === "https:";
	const response = NextResponse.json({
		ok: true,
		redirectTo: safeNextPath(body.next ?? null),
	});
	response.cookies.set(
		SESSION_COOKIE_NAME,
		token,
		sessionCookieOptions(SESSION_MAX_AGE_SEC, secure),
	);
	return response;
}

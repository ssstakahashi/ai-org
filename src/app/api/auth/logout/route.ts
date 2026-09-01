import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

function logoutResponse(request: NextRequest) {
	const secure = request.nextUrl.protocol === "https:";
	const response = NextResponse.redirect(new URL("/login", request.url));
	response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions(secure));
	return response;
}

export async function GET(request: NextRequest) {
	return logoutResponse(request);
}

export async function POST(request: NextRequest) {
	return logoutResponse(request);
}

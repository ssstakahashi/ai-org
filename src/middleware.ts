import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
	isAuthConfigured,
	isLocalHostname,
	SESSION_COOKIE_NAME,
	verifySessionToken,
} from "@/lib/app-auth";

function withPathname(response: NextResponse, pathname: string) {
	response.headers.set("x-pathname", pathname);
	return response;
}

function isInternalApiPath(pathname: string) {
	return (
		pathname === "/api/internal/automation-ingest" ||
		pathname === "/api/internal/requirements"
	);
}

function loginRedirect(request: NextRequest) {
	const loginUrl = new URL("/login", request.url);
	const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
	if (next && next !== "/login") {
		loginUrl.searchParams.set("next", next);
	}
	return withPathname(NextResponse.redirect(loginUrl), "/login");
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (isLocalHostname(request.nextUrl.hostname)) {
		return withPathname(NextResponse.next(), pathname);
	}

	if (isInternalApiPath(pathname) || pathname === "/api/auth/login") {
		return withPathname(NextResponse.next(), pathname);
	}

	const { env } = await getCloudflareContext({ async: true });
	if (!isAuthConfigured(env)) {
		return withPathname(
			new NextResponse("Auth configuration missing", { status: 500 }),
			pathname,
		);
	}

	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	let sessionValid = false;
	if (token) {
		try {
			await verifySessionToken(token, env.APP_AUTH_SECRET!.trim());
			sessionValid = true;
		} catch {
			sessionValid = false;
		}
	}

	if (pathname === "/login") {
		if (sessionValid) {
			const next = request.nextUrl.searchParams.get("next");
			const destination =
				next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
			return withPathname(NextResponse.redirect(new URL(destination, request.url)), pathname);
		}
		return withPathname(NextResponse.next(), pathname);
	}

	if (!sessionValid) {
		return loginRedirect(request);
	}

	return withPathname(NextResponse.next(), pathname);
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isLocalHostname, verifyAccessJwt } from "@/lib/access";

export async function middleware(request: NextRequest) {
	if (isLocalHostname(request.nextUrl.hostname)) {
		return NextResponse.next();
	}

	// agri 等からの push。エッジ Access Bypass と併用し、アプリ側は共有シークレットのみ検証する
	if (
		request.nextUrl.pathname === "/api/internal/automation-ingest" ||
		request.nextUrl.pathname === "/api/internal/requirements"
	) {
		return NextResponse.next();
	}

	const { env } = await getCloudflareContext({ async: true });

	if (!env.POLICY_AUD || !env.TEAM_DOMAIN) {
		return new NextResponse("Access configuration missing", { status: 500 });
	}

	const token = request.headers.get("cf-access-jwt-assertion");
	if (!token) {
		return new NextResponse("Missing required CF Access JWT", { status: 403 });
	}

	try {
		await verifyAccessJwt(token, env);
		return NextResponse.next();
	} catch {
		return new NextResponse("Invalid CF Access JWT", { status: 403 });
	}
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

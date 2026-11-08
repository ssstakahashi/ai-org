import { cookies, headers } from "next/headers";
import { getAppEnv } from "@/lib/app-env";
import {
	isAuthConfigured,
	isLocalHostname,
	SESSION_COOKIE_NAME,
	verifySessionToken,
} from "@/lib/app-auth";

/** localhost はミドルウェアと同じくログイン済みとして扱う。本番ホストだけ Cookie を検証する。 */
export async function requestHasAppSession() {
	const headerList = await headers();
	const host = headerList.get("host")?.split(":")[0]?.trim() ?? "";
	if (isLocalHostname(host)) return true;

	const env = getAppEnv();
	if (!isAuthConfigured(env)) return false;

	const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
	if (!token) return false;

	try {
		await verifySessionToken(token, env.APP_AUTH_SECRET!.trim());
		return true;
	} catch {
		return false;
	}
}

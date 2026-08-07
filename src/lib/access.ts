import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, jwtVerify } from "jose";

type AccessEnv = {
	POLICY_AUD?: string;
	TEAM_DOMAIN?: string;
};

export async function verifyAccessJwt(token: string, env: AccessEnv) {
	const policyAud = env.POLICY_AUD;
	const teamDomain = env.TEAM_DOMAIN;

	if (!policyAud || !teamDomain) {
		throw new Error("Missing POLICY_AUD or TEAM_DOMAIN");
	}

	const issuer = teamDomain.replace(/\/$/, "");
	const JWKS = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

	return jwtVerify(token, JWKS, {
		issuer,
		audience: policyAud,
	});
}

export function isLocalHostname(hostname: string) {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Cloudflare Access のセッションを終了する URL */
export function accessLogoutUrl(teamDomain: string) {
	return `${teamDomain.replace(/\/$/, "")}/cdn-cgi/access/logout`;
}

/** 環境に応じたログアウト URL（ローカル等で CF コンテキストが無い場合はフォールバック） */
export async function resolveAccessLogoutHref() {
	try {
		const { env } = await getCloudflareContext({ async: true });
		if (env.TEAM_DOMAIN) {
			return accessLogoutUrl(env.TEAM_DOMAIN);
		}
	} catch {
		// next dev など Cloudflare コンテキストがない場合
	}
	return "/cdn-cgi/access/logout";
}

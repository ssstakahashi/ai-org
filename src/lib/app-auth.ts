import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "ai-org-session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

type AppAuthEnv = {
	APP_AUTH_PASSWORD?: string;
	APP_AUTH_SECRET?: string;
};

export function isLocalHostname(hostname: string) {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isAuthConfigured(env: AppAuthEnv) {
	return Boolean(env.APP_AUTH_PASSWORD?.trim() && env.APP_AUTH_SECRET?.trim());
}

export function verifyPassword(input: string, expected: string) {
	if (input.length !== expected.length) {
		return false;
	}

	let mismatch = 0;
	for (let i = 0; i < input.length; i += 1) {
		mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return mismatch === 0;
}

function secretKey(secret: string) {
	return new TextEncoder().encode(secret);
}

export async function createSessionToken(secret: string) {
	return new SignJWT({ role: "admin" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
		.sign(secretKey(secret));
}

export async function verifySessionToken(token: string, secret: string) {
	return jwtVerify(token, secretKey(secret), {
		algorithms: ["HS256"],
	});
}

export function sessionCookieOptions(maxAge: number, secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: "lax" as const,
		path: "/",
		maxAge,
	};
}

export function clearSessionCookieOptions(secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: "lax" as const,
		path: "/",
		maxAge: 0,
	};
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

type TokenCache = {
	accessToken: string;
	expiresAt: number;
};

const tokenCaches = new Map<string, TokenCache>();

function cacheKey(parts: string[]): string {
	return parts.join("|");
}

function readCache(key: string, now: number): string | null {
	const cached = tokenCaches.get(key);
	if (cached && cached.expiresAt > now + 60) {
		return cached.accessToken;
	}
	return null;
}

function writeCache(key: string, accessToken: string, expiresIn: number, now: number): string {
	tokenCaches.set(key, {
		accessToken,
		expiresAt: now + expiresIn,
	});
	return accessToken;
}

function base64url(input: string | ArrayBuffer): string {
	const bytes =
		typeof input === "string"
			? new TextEncoder().encode(input)
			: new Uint8Array(input);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
	const normalized = pem.replace(/\\n/g, "\n");
	const b64 = normalized
		.replace(/-----BEGIN PRIVATE KEY-----/, "")
		.replace(/-----END PRIVATE KEY-----/, "")
		.replace(/\s/g, "");
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

async function signJwt(
	header: Record<string, string>,
	payload: Record<string, string | number>,
	privateKeyPem: string,
): Promise<string> {
	const encodedHeader = base64url(JSON.stringify(header));
	const encodedPayload = base64url(JSON.stringify(payload));
	const unsigned = `${encodedHeader}.${encodedPayload}`;

	const key = await crypto.subtle.importKey(
		"pkcs8",
		pemToPkcs8(privateKeyPem),
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(unsigned),
	);

	return `${unsigned}.${base64url(signature)}`;
}

type ServiceAccountTokenOptions = {
	scope?: string;
	/** Workspace ドメイン全体委任でなりすますユーザー（Tasks などユーザー所有データ向け） */
	subject?: string;
};

async function exchangeJwtAssertion(jwt: string): Promise<{ access_token?: string; expires_in?: number }> {
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Google token exchange failed (${response.status}): ${text.slice(0, 500)}`);
	}

	return (await response.json()) as { access_token?: string; expires_in?: number };
}

/** Google Service Account からアクセストークンを取得（既定は Sheets スコープ） */
export async function getGoogleAccessToken(
	serviceAccountEmail: string,
	privateKeyPem: string,
	options?: ServiceAccountTokenOptions,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const scope = options?.scope ?? SHEETS_SCOPE;
	const subject = options?.subject?.trim() || undefined;
	const key = cacheKey(["sa", serviceAccountEmail, scope, subject ?? ""]);
	const cached = readCache(key, now);
	if (cached) return cached;

	const payload: Record<string, string | number> = {
		iss: serviceAccountEmail,
		scope,
		aud: TOKEN_URL,
		iat: now,
		exp: now + 3600,
	};
	if (subject) payload.sub = subject;

	const jwt = await signJwt({ alg: "RS256", typ: "JWT" }, payload, privateKeyPem);
	const data = await exchangeJwtAssertion(jwt);
	if (!data.access_token) {
		throw new Error("Google token response missing access_token");
	}

	return writeCache(key, data.access_token, data.expires_in ?? 3600, now);
}

/** ユーザー OAuth のリフレッシュトークンからアクセストークンを取得 */
export async function getGoogleOAuthAccessToken(
	clientId: string,
	clientSecret: string,
	refreshToken: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const key = cacheKey(["oauth", clientId, refreshToken.slice(0, 12)]);
	const cached = readCache(key, now);
	if (cached) return cached;

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Google OAuth refresh failed (${response.status}): ${text.slice(0, 500)}`);
	}

	const data = (await response.json()) as { access_token?: string; expires_in?: number };
	if (!data.access_token) {
		throw new Error("Google OAuth token response missing access_token");
	}

	return writeCache(key, data.access_token, data.expires_in ?? 3600, now);
}

export type GoogleTasksAuthEnv = {
	GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
	GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
	GOOGLE_TASKS_IMPERSONATE_EMAIL?: string;
	GOOGLE_TASKS_CLIENT_ID?: string;
	GOOGLE_TASKS_CLIENT_SECRET?: string;
	GOOGLE_TASKS_REFRESH_TOKEN?: string;
	GOOGLE_TASKS_OAUTH_REDIRECT_URI?: string;
};

export const GOOGLE_TASKS_OAUTH_REDIRECT_URI_DEFAULT =
	"https://ai-org.s-takahashi-241.workers.dev";

export function googleTasksOauthRedirectUri(env: GoogleTasksAuthEnv): string {
	return env.GOOGLE_TASKS_OAUTH_REDIRECT_URI?.trim() || GOOGLE_TASKS_OAUTH_REDIRECT_URI_DEFAULT;
}

export function isGoogleTasksOAuthClientConfigured(env: GoogleTasksAuthEnv): boolean {
	return (
		Boolean(env.GOOGLE_TASKS_CLIENT_ID?.trim()) && Boolean(env.GOOGLE_TASKS_CLIENT_SECRET?.trim())
	);
}

export function isGoogleTasksAuthConfigured(
	env: GoogleTasksAuthEnv,
	storedRefreshToken?: string | null,
): boolean {
	const refresh = env.GOOGLE_TASKS_REFRESH_TOKEN?.trim() || storedRefreshToken?.trim();
	const oauth = isGoogleTasksOAuthClientConfigured(env) && Boolean(refresh);
	const dwd =
		Boolean(env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()) &&
		Boolean(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()) &&
		Boolean(env.GOOGLE_TASKS_IMPERSONATE_EMAIL?.trim());
	return oauth || dwd;
}

export async function exchangeGoogleOauthCode(
	env: GoogleTasksAuthEnv,
	code: string,
): Promise<string> {
	const clientId = env.GOOGLE_TASKS_CLIENT_ID?.trim();
	const clientSecret = env.GOOGLE_TASKS_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) {
		throw new Error("GOOGLE_TASKS_CLIENT_ID / SECRET が未設定です");
	}
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: googleTasksOauthRedirectUri(env),
			grant_type: "authorization_code",
		}),
	});
	const data = (await response.json()) as {
		refresh_token?: string;
		error?: string;
		error_description?: string;
	};
	if (!data.refresh_token) {
		throw new Error(
			data.error_description || data.error || "Google から refresh_token を取得できませんでした",
		);
	}
	return data.refresh_token;
}

/**
 * Google Tasks 用トークン。
 * 個人 Gmail は OAuth リフレッシュトークンを優先。Workspace は SA + なりすましメール。
 */
export async function getGoogleTasksAccessToken(
	env: GoogleTasksAuthEnv,
	storedRefreshToken?: string | null,
): Promise<string> {
	const clientId = env.GOOGLE_TASKS_CLIENT_ID?.trim();
	const clientSecret = env.GOOGLE_TASKS_CLIENT_SECRET?.trim();
	const refreshToken = env.GOOGLE_TASKS_REFRESH_TOKEN?.trim() || storedRefreshToken?.trim();
	if (clientId && clientSecret && refreshToken) {
		return getGoogleOAuthAccessToken(clientId, clientSecret, refreshToken);
	}

	const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
	const subject = env.GOOGLE_TASKS_IMPERSONATE_EMAIL?.trim();
	if (email && privateKey && subject) {
		return getGoogleAccessToken(email, privateKey, { scope: TASKS_SCOPE, subject });
	}

	throw new Error(
		"Google Tasks の認証が未設定です。OAuth（GOOGLE_TASKS_CLIENT_ID / SECRET / REFRESH_TOKEN）か、Workspace ドメイン委任（GOOGLE_TASKS_IMPERSONATE_EMAIL + Service Account）を設定してください。",
	);
}

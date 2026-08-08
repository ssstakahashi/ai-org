const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type TokenCache = {
	accessToken: string;
	expiresAt: number;
};

let tokenCache: TokenCache | null = null;

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

/** Google Service Account から Sheets API 用アクセストークンを取得 */
export async function getGoogleAccessToken(
	serviceAccountEmail: string,
	privateKeyPem: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (tokenCache && tokenCache.expiresAt > now + 60) {
		return tokenCache.accessToken;
	}

	const jwt = await signJwt(
		{ alg: "RS256", typ: "JWT" },
		{
			iss: serviceAccountEmail,
			scope: SHEETS_SCOPE,
			aud: TOKEN_URL,
			iat: now,
			exp: now + 3600,
		},
		privateKeyPem,
	);

	const body = new URLSearchParams({
		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		assertion: jwt,
	});

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Google token exchange failed (${response.status}): ${text.slice(0, 500)}`);
	}

	const data = (await response.json()) as { access_token?: string; expires_in?: number };
	if (!data.access_token) {
		throw new Error("Google token response missing access_token");
	}

	tokenCache = {
		accessToken: data.access_token,
		expiresAt: now + (data.expires_in ?? 3600),
	};

	return data.access_token;
}

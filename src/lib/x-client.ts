export type XCredentials = {
	apiKey: string;
	apiSecret: string;
	accessToken: string;
	accessTokenSecret: string;
};

function percentEncode(value: string) {
	return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
		`%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

function toBase64(buffer: ArrayBuffer) {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

async function hmacSha1Base64(key: string, data: string) {
	const enc = new TextEncoder();
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		enc.encode(key),
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
	return toBase64(signature);
}

async function oauthHeader(
	method: string,
	url: string,
	creds: XCredentials,
	extraParams: Record<string, string> = {},
) {
	const oauthParams: Record<string, string> = {
		oauth_consumer_key: creds.apiKey,
		oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
		oauth_signature_method: "HMAC-SHA1",
		oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
		oauth_token: creds.accessToken,
		oauth_version: "1.0",
	};

	const allParams = { ...extraParams, ...oauthParams };
	const paramString = Object.keys(allParams)
		.sort()
		.map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
		.join("&");

	const baseString = [
		method.toUpperCase(),
		percentEncode(url),
		percentEncode(paramString),
	].join("&");

	const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`;
	oauthParams.oauth_signature = await hmacSha1Base64(signingKey, baseString);

	const header =
		"OAuth " +
		Object.keys(oauthParams)
			.sort()
			.map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
			.join(", ");

	return header;
}

export function getXCredentials(env: {
	X_API_KEY?: string;
	X_API_SECRET?: string;
	X_ACCESS_TOKEN?: string;
	X_ACCESS_TOKEN_SECRET?: string;
}): XCredentials {
	const apiKey = env.X_API_KEY?.trim();
	const apiSecret = env.X_API_SECRET?.trim();
	const accessToken = env.X_ACCESS_TOKEN?.trim();
	const accessTokenSecret = env.X_ACCESS_TOKEN_SECRET?.trim();

	if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
		throw new Error("X API の認証情報が不足しています（.dev.vars / Secrets を確認）");
	}

	return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/** X API v1.1 media upload → media_id_string */
export async function uploadXMedia(
	creds: XCredentials,
	bytes: ArrayBuffer,
	contentType: string,
): Promise<string> {
	const url = "https://upload.twitter.com/1.1/media/upload.json";
	const form = new FormData();
		form.append("media", new Blob([new Uint8Array(bytes)], { type: contentType }), "media");

	const auth = await oauthHeader("POST", url, creds);
	const res = await fetch(url, {
		method: "POST",
		headers: { Authorization: auth },
		body: form,
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`X media upload failed (${res.status}): ${text.slice(0, 400)}`);
	}

	const json = JSON.parse(text) as { media_id_string?: string };
	if (!json.media_id_string) {
		throw new Error("X media upload: media_id_string がありません");
	}
	return json.media_id_string;
}

/** X API v2 create post */
export async function createXPost(
	creds: XCredentials,
	input: { text: string; mediaIds?: string[] },
): Promise<{ id: string }> {
	const url = "https://api.x.com/2/tweets";
	const body: Record<string, unknown> = { text: input.text };
	if (input.mediaIds?.length) {
		body.media = { media_ids: input.mediaIds };
	}

	const auth = await oauthHeader("POST", url, creds);
	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: auth,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`X post failed (${res.status}): ${text.slice(0, 500)}`);
	}

	const json = JSON.parse(text) as { data?: { id?: string } };
	const id = json.data?.id;
	if (!id) {
		throw new Error("X post: data.id がありません");
	}
	return { id };
}

export type LinkPreview = {
	url: string;
	title: string | null;
	description: string | null;
	image: string | null;
	siteName: string | null;
};

const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

export function isValidPreviewUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return false;
		}
		const host = parsed.hostname.toLowerCase();
		if (
			host === "localhost" ||
			host.endsWith(".localhost") ||
			host === "127.0.0.1" ||
			host === "0.0.0.0" ||
			host === "::1" ||
			host.startsWith("10.") ||
			host.startsWith("192.168.") ||
			/^172\.(1[6-9]|2\d|3[01])\./.test(host)
		) {
			return false;
		}
		return true;
	} catch {
		return false;
	}
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'");
}

function extractMetaContent(html: string, key: string): string | null {
	const patterns = [
		new RegExp(
			`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
			"i",
		),
		new RegExp(
			`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
			"i",
		),
	];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return decodeHtmlEntities(match[1].trim());
		}
	}
	return null;
}

function extractTitle(html: string): string | null {
	const ogTitle = extractMetaContent(html, "og:title");
	if (ogTitle) return ogTitle;
	const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
	return titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1].trim()) : null;
}

function resolveUrl(baseUrl: string, maybeRelative: string | null): string | null {
	if (!maybeRelative) return null;
	try {
		return new URL(maybeRelative, baseUrl).toString();
	} catch {
		return null;
	}
}

async function readLimitedText(response: Response): Promise<string> {
	const reader = response.body?.getReader();
	if (!reader) {
		const text = await response.text();
		return text.slice(0, MAX_HTML_BYTES);
	}

	const decoder = new TextDecoder();
	let total = 0;
	let html = "";

	while (total < MAX_HTML_BYTES) {
		const { done, value } = await reader.read();
		if (done || !value) break;
		total += value.byteLength;
		html += decoder.decode(value, { stream: true });
	}

	reader.cancel().catch(() => undefined);
	return html.slice(0, MAX_HTML_BYTES);
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
	if (!isValidPreviewUrl(url)) {
		throw new Error("Invalid URL");
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": "ai-org-link-preview/1.0",
			},
			redirect: "follow",
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
			return {
				url,
				title: null,
				description: null,
				image: null,
				siteName: null,
			};
		}

		const html = await readLimitedText(response);
		const title = extractTitle(html);
		const description =
			extractMetaContent(html, "og:description") ??
			extractMetaContent(html, "description");
		const image = resolveUrl(
			url,
			extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image"),
		);
		const siteName =
			extractMetaContent(html, "og:site_name") ?? new URL(url).hostname.replace(/^www\./, "");

		return {
			url,
			title,
			description,
			image,
			siteName,
		};
	} finally {
		clearTimeout(timeout);
	}
}

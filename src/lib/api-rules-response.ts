import { apiRulesSpecPayload, readApiRulesMarkdown } from "@/lib/api-rules-doc";
import { buildApiRulesHtmlPage } from "@/lib/api-rules-html";
import { apiJson } from "@/lib/api-v1/http";
import { getAppEnv } from "@/lib/app-env";

export type ApiRulesResponseFormat = "json" | "html" | "markdown";

function pickFormat(accept: string, defaultFormat: ApiRulesResponseFormat): ApiRulesResponseFormat {
	if (accept.includes("text/markdown")) return "markdown";
	if (accept.includes("application/json")) return "json";
	if (accept.includes("text/html")) return "html";
	return defaultFormat;
}

export function respondApiRulesDocument(
	requestId: string,
	markdown: string,
	acceptHeader: string | null,
	defaultFormat: ApiRulesResponseFormat,
): Response {
	const format = pickFormat(acceptHeader ?? "", defaultFormat);
	if (format === "markdown") {
		return new Response(markdown, {
			status: 200,
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"X-Request-Id": requestId,
			},
		});
	}
	if (format === "html") {
		const html = buildApiRulesHtmlPage(markdown, getAppEnv().APP_PUBLIC_URL);
		return new Response(html, {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"X-Request-Id": requestId,
			},
		});
	}
	return apiJson(apiRulesSpecPayload(markdown), 200, requestId);
}

export function loadApiRulesMarkdown(): string {
	return readApiRulesMarkdown();
}

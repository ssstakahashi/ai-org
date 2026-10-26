import fs from "node:fs";
import path from "node:path";
import { getAppEnv } from "@/lib/app-env";

const DEFAULT_PUBLIC_ORIGIN = "https://ai-org.studiofoods.net";

export function resolveApiV1BaseUrl(publicUrl?: string | null): string {
	const raw = (publicUrl?.trim() || process.env.APP_PUBLIC_URL?.trim() || DEFAULT_PUBLIC_ORIGIN).replace(
		/\/$/,
		"",
	);
	return `${raw}/api/v1`;
}

export function readApiRulesMarkdown(): string {
	const docPath = path.join(process.cwd(), "docs", "api-rules.md");
	const raw = fs.readFileSync(docPath, "utf-8");
	const base = resolveApiV1BaseUrl(getAppEnv().APP_PUBLIC_URL);
	return raw.replaceAll("{{API_V1_BASE}}", base);
}

export function apiRulesSpecPayload(markdown: string) {
	const base = resolveApiV1BaseUrl(getAppEnv().APP_PUBLIC_URL);
	return {
		format: "markdown",
		source: "docs/api-rules.md",
		base_url: base,
		ui_path: "/api-rules",
		markdown,
	};
}

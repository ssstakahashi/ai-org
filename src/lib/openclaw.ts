/** OpenClaw Control UI の URL（Cloudflare Tunnel + Access 等で公開した HTTPS を想定）。 */

export function normalizeOpenClawControlUiUrl(raw: string | undefined): string | null {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

export function getOpenClawControlUiUrl(env: { OPENCLAW_CONTROL_UI_URL?: string }): string | null {
	return normalizeOpenClawControlUiUrl(env.OPENCLAW_CONTROL_UI_URL);
}

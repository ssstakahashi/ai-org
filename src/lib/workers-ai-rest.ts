export function workersAiRunUrl(accountId: string, model: string) {
	// モデル名は @cf/openai/... のようにスラッシュを含む。encodeURIComponent すると 404 になる。
	return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

export function getWorkersAiAccountId(env: CloudflareEnv): string | undefined {
	return env.CF_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
}

function nonEmptyToken(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export function getWorkersAiApiToken(env: CloudflareEnv): string | undefined {
	return (
		nonEmptyToken(env.CF_WORKERS_AI_API_TOKEN) ??
		nonEmptyToken(process.env.CF_WORKERS_AI_API_TOKEN) ??
		nonEmptyToken(env.CF_API_TOKEN) ??
		nonEmptyToken(process.env.CF_API_TOKEN) ??
		nonEmptyToken(env.CLOUDFLARE_API_TOKEN) ??
		nonEmptyToken(process.env.CLOUDFLARE_API_TOKEN)
	);
}

export function shouldUseWorkersAiRestApi(env: CloudflareEnv) {
	return Boolean(getWorkersAiApiToken(env) && getWorkersAiAccountId(env));
}

type CloudflareApiResponse<T> = {
	success?: boolean;
	result?: T;
	errors?: { message?: string }[];
};

export async function runWorkersAiRestApi<T>(
	accountId: string,
	apiToken: string,
	model: string,
	input: Record<string, unknown>,
): Promise<T> {
	const response = await fetch(workersAiRunUrl(accountId, model), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	const payload = (await response.json()) as CloudflareApiResponse<T>;
	if (!response.ok || payload.success === false) {
		const message =
			payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
			`Workers AI API error (${response.status})`;
		throw new Error(message);
	}

	return payload.result as T;
}

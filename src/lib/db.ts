import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb() {
	const { env } = await getCloudflareContext({ async: true });
	return env.DB;
}

export async function getMediaBucket() {
	const { env } = await getCloudflareContext({ async: true });
	if (!env.MEDIA) {
		throw new Error("MEDIA (R2) バインディングがありません");
	}
	return env.MEDIA;
}

export function newId(prefix: string) {
	return `${prefix}_${crypto.randomUUID()}`;
}

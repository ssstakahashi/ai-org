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

/** D1/SQLite のバインド変数上限を避けるため、IN 句を分割して問い合わせる */
export const D1_IN_CLAUSE_CHUNK_SIZE = 50;

export async function queryInChunks<T>(
	db: D1Database,
	ids: string[],
	buildSql: (placeholders: string) => string,
): Promise<T[]> {
	if (ids.length === 0) return [];

	const rows: T[] = [];
	for (let offset = 0; offset < ids.length; offset += D1_IN_CLAUSE_CHUNK_SIZE) {
		const chunk = ids.slice(offset, offset + D1_IN_CLAUSE_CHUNK_SIZE);
		const placeholders = chunk.map(() => "?").join(", ");
		const { results } = await db.prepare(buildSql(placeholders)).bind(...chunk).all<T>();
		if (results) rows.push(...results);
	}
	return rows;
}

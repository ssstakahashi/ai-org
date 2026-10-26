/** 長い IN 句を分割して問い合わせる。DB 接続は持たない。 */

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

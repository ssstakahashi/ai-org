import { getAppEnv } from "@/lib/app-env";
import { getMediaBucket as openMediaBucket } from "@/lib/media-store";
import { getPgDatabase } from "@/lib/pg-db";

export type BoundEnv = CloudflareEnv & {
	DB: D1Database;
	MEDIA: R2Bucket;
};

export async function getDb(): Promise<D1Database> {
	return getPgDatabase();
}

export function getMediaBucket(): R2Bucket {
	return openMediaBucket();
}

/** 秘密情報に DB と画像ストレージを足した実行時環境。 */
export async function getBoundEnv(): Promise<BoundEnv> {
	return {
		...getAppEnv(),
		DB: await getDb(),
		MEDIA: getMediaBucket(),
	};
}

export { newId } from "@/lib/ids";
export { D1_IN_CLAUSE_CHUNK_SIZE, queryInChunks } from "@/lib/db-query";

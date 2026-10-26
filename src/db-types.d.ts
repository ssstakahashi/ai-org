/** D1 の呼び出し形だけを残した型。実装は PostgreSQL。 */

interface D1Result<T = Record<string, unknown>> {
	results?: T[];
	success: boolean;
	meta: {
		duration: number;
		changes: number;
	};
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	run(): Promise<D1Result>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface R2HttpMetadata {
	contentType?: string;
}

interface R2PutOptions {
	httpMetadata?: R2HttpMetadata;
}

interface R2ObjectBody {
	body: ReadableStream;
	size: number;
	httpMetadata?: R2HttpMetadata;
	arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2Bucket {
	get(key: string): Promise<R2ObjectBody | null>;
	put(
		key: string,
		value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
		options?: R2PutOptions,
	): Promise<void>;
	delete(key: string): Promise<void>;
}

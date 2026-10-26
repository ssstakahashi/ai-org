import { Pool, type PoolClient, type QueryResult } from "pg";
import { translateSql } from "@/lib/sql-translate";

let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL?.trim();
		if (!connectionString) {
			throw new Error("DATABASE_URL が未設定です");
		}
		pool = new Pool({ connectionString });
	}
	return pool;
}

function toParams(values: unknown[]): unknown[] {
	return values.map((value) => (value === undefined ? null : value));
}

type ExecuteMode = "all" | "first" | "run";

class PgStatement implements D1PreparedStatement {
	private params: unknown[] = [];

	constructor(
		private readonly database: PgDatabase,
		private readonly sql: string,
	) {}

	bind(...values: unknown[]): D1PreparedStatement {
		const next = new PgStatement(this.database, this.sql);
		next.params = toParams(values);
		return next;
	}

	async first<T = Record<string, unknown>>(): Promise<T | null> {
		const row = await this.database.execute<T>(this.sql, this.params, "first");
		return (row ?? null) as T | null;
	}

	async run(): Promise<D1Result> {
		const result = await this.database.execute(this.sql, this.params, "run");
		return result as D1Result;
	}

	async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
		const result = await this.database.execute<T>(this.sql, this.params, "all");
		return result as D1Result<T>;
	}

	executeOn<T>(client: PoolClient, mode: ExecuteMode): Promise<D1Result<T> | T | null> {
		return this.database.executeOn(client, this.sql, this.params, mode);
	}
}

function toResult<T>(result: QueryResult): D1Result<T> {
	return {
		success: true,
		results: result.rows as T[],
		meta: {
			duration: 0,
			changes: result.rowCount ?? 0,
		},
	};
}

class PgDatabase implements D1Database {
	constructor(private readonly pool: Pool) {}

	prepare(query: string): D1PreparedStatement {
		return new PgStatement(this, translateSql(query));
	}

	async execute<T>(sql: string, params: unknown[], mode: ExecuteMode): Promise<D1Result<T> | T | null> {
		const client = await this.pool.connect();
		try {
			return await this.executeOn<T>(client, sql, params, mode);
		} finally {
			client.release();
		}
	}

	async executeOn<T>(
		client: PoolClient,
		sql: string,
		params: unknown[],
		mode: ExecuteMode,
	): Promise<D1Result<T> | T | null> {
		const result = await client.query(sql, params);
		if (mode === "first") {
			return (result.rows[0] as T | undefined) ?? null;
		}
		return toResult<T>(result);
	}

	async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			const results: D1Result<T>[] = [];
			for (const statement of statements) {
				if (!(statement instanceof PgStatement)) {
					throw new Error("batch には prepare() で作った文だけ渡せます");
				}
				const result = await statement.executeOn<T>(client, "all");
				results.push(result as D1Result<T>);
			}
			await client.query("COMMIT");
			return results;
		} catch (error) {
			try {
				await client.query("ROLLBACK");
			} catch (rollbackError) {
				console.error("postgres rollback failed", rollbackError);
			}
			throw error;
		} finally {
			client.release();
		}
	}
}

let database: PgDatabase | null = null;

export function getPgDatabase(): D1Database {
	if (!database) {
		database = new PgDatabase(getPool());
	}
	return database;
}

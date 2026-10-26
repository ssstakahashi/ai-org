import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles([".env", "/etc/ai-org.env"]);

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
	console.error("DATABASE_URL が未設定です");
	process.exit(1);
}

function quoteIdent(name) {
	return `"${name.replaceAll('"', '""')}"`;
}

function normalize(value) {
	if (typeof value === "bigint") return Number(value);
	if (value instanceof Uint8Array) return Buffer.from(value);
	return value ?? null;
}

async function findSqlite(explicit) {
	if (explicit) return explicit;
	const root = path.join(process.cwd(), ".wrangler", "state", "v3", "d1");
	const found = [];
	async function walk(dir) {
		let entries = [];
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.name.endsWith(".sqlite")) found.push(full);
		}
	}
	await walk(root);
	if (found.length === 0) {
		throw new Error("ローカル D1 の SQLite がありません。先に npm run db:pull を実行してください。");
	}
	const sized = await Promise.all(
		found.map(async (file) => ({ file, size: (await stat(file)).size })),
	);
	sized.sort((a, b) => b.size - a.size);
	return sized[0].file;
}

const sqlitePath = await findSqlite(process.argv[2]);
console.log(`sqlite ${sqlitePath}`);
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

const sqliteTables = sqlite
	.prepare(
		`SELECT name FROM sqlite_master
		 WHERE type = 'table'
		   AND name NOT LIKE 'sqlite_%'
		   AND name NOT LIKE 'd1_%'
		   AND name NOT LIKE '!_cf!_%' ESCAPE '!'
		 ORDER BY name`,
	)
	.all()
	.map((row) => row.name);

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();
const summary = [];
try {
	const pgTables = new Set(
		(
			await client.query(
				`SELECT table_name FROM information_schema.tables
				 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
			)
		).rows.map((row) => row.table_name),
	);

	const tables = sqliteTables.filter((name) => {
		if (pgTables.has(name)) return true;
		console.warn(`skip ${name}: PostgreSQL にテーブルがありません`);
		return false;
	});
	if (tables.length === 0) {
		throw new Error("PostgreSQL に取り込むテーブルがありません。先に npm run pg:migrate を実行してください。");
	}

	await client.query("BEGIN");
	await client.query("SET CONSTRAINTS ALL DEFERRED");
	if (tables.length > 0) {
		await client.query(`TRUNCATE ${tables.map(quoteIdent).join(", ")} CASCADE`);
	}

	for (const table of tables) {
		const sqliteColumns = sqlite
			.prepare(`PRAGMA table_info(${quoteIdent(table)})`)
			.all()
			.map((row) => row.name);
		const pgColumns = new Set(
			(
				await client.query(
					`SELECT column_name FROM information_schema.columns
					 WHERE table_schema = 'public' AND table_name = $1`,
					[table],
				)
			).rows.map((row) => row.column_name),
		);
		const columns = sqliteColumns.filter((name) => pgColumns.has(name));
		const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
		let inserted = 0;
		const batchSize = 100;
		for (let offset = 0; offset < rows.length; offset += batchSize) {
			const batch = rows.slice(offset, offset + batchSize);
			const values = [];
			const tuples = batch.map((row) => {
				const placeholders = columns.map((column) => {
					values.push(normalize(row[column]));
					return `$${values.length}`;
				});
				return `(${placeholders.join(", ")})`;
			});
			if (tuples.length === 0) continue;
			await client.query(
				`INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES ${tuples.join(", ")}`,
				values,
			);
			inserted += batch.length;
		}
		summary.push({ table, sqlite: rows.length, inserted });
	}

	await client.query("COMMIT");

	let mismatch = false;
	for (const item of summary) {
		const count = await client.query(`SELECT count(*)::int AS count FROM ${quoteIdent(item.table)}`);
		const pgCount = count.rows[0].count;
		const ok = pgCount === item.sqlite;
		if (!ok) mismatch = true;
		console.log(`${ok ? "ok" : "MISMATCH"} ${item.table} sqlite=${item.sqlite} postgres=${pgCount}`);
	}
	if (mismatch) {
		console.error("件数が一致しないテーブルがあります");
		process.exitCode = 1;
	}
} catch (error) {
	try {
		await client.query("ROLLBACK");
	} catch {
		// すでに終わっている
	}
	throw error;
} finally {
	client.release();
	await pool.end();
	sqlite.close();
}

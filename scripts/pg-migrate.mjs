import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles([".env", "/etc/ai-org.env"]);

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
	console.error("DATABASE_URL が未設定です");
	process.exit(1);
}

const dir = path.join(process.cwd(), "migrations", "pg");
const files = (await readdir(dir))
	.filter((name) => name.endsWith(".sql"))
	.sort();

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();
try {
	await client.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		)
	`);

	for (const file of files) {
		const applied = await client.query("SELECT id FROM schema_migrations WHERE id = $1", [file]);
		if (applied.rowCount) {
			console.log(`skip ${file}`);
			continue;
		}
		const sql = await readFile(path.join(dir, file), "utf8");
		console.log(`apply ${file}`);
		try {
			await client.query("BEGIN");
			await client.query(sql);
			await client.query(
				"INSERT INTO schema_migrations (id, applied_at) VALUES ($1, to_char((clock_timestamp() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'))",
				[file],
			);
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		}
	}
} finally {
	client.release();
	await pool.end();
}

console.log("postgres migrations applied");

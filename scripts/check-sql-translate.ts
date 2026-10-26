import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { translateSql } from "../src/lib/sql-translate";

async function main() {

assert.equal(
	translateSql("SELECT * FROM t WHERE id = ? AND name = ?"),
	"SELECT * FROM t WHERE id = $1 AND name = $2",
);
assert.equal(translateSql("SELECT '?'"), "SELECT '?'");
assert.equal(
	translateSql("UPDATE t SET updated_at = datetime('now') WHERE id = ?"),
	"UPDATE t SET updated_at = app_now() WHERE id = $1",
);
assert.equal(
	translateSql("INSERT OR IGNORE INTO t (id) VALUES (?)"),
	"INSERT INTO t (id) VALUES ($1) ON CONFLICT DO NOTHING",
);
assert.equal(translateSql("SELECT 'it''s ?', ?"), "SELECT 'it''s ?', $1");

const dir = await mkdtemp(path.join(tmpdir(), "ai-org-media-"));
process.env.MEDIA_ROOT = dir;
const { getMediaBucket } = await import("../src/lib/media-store");
const media = getMediaBucket();
await media.put("tasks/sample.webp", new TextEncoder().encode("webp-bytes"), {
	httpMetadata: { contentType: "image/webp" },
});
const object = await media.get("tasks/sample.webp");
assert.ok(object);
assert.equal(object.httpMetadata?.contentType, "image/webp");
assert.equal(Buffer.from(await object.arrayBuffer()).toString(), "webp-bytes");
await media.delete("tasks/sample.webp");
assert.equal(await media.get("tasks/sample.webp"), null);
await rm(dir, { recursive: true, force: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
	const { getPgDatabase } = await import("../src/lib/pg-db");
	const schema = await readFile(new URL("../migrations/pg/0001_schema.sql", import.meta.url), "utf8");
	const { default: pg } = await import("pg");
	const pool = new pg.Pool({ connectionString: databaseUrl });
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query(schema);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}

	const db = getPgDatabase();
	await db.prepare("INSERT INTO employees (id, name, role) VALUES (?, ?, ?)").bind("emp_check", "確認", "ops").run();
	await db
		.prepare("INSERT OR IGNORE INTO employees (id, name, role) VALUES (?, ?, ?)")
		.bind("emp_check", "上書きしない", "ops")
		.run();
	const row = await db
		.prepare("SELECT name FROM employees WHERE id = ?")
		.bind("emp_check")
		.first<{ name: string }>();
	assert.equal(row?.name, "確認");
	const statements = ["a", "b"].map((name, index) =>
		db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").bind(`tag_check_${index}`, name),
	);
	await db.batch(statements);
	const tags = await db.prepare("SELECT name FROM tags WHERE id LIKE ? ORDER BY name").bind("tag_check_%").all<{ name: string }>();
	assert.deepEqual(tags.results?.map((item) => item.name), ["a", "b"]);
	const stamped = await db.prepare("SELECT app_now() AS now").first<{ now: string }>();
	assert.match(stamped?.now ?? "", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
	await pool.end();
	console.log("postgres adapter ok");
}

console.log("sql translate and local media ok");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

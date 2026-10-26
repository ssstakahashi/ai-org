import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles([".env", "/etc/ai-org.env"]);

const bucket = "ai-org-media";
const mediaRoot = path.resolve(process.env.MEDIA_ROOT?.trim() || path.join(process.cwd(), "data", "media"));
const accountId = process.env.CF_ACCOUNT_ID?.trim();
const apiToken = process.env.CF_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

function addKey(keys, value) {
	const key = typeof value === "string" ? value.trim() : "";
	if (!key || key.includes("..") || key.startsWith("/")) return;
	keys.add(key);
}

function addFigureKeys(keys, raw) {
	if (!raw || typeof raw !== "string") return;
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return;
		for (const item of parsed) {
			if (item && typeof item === "object" && typeof item.key === "string") addKey(keys, item.key);
		}
	} catch {
		// 壊れた JSON は飛ばす
	}
}

async function keysFromSqlite() {
	const keys = new Set();
	const root = path.join(process.cwd(), ".wrangler", "state", "v3", "d1");
	const { readdir } = await import("node:fs/promises");
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
	const candidates = [];
	for (const file of found) {
		if (path.basename(file) === "metadata.sqlite") continue;
		candidates.push({ file, size: (await stat(file)).size });
	}
	candidates.sort((a, b) => b.size - a.size);
	if (candidates.length === 0) return keys;
	const sqlite = new DatabaseSync(candidates[0].file, { readOnly: true });
	try {
		for (const row of sqlite.prepare("SELECT image_key FROM tasks WHERE image_key IS NOT NULL").all()) {
			addKey(keys, row.image_key);
		}
		for (const row of sqlite.prepare("SELECT image_key FROM x_posts WHERE image_key IS NOT NULL").all()) {
			addKey(keys, row.image_key);
		}
		for (const row of sqlite.prepare("SELECT thumbnail_key, figure_keys FROM blog_posts").all()) {
			addKey(keys, row.thumbnail_key);
			addFigureKeys(keys, row.figure_keys);
		}
	} finally {
		sqlite.close();
	}
	return keys;
}

async function keysFromPostgres() {
	const keys = new Set();
	const connectionString = process.env.DATABASE_URL?.trim();
	if (!connectionString) return keys;
	const pool = new pg.Pool({ connectionString });
	try {
		const tasks = await pool.query("SELECT image_key FROM tasks WHERE image_key IS NOT NULL");
		for (const row of tasks.rows) addKey(keys, row.image_key);
		const posts = await pool.query("SELECT image_key FROM x_posts WHERE image_key IS NOT NULL");
		for (const row of posts.rows) addKey(keys, row.image_key);
		const blogs = await pool.query("SELECT thumbnail_key, figure_keys FROM blog_posts");
		for (const row of blogs.rows) {
			addKey(keys, row.thumbnail_key);
			addFigureKeys(keys, row.figure_keys);
		}
	} catch (error) {
		console.warn(`postgres から画像キーを読めませんでした: ${error instanceof Error ? error.message : error}`);
	} finally {
		await pool.end();
	}
	return keys;
}

async function keysFromApi() {
	const keys = new Set();
	if (!accountId || !apiToken) {
		console.warn("CF_ACCOUNT_ID と CF_API_TOKEN が無いので、R2 の一覧は取りません");
		return keys;
	}
	let cursor = "";
	do {
		const url = new URL(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects`,
		);
		url.searchParams.set("per_page", "1000");
		if (cursor) url.searchParams.set("cursor", cursor);
		const response = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
		const payload = await response.json();
		if (!response.ok || payload.success === false) {
			const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ");
			console.warn(`R2 一覧に失敗しました: ${message || response.status}`);
			return keys;
		}
		const objects = Array.isArray(payload.result) ? payload.result : payload.result?.objects;
		if (Array.isArray(objects)) {
			for (const object of objects) addKey(keys, object.key ?? object.name);
		}
		cursor = payload.result_info?.cursor && payload.result_info?.is_truncated ? payload.result_info.cursor : "";
	} while (cursor);
	return keys;
}

const keys = new Set([
	...(await keysFromSqlite()),
	...(await keysFromPostgres()),
	...(await keysFromApi()),
]);

if (keys.size === 0) {
	console.error("コピーする画像キーがありません");
	process.exit(1);
}

console.log(`${keys.size} keys -> ${mediaRoot}`);
let failed = 0;
for (const key of keys) {
	const dest = path.join(mediaRoot, key);
	try {
		const existing = await stat(dest);
		if (existing.size > 0) {
			console.log(`keep ${key}`);
			continue;
		}
	} catch {
		// 未取得
	}
	await mkdir(path.dirname(dest), { recursive: true });
	const result = spawnSync(
		"npx",
		["wrangler", "r2", "object", "get", `${bucket}/${key}`, "--file", dest, "--remote"],
		{ stdio: "inherit" },
	);
	if (result.status !== 0) {
		failed += 1;
		console.error(`failed ${key}`);
	}
}

if (failed > 0) {
	console.error(`${failed} 件の取得に失敗しました`);
	process.exit(1);
}
console.log("r2 pull done");

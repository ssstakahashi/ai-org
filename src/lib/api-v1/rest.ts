import { revalidatePath } from "next/cache";
import { BULLETIN_SHEETS, isBlogIdeasSheetKey } from "@/lib/bulletin-board";
import { getLatestVersionEntry } from "@/lib/latest-version";
import { newId } from "@/lib/ids";
import { BlogRuleError } from "@/lib/blog-post-rules";
import {
	X_POST_DESTINATION_OPTIONS,
	type XPost,
	type XPostDestination,
} from "@/lib/types";
import { X_POST_SELECT } from "@/lib/x-posts";
import { asRecord, asText, encodeCursor, pageClause, type PageQuery } from "@/lib/api-v1/http";
import type { ApiActor } from "@/lib/api-v1/auth";
import { parseAppDateTime } from "@/lib/timezone";
import {
	APP_TEST_RESULT_OUTCOME_OPTIONS,
	type AppTestResultOutcome,
} from "@/lib/types";

const ACCOUNT_TO_DESTINATION: Record<string, XPostDestination> = {
	"@studio_foods": "studiofoods_official",
	studio_foods: "studiofoods_official",
	studiofoods_official: "studiofoods_official",
	"@MIERUagri": "agri",
	MIERUagri: "agri",
	agri: "agri",
	"@MIERUkaikei": "mieru",
	MIERUkaikei: "mieru",
	mieru: "mieru",
	"@MIERUagri_漫画": "studiofoods",
	studiofoods: "studiofoods",
	"@MIERUkaikei_漫画": "mieru_manga",
	mieru_manga: "mieru_manga",
};

function destinationFromAccount(raw: string): XPostDestination | undefined {
	if (!raw) return undefined;
	const found = ACCOUNT_TO_DESTINATION[raw];
	if (found) return found;
	if ((X_POST_DESTINATION_OPTIONS as readonly string[]).includes(raw)) {
		return raw as XPostDestination;
	}
	throw new BlogRuleError(400, "validation", "アカウントが不正です");
}

function apiXStatus(status: string): string {
	return status === "done" ? "posted" : status;
}

function dbXStatus(status: string): string {
	if (status === "posted") return "done";
	if (["draft", "approved", "scheduled", "done", "failed"].includes(status)) return status;
	throw new BlogRuleError(400, "validation", "status が不正です");
}

function toApiX(post: XPost) {
	return {
		...post,
		status: apiXStatus(post.status),
		image_key: post.image_key,
	};
}

export async function listIdeas(db: D1Database, url: URL, page: PageQuery) {
	const filters: string[] = [];
	const binds: string[] = [];
	const topic = url.searchParams.get("topic")?.trim() || url.searchParams.get("tab")?.trim() || "";
	if (topic) {
		if (!isBlogIdeasSheetKey(topic)) {
			throw new BlogRuleError(400, "validation", "タブが不正です");
		}
		filters.push("topic = ?");
		binds.push(topic);
	}
	const tag = url.searchParams.get("tag")?.trim();
	if (tag) {
		filters.push(
			`EXISTS (
				SELECT 1 FROM blog_idea_tags it
				JOIN tags t ON t.id = it.tag_id
				WHERE it.idea_id = blog_ideas.id AND t.name = ?
			)`,
		);
		binds.push(tag);
	}
	const paging = pageClause(page, "updated_at");
	const whereParts = [...filters, paging.sql.replace(/^ AND /, "")].filter(Boolean);
	const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
	const countRow = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM blog_ideas ${
				filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""
			} ${page.updatedSince ? `${filters.length > 0 ? "AND" : "WHERE"} updated_at >= ?` : ""}`,
		)
		.bind(...binds, ...(page.updatedSince ? [page.updatedSince] : []))
		.first<{ count: number }>();
	const { results } = await db
		.prepare(
			`SELECT id, topic, no, title, category, summary, badge, details, created_at, updated_at
			 FROM blog_ideas ${whereSql}
			 ORDER BY updated_at DESC, id DESC
			 LIMIT ?`,
		)
		.bind(...binds, ...paging.binds, page.limit)
		.all<{
			id: string;
			topic: string;
			no: string;
			title: string;
			category: string;
			summary: string;
			badge: string;
			details: string;
			created_at: string;
			updated_at: string;
		}>();
	const ideas = results ?? [];
	const tags = await tagsByIdea(db, ideas.map((idea) => idea.id));
	const last = ideas[ideas.length - 1];
	return {
		ideas: ideas.map((idea) => ({ ...idea, tags: tags[idea.id] ?? [] })),
		total: Number(countRow?.count ?? 0),
		next_cursor:
			ideas.length === page.limit && last ? encodeCursor(last.updated_at, last.id) : null,
	};
}

async function tagsByIdea(db: D1Database, ids: string[]): Promise<Record<string, string[]>> {
	const grouped: Record<string, string[]> = {};
	if (ids.length === 0) return grouped;
	const placeholders = ids.map(() => "?").join(", ");
	const { results } = await db
		.prepare(
			`SELECT it.idea_id, t.name
			 FROM blog_idea_tags it
			 JOIN tags t ON t.id = it.tag_id
			 WHERE it.idea_id IN (${placeholders})
			 ORDER BY t.name`,
		)
		.bind(...ids)
		.all<{ idea_id: string; name: string }>();
	for (const row of results ?? []) {
		const list = grouped[row.idea_id] ?? [];
		list.push(row.name);
		grouped[row.idea_id] = list;
	}
	return grouped;
}

export async function countIdeas(db: D1Database) {
	const { results } = await db
		.prepare(`SELECT topic, COUNT(*) AS count FROM blog_ideas GROUP BY topic ORDER BY topic`)
		.all<{ topic: string; count: number }>();
	const rows = results ?? [];
	return {
		total: rows.reduce((sum, row) => sum + Number(row.count), 0),
		by_topic: rows.map((row) => ({ topic: row.topic, count: Number(row.count) })),
	};
}

export async function putIdea(db: D1Database, id: string, raw: unknown) {
	const body = asRecord(raw);
	const topic = asText(body.topic);
	const title = asText(body.title);
	if (!isBlogIdeasSheetKey(topic) || !title) {
		throw new BlogRuleError(400, "validation", "topic と title は必須です");
	}
	const details =
		typeof body.details === "string"
			? body.details
			: JSON.stringify(body.details ?? []);
	const existing = await db
		.prepare(`SELECT id FROM blog_ideas WHERE id = ?`)
		.bind(id)
		.first<{ id: string }>();
	if (existing) {
		await db
			.prepare(
				`UPDATE blog_ideas
				 SET topic = ?, no = ?, title = ?, category = ?, summary = ?, badge = ?,
				     details = ?, updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(
				topic,
				asText(body.no),
				title,
				asText(body.category),
				asText(body.summary),
				asText(body.badge),
				details,
				id,
			)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO blog_ideas (id, topic, no, title, category, summary, badge, details)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				topic,
				asText(body.no),
				title,
				asText(body.category),
				asText(body.summary),
				asText(body.badge),
				details,
			)
			.run();
	}
	if (Array.isArray(body.tags)) {
		await db.prepare(`DELETE FROM blog_idea_tags WHERE idea_id = ?`).bind(id).run();
		for (const name of [...new Set(body.tags.map((item) => String(item).trim()).filter(Boolean))]) {
			let tag = await db
				.prepare(`SELECT id FROM tags WHERE lower(name) = lower(?)`)
				.bind(name)
				.first<{ id: string }>();
			if (!tag) {
				const tagId = newId("tag");
				await db
					.prepare(`INSERT INTO tags (id, name, color, text_color) VALUES (?, ?, '', '')`)
					.bind(tagId, name)
					.run();
				tag = { id: tagId };
			}
			await db
				.prepare(`INSERT INTO blog_idea_tags (idea_id, tag_id) VALUES (?, ?)`)
				.bind(id, tag.id)
				.run();
		}
	}
	revalidatePath("/blog-ideas");
	const saved = await db
		.prepare(
			`SELECT id, topic, no, title, category, summary, badge, details, created_at, updated_at
			 FROM blog_ideas WHERE id = ?`,
		)
		.bind(id)
		.first<Record<string, unknown>>();
	const tags = await tagsByIdea(db, [id]);
	return { idea: { ...saved, tags: tags[id] ?? [] }, updated: Boolean(existing) };
}

export async function listX(db: D1Database, url: URL, page: PageQuery) {
	const filters: string[] = [];
	const binds: string[] = [];
	const account = url.searchParams.get("account")?.trim() || url.searchParams.get("destination")?.trim() || "";
	if (account) {
		const destination = destinationFromAccount(account);
		if (destination) {
			filters.push("destination = ?");
			binds.push(destination);
		}
	}
	const status = url.searchParams.get("status")?.trim();
	if (status) {
		filters.push("status = ?");
		binds.push(dbXStatus(status));
	}
	const paging = pageClause(page, "updated_at");
	const whereParts = [...filters, paging.sql.replace(/^ AND /, "")].filter(Boolean);
	const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
	const countRow = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM x_posts ${
				filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""
			} ${page.updatedSince ? `${filters.length > 0 ? "AND" : "WHERE"} updated_at >= ?` : ""}`,
		)
		.bind(...binds, ...(page.updatedSince ? [page.updatedSince] : []))
		.first<{ count: number }>();
	const { results } = await db
		.prepare(`${X_POST_SELECT} ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ?`)
		.bind(...binds, ...paging.binds, page.limit)
		.all<XPost>();
	const posts = results ?? [];
	const last = posts[posts.length - 1];
	return {
		x_posts: posts.map(toApiX),
		total: Number(countRow?.count ?? 0),
		next_cursor:
			posts.length === page.limit && last ? encodeCursor(last.updated_at, last.id) : null,
	};
}

export async function countX(db: D1Database) {
	const row = await db
		.prepare(`SELECT COUNT(*) AS count FROM x_posts`)
		.first<{ count: number }>();
	return { total: Number(row?.count ?? 0) };
}

export async function putX(db: D1Database, id: string, raw: unknown) {
	const body = asRecord(raw);
	const title = asText(body.title);
	if (!title) throw new BlogRuleError(400, "validation", "title は必須です");
	const text = typeof body.body === "string" ? body.body : "";
	const destination =
		destinationFromAccount(asText(body.account) || asText(body.destination)) ?? "studiofoods";
	const status = asText(body.status) ? dbXStatus(asText(body.status)) : "draft";
	const existing = await db
		.prepare(`${X_POST_SELECT} WHERE id = ?`)
		.bind(id)
		.first<XPost>();
	if (existing) {
		const base = asText(body.base_updated_at);
		if (!base) {
			throw new BlogRuleError(409, "stale_body", "更新には base_updated_at が必要です", {
				updated_at: existing.updated_at,
			});
		}
		const imageKey = asText(body.image_key) || existing.image_key;
		const notes = asText(body.notes) || existing.notes;
		const scheduledAt = asText(body.scheduled_at) || existing.scheduled_at;
		const same =
			title === existing.title &&
			text === (existing.body ?? "") &&
			status === existing.status &&
			destination === existing.destination &&
			(imageKey ?? "") === (existing.image_key ?? "") &&
			notes === (existing.notes ?? "") &&
			(scheduledAt ?? "") === (existing.scheduled_at ?? "");
		if (!same && base < existing.updated_at) {
			throw new BlogRuleError(409, "stale_body", "本文が先に更新されています", {
				updated_at: existing.updated_at,
			});
		}
		if (!same) {
			await db
				.prepare(
					`UPDATE x_posts
					 SET title = ?, body = ?, image_key = ?, status = ?, scheduled_at = ?,
					     notes = ?, destination = ?, updated_at = datetime('now')
					 WHERE id = ?`,
				)
				.bind(title, text, imageKey, status, scheduledAt, notes, destination, id)
				.run();
		}
	} else {
		await db
			.prepare(
				`INSERT INTO x_posts
					(id, title, body, image_key, status, scheduled_at, notes, destination)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				title,
				text,
				asText(body.image_key) || null,
				status,
				asText(body.scheduled_at) || null,
				asText(body.notes),
				destination,
			)
			.run();
	}
	revalidatePath("/x-schedule");
	const saved = await db.prepare(`${X_POST_SELECT} WHERE id = ?`).bind(id).first<XPost>();
	return { x_post: saved ? toApiX(saved) : null, updated: Boolean(existing) };
}

export async function listEmployees(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT id, name, role, area, authority, color, text_color, sort_order, created_at
			 FROM employees
			 ORDER BY sort_order, name`,
		)
		.all<Record<string, unknown>>();
	const employees = results ?? [];
	return { employees, total: employees.length };
}

export async function putEmployees(db: D1Database, raw: unknown) {
	const body = asRecord(raw);
	const rows = Array.isArray(body.employees) ? body.employees : [body];
	let updated = 0;
	for (const row of rows) {
		const record = asRecord(row);
		const id = asText(record.id);
		const name = asText(record.name);
		const role = asText(record.role);
		if (!id || !name || !role) {
			throw new BlogRuleError(400, "validation", "id, name, role は必須です");
		}
		const existing = await db
			.prepare(`SELECT id FROM employees WHERE id = ?`)
			.bind(id)
			.first<{ id: string }>();
		if (existing) {
			await db
				.prepare(
					`UPDATE employees
					 SET name = ?, role = ?, area = ?, authority = ?, color = ?, text_color = ?, sort_order = ?
					 WHERE id = ?`,
				)
				.bind(
					name,
					role,
					asText(record.area),
					asText(record.authority),
					asText(record.color),
					asText(record.text_color),
					Number(record.sort_order ?? 0) || 0,
					id,
				)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO employees (id, name, role, area, authority, color, text_color, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					name,
					role,
					asText(record.area),
					asText(record.authority),
					asText(record.color),
					asText(record.text_color),
					Number(record.sort_order ?? 0) || 0,
				)
				.run();
		}
		updated += 1;
	}
	revalidatePath("/employees");
	return { updated };
}

export async function listAppNames(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT id, name, sort_order, color, icon, text_color, app_group_id, app_group,
			        app_type_id, app_type, created_at, updated_at
			 FROM app_names
			 ORDER BY sort_order, name`,
		)
		.all<Record<string, unknown>>();
	const names = results ?? [];
	return { names, total: names.length };
}

export async function putAppNames(db: D1Database, raw: unknown) {
	const body = asRecord(raw);
	const rows = Array.isArray(body.names) ? body.names : [body];
	for (const row of rows) {
		const record = asRecord(row);
		const id = asText(record.id);
		const name = asText(record.name);
		if (!id || !name) throw new BlogRuleError(400, "validation", "id と name は必須です");
		const existing = await db
			.prepare(`SELECT id FROM app_names WHERE id = ?`)
			.bind(id)
			.first<{ id: string }>();
		if (existing) {
			await db
				.prepare(
					`UPDATE app_names
					 SET name = ?, sort_order = ?, color = ?, icon = ?, text_color = ?,
					     app_group = ?, app_type = ?, updated_at = datetime('now')
					 WHERE id = ?`,
				)
				.bind(
					name,
					Number(record.sort_order ?? 0) || 0,
					asText(record.color),
					asText(record.icon),
					asText(record.text_color),
					asText(record.app_group),
					asText(record.app_type),
					id,
				)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO app_names
						(id, name, sort_order, color, icon, text_color, app_group, app_type)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					name,
					Number(record.sort_order ?? 0) || 0,
					asText(record.color),
					asText(record.icon),
					asText(record.text_color),
					asText(record.app_group),
					asText(record.app_type),
				)
				.run();
		}
	}
	revalidatePath("/apps/names");
	return { ok: true, total: rows.length };
}

export async function listRequirements(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT id, app_name_id, title, body, status, sort_order, created_at, updated_at
			 FROM app_requirements
			 ORDER BY sort_order, created_at`,
		)
		.all<Record<string, unknown>>();
	const requirements = results ?? [];
	return { requirements, total: requirements.length };
}

export async function putRequirements(db: D1Database, raw: unknown) {
	const body = asRecord(raw);
	const rows = Array.isArray(body.requirements) ? body.requirements : [body];
	for (const row of rows) {
		const record = asRecord(row);
		const id = asText(record.id);
		const appNameId = asText(record.app_name_id);
		const title = asText(record.title);
		if (!id || !appNameId || !title) {
			throw new BlogRuleError(400, "validation", "id, app_name_id, title は必須です");
		}
		const existing = await db
			.prepare(`SELECT id FROM app_requirements WHERE id = ?`)
			.bind(id)
			.first<{ id: string }>();
		const status = asText(record.status) || "draft";
		if (existing) {
			await db
				.prepare(
					`UPDATE app_requirements
					 SET app_name_id = ?, title = ?, body = ?, status = ?, sort_order = ?,
					     updated_at = datetime('now')
					 WHERE id = ?`,
				)
				.bind(appNameId, title, asText(record.body), status, Number(record.sort_order ?? 0) || 0, id)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO app_requirements (id, app_name_id, title, body, status, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.bind(id, appNameId, title, asText(record.body), status, Number(record.sort_order ?? 0) || 0)
				.run();
		}
	}
	revalidatePath("/apps/requirements");
	return { ok: true, total: rows.length };
}

function parseTestResultOutcome(raw: unknown): AppTestResultOutcome {
	const value = asText(raw) || "info";
	if ((APP_TEST_RESULT_OUTCOME_OPTIONS as readonly string[]).includes(value)) {
		return value as AppTestResultOutcome;
	}
	throw new BlogRuleError(400, "validation", "outcome が不正です");
}

function parseRecordedAt(raw: unknown, fallback?: string): string {
	const text = asText(raw);
	if (!text) {
		if (fallback) return fallback;
		return new Date().toISOString();
	}
	return parseAppDateTime(text).toISOString();
}

async function assertAppNameId(db: D1Database, appNameId: string) {
	const row = await db
		.prepare(`SELECT id FROM app_names WHERE id = ?`)
		.bind(appNameId)
		.first<{ id: string }>();
	if (!row) {
		throw new BlogRuleError(400, "validation", "app_name_id が存在しません");
	}
}

export async function listTestPlans(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT id, app_name_id, body, created_at, updated_at
			 FROM app_test_plans
			 ORDER BY updated_at DESC, app_name_id ASC`,
		)
		.all<Record<string, unknown>>();
	const plans = results ?? [];
	return { plans, total: plans.length };
}

export async function putTestPlans(db: D1Database, raw: unknown) {
	const body = asRecord(raw);
	const rows = Array.isArray(body.plans) ? body.plans : [body];
	for (const row of rows) {
		const record = asRecord(row);
		const appNameId = asText(record.app_name_id);
		if (!appNameId) {
			throw new BlogRuleError(400, "validation", "app_name_id は必須です");
		}
		await assertAppNameId(db, appNameId);
		const planBody = "body" in record ? asText(record.body) : "";
		const existing = await db
			.prepare(`SELECT id FROM app_test_plans WHERE app_name_id = ?`)
			.bind(appNameId)
			.first<{ id: string }>();
		if (existing) {
			await db
				.prepare(
					`UPDATE app_test_plans
					 SET body = ?, updated_at = datetime('now')
					 WHERE app_name_id = ?`,
				)
				.bind(planBody, appNameId)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO app_test_plans (id, app_name_id, body)
					 VALUES (?, ?, ?)`,
				)
				.bind(newId("tplan"), appNameId, planBody)
				.run();
		}
	}
	revalidatePath("/apps/test-results");
	return { ok: true, total: rows.length };
}

export async function listTestResults(db: D1Database, url: URL, page: PageQuery) {
	const filters: string[] = [];
	const binds: string[] = [];
	const appNameId = url.searchParams.get("app_name_id")?.trim();
	if (appNameId) {
		filters.push("app_name_id = ?");
		binds.push(appNameId);
	}
	const paging = pageClause(page, "recorded_at");
	const whereParts = [...filters, paging.sql.replace(/^ AND /, "")].filter(Boolean);
	const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
	const countSql = `SELECT COUNT(*) AS count FROM app_test_results ${
		filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""
	}${page.updatedSince ? ` ${filters.length > 0 ? "AND" : "WHERE"} recorded_at >= ?` : ""}`;
	const countRow = await db
		.prepare(countSql)
		.bind(...binds, ...(page.updatedSince ? [page.updatedSince] : []))
		.first<{ count: number }>();
	const { results } = await db
		.prepare(
			`SELECT id, app_name_id, title, body, outcome, recorded_at, created_at, updated_at
			 FROM app_test_results ${whereSql}
			 ORDER BY recorded_at DESC, id DESC
			 LIMIT ?`,
		)
		.bind(...binds, ...paging.binds, page.limit)
		.all<Record<string, string>>();
	const testResults = results ?? [];
	const last = testResults[testResults.length - 1];
	return {
		test_results: testResults,
		total: Number(countRow?.count ?? 0),
		next_cursor:
			testResults.length === page.limit && last
				? encodeCursor(last.recorded_at, last.id)
				: null,
	};
}

export async function putTestResult(db: D1Database, id: string, raw: unknown) {
	if (!id) {
		throw new BlogRuleError(400, "validation", "id が必要です");
	}
	const body = asRecord(raw);
	const existing = await db
		.prepare(
			`SELECT id, app_name_id, title, body, outcome, recorded_at
			 FROM app_test_results WHERE id = ?`,
		)
		.bind(id)
		.first<{
			id: string;
			app_name_id: string;
			title: string;
			body: string;
			outcome: string;
			recorded_at: string;
		}>();
	const appNameId = asText(body.app_name_id) || existing?.app_name_id || "";
	const title = asText(body.title) || existing?.title || "";
	if (!appNameId || !title) {
		throw new BlogRuleError(400, "validation", "app_name_id と title は必須です");
	}
	await assertAppNameId(db, appNameId);
	const resultBody = "body" in body ? asText(body.body) : existing?.body ?? "";
	const outcome = "outcome" in body
		? parseTestResultOutcome(body.outcome)
		: parseTestResultOutcome(existing?.outcome ?? "info");
	const recordedAt = parseRecordedAt(body.recorded_at, existing?.recorded_at);

	if (existing) {
		await db
			.prepare(
				`UPDATE app_test_results
				 SET app_name_id = ?, title = ?, body = ?, outcome = ?, recorded_at = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(appNameId, title, resultBody, outcome, recordedAt, id)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO app_test_results (id, app_name_id, title, body, outcome, recorded_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(id, appNameId, title, resultBody, outcome, recordedAt)
			.run();
	}
	revalidatePath("/apps/test-results");
	return { ok: true, id, updated: Boolean(existing) };
}

export async function deleteTestResult(db: D1Database, id: string) {
	if (!id) {
		throw new BlogRuleError(400, "validation", "id が必要です");
	}
	const existing = await db
		.prepare(`SELECT id FROM app_test_results WHERE id = ?`)
		.bind(id)
		.first<{ id: string }>();
	if (!existing) {
		throw new BlogRuleError(404, "not_found", "テスト結果がありません");
	}
	await db.prepare(`DELETE FROM app_test_results WHERE id = ?`).bind(id).run();
	revalidatePath("/apps/test-results");
	return { ok: true, id };
}

export async function listTasks(db: D1Database, url: URL, page: PageQuery) {
	const filters: string[] = [];
	const binds: string[] = [];
	const status = url.searchParams.get("status")?.trim();
	if (status) {
		filters.push("status = ?");
		binds.push(status);
	}
	const date = url.searchParams.get("date")?.trim();
	if (date) {
		filters.push("(start_at LIKE ? OR end_at LIKE ?)");
		binds.push(`${date}%`, `${date}%`);
	}
	const paging = pageClause(page, "updated_at");
	const whereParts = [...filters, paging.sql.replace(/^ AND /, "")].filter(Boolean);
	const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
	const countRow = await db
		.prepare(
			`SELECT COUNT(*) AS count FROM tasks ${
				filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""
			} ${page.updatedSince ? `${filters.length > 0 ? "AND" : "WHERE"} updated_at >= ?` : ""}`,
		)
		.bind(...binds, ...(page.updatedSince ? [page.updatedSince] : []))
		.first<{ count: number }>();
	const { results } = await db
		.prepare(
			`SELECT id, employee_id, title, body, status, start_at, end_at, notes, created_at, updated_at
			 FROM tasks ${whereSql}
			 ORDER BY updated_at DESC, id DESC
			 LIMIT ?`,
		)
		.bind(...binds, ...paging.binds, page.limit)
		.all<Record<string, string>>();
	const tasks = results ?? [];
	const last = tasks[tasks.length - 1];
	return {
		tasks,
		total: Number(countRow?.count ?? 0),
		next_cursor:
			tasks.length === page.limit && last ? encodeCursor(last.updated_at, last.id) : null,
	};
}

export async function putTask(db: D1Database, id: string, raw: unknown) {
	const body = asRecord(raw);
	const existing = await db
		.prepare(
			`SELECT id, employee_id, title, body, status, notes, start_at, end_at FROM tasks WHERE id = ?`,
		)
		.bind(id)
		.first<{
			id: string;
			employee_id: string;
			title: string;
			body: string;
			status: string;
			notes: string;
			start_at: string | null;
			end_at: string | null;
		}>();
	const status = asText(body.status) || existing?.status || "draft";
	if (!["draft", "approved", "scheduled", "done", "failed"].includes(status)) {
		throw new BlogRuleError(400, "validation", "status が不正です");
	}
	if (existing) {
		await db
			.prepare(
				`UPDATE tasks
				 SET title = ?, body = ?, status = ?, notes = ?, start_at = ?, end_at = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(
				asText(body.title) || existing.title,
				"body" in body ? asText(body.body) : existing.body,
				status,
				"notes" in body ? asText(body.notes) : existing.notes,
				"start_at" in body ? asText(body.start_at) || null : existing.start_at,
				"end_at" in body ? asText(body.end_at) || null : existing.end_at,
				id,
			)
			.run();
	} else {
		const title = asText(body.title);
		const employeeId = asText(body.employee_id);
		if (!title || !employeeId) {
			throw new BlogRuleError(400, "validation", "新規には title と employee_id が必要です");
		}
		await db
			.prepare(
				`INSERT INTO tasks (id, employee_id, title, body, status, notes, start_at, end_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				employeeId,
				title,
				asText(body.body),
				status || "draft",
				asText(body.notes),
				asText(body.start_at) || null,
				asText(body.end_at) || null,
			)
			.run();
	}
	revalidatePath("/");
	return { ok: true, id, updated: Boolean(existing) };
}

export async function listBoardLinks(db: D1Database) {
	const { results } = await db
		.prepare(
			`SELECT id, title, url, sort_order, created_at, updated_at
			 FROM board_links
			 ORDER BY sort_order, created_at`,
		)
		.all<{ id: string; title: string; url: string }>();
	const extra = results ?? [];
	const links = [
		...BULLETIN_SHEETS.map((sheet) => ({ ...sheet, source: "builtin" })),
		...extra
			.filter((row) => !BULLETIN_SHEETS.some((sheet) => sheet.url === row.url))
			.map((row) => ({ title: row.title, url: row.url, source: "added" })),
	];
	return { links, version: getLatestVersionEntry() };
}

export async function putBoardLink(db: D1Database, raw: unknown) {
	const body = asRecord(raw);
	const rows = Array.isArray(body.links) ? body.links : [body];
	for (const row of rows) {
		const record = asRecord(row);
		const title = asText(record.title);
		const url = asText(record.url);
		if (!title || !url) throw new BlogRuleError(400, "validation", "title と url は必須です");
		const existing = await db
			.prepare(`SELECT id FROM board_links WHERE url = ?`)
			.bind(url)
			.first<{ id: string }>();
		if (existing) {
			await db
				.prepare(
					`UPDATE board_links SET title = ?, updated_at = datetime('now') WHERE id = ?`,
				)
				.bind(title, existing.id)
				.run();
		} else if (!BULLETIN_SHEETS.some((sheet) => sheet.url === url)) {
			await db
				.prepare(`INSERT INTO board_links (id, title, url) VALUES (?, ?, ?)`)
				.bind(newId("board"), title, url)
				.run();
		}
	}
	revalidatePath("/board");
	return listBoardLinks(db);
}

export async function exportAll(db: D1Database) {
	const [posts, ideas, xPosts, employees, names, requirements, testPlans, testResults, tasks] =
		await Promise.all([
			db.prepare(`SELECT * FROM blog_posts`).all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM blog_ideas`).all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM x_posts`).all<Record<string, unknown>>(),
			db
				.prepare(
					`SELECT id, name, role, area, authority, sort_order, created_at FROM employees`,
				)
				.all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM app_names`).all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM app_requirements`).all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM app_test_plans`).all<Record<string, unknown>>(),
			db.prepare(`SELECT * FROM app_test_results`).all<Record<string, unknown>>(),
			db
				.prepare(
					`SELECT id, employee_id, title, status, start_at, end_at, updated_at FROM tasks`,
				)
				.all<Record<string, unknown>>(),
		]);
	return {
		blog_posts: posts.results ?? [],
		blog_ideas: ideas.results ?? [],
		x_posts: xPosts.results ?? [],
		employees: employees.results ?? [],
		app_names: names.results ?? [],
		app_requirements: requirements.results ?? [],
		app_test_plans: testPlans.results ?? [],
		app_test_results: testResults.results ?? [],
		tasks: tasks.results ?? [],
	};
}

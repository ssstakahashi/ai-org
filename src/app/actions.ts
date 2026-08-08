"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, getMediaBucket, newId } from "@/lib/db";
import { getUploadFile, putTaskImage, putXPostImage } from "@/lib/media-upload";
import { LOCAL_SOURCE, recordAutomationRun } from "@/lib/automation-ingest";
import { publishDueXPosts, publishXPostNow } from "@/lib/publish-x-posts";
import {
	expandRecurrenceDates,
	parseOptionalCount,
	parseOptionalDate,
	parseRecurrenceKind,
	parseWeekdays,
	shiftDateKeepingDuration,
} from "@/lib/recurrence";
import { normalizeColor } from "@/lib/colors";
import { parseAppDateTime } from "@/lib/timezone";
import {
	normalizeAppMasterIcon,
	type AppCron,
	type AppEntry,
	type AppGroup,
	type AppName,
	type AppType,
	type Category,
	type Employee,
	type OrgRule,
	type Tag,
	type TaskStatus,
	type TaskWithEmployee,
	type XPost,
} from "@/lib/types";

type TaskRow = Omit<TaskWithEmployee, "tags">;

export async function listEmployees(): Promise<Employee[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT id, name, role, area, authority, color, sort_order, created_at
			 FROM employees
			 ORDER BY sort_order ASC, name ASC`,
		)
		.all<Employee>();
	return results ?? [];
}

export async function createEmployee(formData: FormData) {
	const db = await getDb();
	const name = String(formData.get("name") ?? "").trim();
	const role = String(formData.get("role") ?? "").trim();
	const area = String(formData.get("area") ?? "").trim();
	const authority = String(formData.get("authority") ?? "").trim();
	const color = normalizeColor(formData.get("color"));

	if (!name || !role) {
		throw new Error("名前と役割は必須です");
	}

	const maxSort = await db
		.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM employees")
		.first<{ max_sort: number }>();

	const id = newId("emp");
	await db
		.prepare(
			"INSERT INTO employees (id, name, role, area, authority, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(id, name, role, area, authority, color, (maxSort?.max_sort ?? 0) + 10)
		.run();

	revalidateTaskPages();
}

export async function updateEmployee(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const name = String(formData.get("name") ?? "").trim();
	const role = String(formData.get("role") ?? "").trim();
	const area = String(formData.get("area") ?? "").trim();
	const authority = String(formData.get("authority") ?? "").trim();
	const color = normalizeColor(formData.get("color"));

	if (!id || !name || !role) {
		throw new Error("id・名前・役割が必要です");
	}

	const existing = await db
		.prepare("SELECT id FROM employees WHERE id = ?")
		.bind(id)
		.first();
	if (!existing) {
		throw new Error("従業員が見つかりません");
	}

	await db
		.prepare(
			"UPDATE employees SET name = ?, role = ?, area = ?, authority = ?, color = ? WHERE id = ?",
		)
		.bind(name, role, area, authority, color, id)
		.run();

	revalidateTaskPages();
}

export async function reorderEmployees(ids: string[]) {
	const db = await getDb();
	const orderedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
	if (orderedIds.length === 0) return;

	const statements = orderedIds.map((id, index) =>
		db
			.prepare("UPDATE employees SET sort_order = ? WHERE id = ?")
			.bind((index + 1) * 10, id),
	);
	await db.batch(statements);
	revalidateTaskPages();
}

export async function deleteEmployee(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	const countRow = await db
		.prepare("SELECT COUNT(*) AS count FROM tasks WHERE employee_id = ?")
		.bind(id)
		.first<{ count: number }>();
	const taskCount = Number(countRow?.count ?? 0);
	if (taskCount > 0) {
		throw new Error(
			`この従業員にはタスクが ${taskCount} 件あるため削除できません。先にタスクを別担当へ移すか削除してください`,
		);
	}

	await db.prepare("DELETE FROM employees WHERE id = ?").bind(id).run();
	revalidateTaskPages();
}

export async function listCategories(): Promise<Category[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT id, name, color, sort_order, created_at, updated_at
			 FROM categories
			 ORDER BY sort_order ASC, name ASC`,
		)
		.all<Category>();
	return results ?? [];
}

export async function listTags(): Promise<Tag[]> {
	const db = await getDb();
	const { results } = await db
		.prepare("SELECT id, name, color, created_at FROM tags ORDER BY name ASC")
		.all<Tag>();
	return results ?? [];
}

export async function listOrgRules(): Promise<OrgRule[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT id, title, body, sort_order, is_active, created_at, updated_at
			 FROM org_rules
			 ORDER BY sort_order ASC, title ASC`,
		)
		.all<OrgRule>();
	return results ?? [];
}

export async function getOrgRule(id: string): Promise<OrgRule | null> {
	const db = await getDb();
	const row = await db
		.prepare(
			`SELECT id, title, body, sort_order, is_active, created_at, updated_at
			 FROM org_rules
			 WHERE id = ?`,
		)
		.bind(id)
		.first<OrgRule>();
	return row ?? null;
}

function parseIsActive(formData: FormData): number {
	const raw = formData.get("is_active");
	return raw === "1" || raw === "on" ? 1 : 0;
}

function revalidateOrgRulesPage() {
	revalidatePath("/org-rules");
	revalidatePath("/org-rules/authority");
}

const TASK_SELECT = `SELECT
				t.id, t.employee_id, t.title, t.body, t.image_key, t.status,
				t.start_at, t.end_at, t.notes, t.category_id,
				t.created_at, t.updated_at,
				e.name AS employee_name, e.role AS employee_role, e.color AS employee_color,
				c.name AS category_name, c.color AS category_color
			 FROM tasks t
			 JOIN employees e ON e.id = t.employee_id
			 LEFT JOIN categories c ON c.id = t.category_id`;

const TASK_ORDER = `ORDER BY
				CASE t.status
					WHEN 'scheduled' THEN 0
					WHEN 'approved' THEN 1
					WHEN 'draft' THEN 2
					WHEN 'failed' THEN 3
					ELSE 4
				END,
				COALESCE(t.start_at, t.created_at) ASC`;

const X_POST_SELECT = `SELECT
				id, title, body, image_key, status, scheduled_at, notes,
				x_post_id, last_error, created_at, updated_at
			 FROM x_posts`;

const X_POST_ORDER = `ORDER BY
				CASE status
					WHEN 'scheduled' THEN 0
					WHEN 'approved' THEN 1
					WHEN 'draft' THEN 2
					WHEN 'failed' THEN 3
					ELSE 4
				END,
				COALESCE(scheduled_at, created_at) ASC`;

function revalidateTaskPages() {
	revalidatePath("/");
	revalidatePath("/x-schedule");
	revalidatePath("/categories");
	revalidatePath("/tags");
	revalidatePath("/employees");
	revalidatePath("/apps");
}

function revalidateXPostPages() {
	revalidatePath("/x-schedule");
}

function revalidateAppsPage() {
	revalidatePath("/apps");
	revalidatePath("/apps/names");
	revalidatePath("/apps/groups");
	revalidatePath("/apps/types");
}

function revalidateAutomationsPage() {
	revalidatePath("/automations");
}

function formText(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

async function attachTags(rows: TaskRow[]): Promise<TaskWithEmployee[]> {
	if (rows.length === 0) return [];

	const db = await getDb();
	const placeholders = rows.map(() => "?").join(", ");
	const { results } = await db
		.prepare(
			`SELECT tt.task_id, tg.id, tg.name, tg.color, tg.created_at
			 FROM task_tags tt
			 JOIN tags tg ON tg.id = tt.tag_id
			 WHERE tt.task_id IN (${placeholders})
			 ORDER BY tg.name ASC`,
		)
		.bind(...rows.map((row) => row.id))
		.all<Tag & { task_id: string }>();

	const byTask = new Map<string, Tag[]>();
	for (const row of results ?? []) {
		const list = byTask.get(row.task_id) ?? [];
		list.push({
			id: row.id,
			name: row.name,
			color: row.color,
			created_at: row.created_at,
		});
		byTask.set(row.task_id, list);
	}

	return rows.map((row) => ({
		...row,
		tags: byTask.get(row.id) ?? [],
	}));
}

export async function listTasks(): Promise<TaskWithEmployee[]> {
	const db = await getDb();
	const { results } = await db.prepare(`${TASK_SELECT} ${TASK_ORDER}`).all<TaskRow>();
	return attachTags(results ?? []);
}

/** X投稿一覧（スケジュール管理用） */
export async function listXPosts(): Promise<XPost[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(`${X_POST_SELECT} ${X_POST_ORDER}`)
		.all<XPost>();
	return results ?? [];
}

function parseNewTagNames(raw: string): string[] {
	return [
		...new Set(
			raw
				.split(/[,、]/)
				.map((name) => name.trim())
				.filter(Boolean),
		),
	];
}

async function resolveTagIds(
	db: D1Database,
	selectedIds: string[],
	newNames: string[],
): Promise<string[]> {
	const ids = new Set(selectedIds.filter(Boolean));

	for (const name of newNames) {
		const existing = await db
			.prepare("SELECT id FROM tags WHERE lower(name) = lower(?)")
			.bind(name)
			.first<{ id: string }>();

		if (existing) {
			ids.add(existing.id);
			continue;
		}

		const id = newId("tag");
		await db
			.prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
			.bind(id, name, "")
			.run();
		ids.add(id);
	}

	return [...ids];
}

export async function createTask(formData: FormData) {
	const db = await getDb();

	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();
	const employeeId = String(formData.get("employee_id") ?? "").trim();
	const categoryIdRaw = String(formData.get("category_id") ?? "").trim();
	const startAtRaw = String(formData.get("start_at") ?? "").trim();
	const endAtRaw = String(formData.get("end_at") ?? "").trim();
	const status = (String(formData.get("status") ?? "draft") as TaskStatus) || "draft";
	const selectedTagIds = formData.getAll("tag_ids").map((value) => String(value).trim());
	const newTagNames = parseNewTagNames(String(formData.get("new_tags") ?? ""));
	const recurrence = parseRecurrenceKind(String(formData.get("recurrence") ?? "none"));
	const weekdays = parseWeekdays(formData.getAll("weekdays").map((value) => String(value)));
	const recurUntil = parseOptionalDate(String(formData.get("recur_until") ?? ""));
	const recurCount = parseOptionalCount(String(formData.get("recur_count") ?? ""));

	if (!title || !employeeId) {
		throw new Error("タイトルと担当従業員は必須です");
	}

	const categoryId = categoryIdRaw || null;
	if (categoryId) {
		const category = await db
			.prepare("SELECT id FROM categories WHERE id = ?")
			.bind(categoryId)
			.first();
		if (!category) {
			throw new Error("カテゴリが見つかりません");
		}
	}

	let imageKey: string | null = null;
	const upload = getUploadFile(formData, "image");
	if (upload) {
		const stored = await putTaskImage(upload);
		if ("error" in stored) {
			throw new Error(stored.error);
		}
		imageKey = stored.key;
	}

	let startAt: Date | null = null;
	let endAt: Date | null = null;
	try {
		if (startAtRaw) startAt = parseAppDateTime(startAtRaw);
		if (endAtRaw) endAt = parseAppDateTime(endAtRaw);
	} catch {
		throw new Error("日時の形式が不正です");
	}

	if (startAt && !endAt) endAt = new Date(startAt);
	if (endAt && !startAt) startAt = new Date(endAt);
	if (startAt && endAt && startAt.getTime() > endAt.getTime()) {
		throw new Error("終了は開始以降にしてください");
	}

	if (recurrence !== "none" && !startAt) {
		throw new Error("繰り返しタスクには開始日時が必要です");
	}

	const baseStart = startAt ?? new Date();
	const baseEnd = endAt ?? new Date(baseStart);
	const occurrences = expandRecurrenceDates({
		kind: recurrence,
		anchor: baseStart,
		weekdays,
		until: recurUntil,
		count: recurCount,
	});

	const tagIds = await resolveTagIds(db, selectedTagIds, newTagNames);
	const insert = db.prepare(
		`INSERT INTO tasks
			(id, employee_id, title, body, image_key, status, start_at, end_at, notes, category_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);
	const tagInsert = db.prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)");

	const statements: D1PreparedStatement[] = [];
	for (let index = 0; index < occurrences.length; index++) {
		const occurrence = occurrences[index];
		const { start, end } = shiftDateKeepingDuration(baseStart, baseEnd, occurrence);
		const id = newId("task");

		statements.push(
			insert.bind(
				id,
				employeeId,
				title,
				body,
				index === 0 ? imageKey : null,
				status,
				startAt || endAt ? start.toISOString() : null,
				startAt || endAt ? end.toISOString() : null,
				notes,
				categoryId,
			),
		);

		for (const tagId of tagIds) {
			statements.push(tagInsert.bind(id, tagId));
		}
	}

	await db.batch(statements);
	revalidateTaskPages();
}

export async function updateTask(formData: FormData) {
	const db = await getDb();

	const id = String(formData.get("id") ?? "").trim();
	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();
	const employeeId = String(formData.get("employee_id") ?? "").trim();
	const categoryIdRaw = String(formData.get("category_id") ?? "").trim();
	const startAtRaw = String(formData.get("start_at") ?? "").trim();
	const endAtRaw = String(formData.get("end_at") ?? "").trim();
	const status = (String(formData.get("status") ?? "approved") as TaskStatus) || "approved";
	const selectedTagIds = formData.getAll("tag_ids").map((value) => String(value).trim());
	const newTagNames = parseNewTagNames(String(formData.get("new_tags") ?? ""));
	const clearImage = String(formData.get("clear_image") ?? "") === "1";

	if (!id) {
		throw new Error("id が必要です");
	}
	if (!title || !employeeId) {
		throw new Error("タイトルと担当従業員は必須です");
	}

	const existing = await db
		.prepare("SELECT image_key FROM tasks WHERE id = ?")
		.bind(id)
		.first<{ image_key: string | null }>();
	if (!existing) {
		throw new Error("タスクが見つかりません");
	}

	const employee = await db
		.prepare("SELECT id FROM employees WHERE id = ?")
		.bind(employeeId)
		.first();
	if (!employee) {
		throw new Error("担当従業員が見つかりません");
	}

	const categoryId = categoryIdRaw || null;
	if (categoryId) {
		const category = await db
			.prepare("SELECT id FROM categories WHERE id = ?")
			.bind(categoryId)
			.first();
		if (!category) {
			throw new Error("カテゴリが見つかりません");
		}
	}

	let imageKey = existing.image_key;
	if (clearImage && imageKey) {
		try {
			const media = await getMediaBucket();
			await media.delete(imageKey);
		} catch {
			// 削除失敗でもレコード更新は続行
		}
		imageKey = null;
	}

	const upload = getUploadFile(formData, "image");
	if (upload) {
		const stored = await putTaskImage(upload);
		if ("error" in stored) {
			throw new Error(stored.error);
		}
		if (imageKey && imageKey !== stored.key) {
			try {
				const media = await getMediaBucket();
				await media.delete(imageKey);
			} catch {
				// 旧画像の削除失敗は無視
			}
		}
		imageKey = stored.key;
	}

	let startAt: Date | null = null;
	let endAt: Date | null = null;
	try {
		if (startAtRaw) startAt = parseAppDateTime(startAtRaw);
		if (endAtRaw) endAt = parseAppDateTime(endAtRaw);
	} catch {
		throw new Error("日時の形式が不正です");
	}

	if (startAt && !endAt) endAt = new Date(startAt);
	if (endAt && !startAt) startAt = new Date(endAt);
	if (startAt && endAt && startAt.getTime() > endAt.getTime()) {
		throw new Error("終了は開始以降にしてください");
	}

	const tagIds = await resolveTagIds(db, selectedTagIds, newTagNames);
	const statements: D1PreparedStatement[] = [
		db
			.prepare(
				`UPDATE tasks
				 SET employee_id = ?,
				     title = ?,
				     body = ?,
				     image_key = ?,
				     status = ?,
				     start_at = ?,
				     end_at = ?,
				     notes = ?,
				     category_id = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(
				employeeId,
				title,
				body,
				imageKey,
				status,
				startAt ? startAt.toISOString() : null,
				endAt ? endAt.toISOString() : null,
				notes,
				categoryId,
				id,
			),
		db.prepare("DELETE FROM task_tags WHERE task_id = ?").bind(id),
	];

	const tagInsert = db.prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)");
	for (const tagId of tagIds) {
		statements.push(tagInsert.bind(id, tagId));
	}

	await db.batch(statements);
	revalidateTaskPages();
}

export async function createXPost(
	formData: FormData,
): Promise<{ error?: string }> {
	const db = await getDb();

	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();
	const scheduledAtRaw = String(formData.get("scheduled_at") ?? "").trim();
	const status =
		(String(formData.get("status") ?? "draft").trim() as TaskStatus) || "draft";
	const upload = getUploadFile(formData, "image");

	if (!title) {
		return { error: "タイトルは必須です" };
	}

	let imageKey: string | null = null;
	if (upload) {
		const stored = await putXPostImage(upload);
		if ("error" in stored) return { error: stored.error };
		imageKey = stored.key;
	}

	let scheduledAt: string | null = null;
	if (scheduledAtRaw) {
		try {
			scheduledAt = parseAppDateTime(scheduledAtRaw).toISOString();
		} catch {
			return { error: "予約日時の形式が不正です" };
		}
	}

	if (status === "scheduled" && !scheduledAt) {
		return { error: "予約ステータスには予約日時が必要です" };
	}

	try {
		const id = newId("xpost");
		await db
			.prepare(
				`INSERT INTO x_posts
					(id, title, body, image_key, status, scheduled_at, notes)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(id, title, body, imageKey, status, scheduledAt, notes)
			.run();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `投稿の保存に失敗しました: ${message}` };
	}

	try {
		revalidateXPostPages();
	} catch (error) {
		console.error("revalidateXPostPages failed", error);
	}
	return {};
}

type XPostFormState = { error: string | null; ok: boolean };

export async function createXPostFormAction(
	_prev: XPostFormState,
	formData: FormData,
): Promise<XPostFormState> {
	const result = await createXPost(formData);
	if (result.error) return { error: result.error, ok: false };
	return { error: null, ok: true };
}

export async function updateXPost(
	formData: FormData,
): Promise<{ error?: string }> {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const notes = String(formData.get("notes") ?? "").trim();
	const scheduledAtRaw = String(formData.get("scheduled_at") ?? "").trim();
	const status =
		(String(formData.get("status") ?? "scheduled").trim() as TaskStatus) || "scheduled";
	const upload = getUploadFile(formData, "image");
	const clearImage = String(formData.get("clear_image") ?? "") === "1";

	if (!id) {
		return { error: "id が必要です" };
	}
	if (!title) {
		return { error: "タイトルは必須です" };
	}

	const existing = await db
		.prepare("SELECT image_key FROM x_posts WHERE id = ?")
		.bind(id)
		.first<{ image_key: string | null }>();
	if (!existing) {
		return { error: "投稿が見つかりません" };
	}

	let imageKey = existing.image_key;
	if (clearImage && imageKey) {
		try {
			const media = await getMediaBucket();
			await media.delete(imageKey);
		} catch {
			// 削除失敗でもレコード更新は続行
		}
		imageKey = null;
	}

	if (upload) {
		const stored = await putXPostImage(upload);
		if ("error" in stored) return { error: stored.error };
		if (imageKey && imageKey !== stored.key) {
			try {
				const media = await getMediaBucket();
				await media.delete(imageKey);
			} catch {
				// 旧画像の削除失敗は無視
			}
		}
		imageKey = stored.key;
	}

	let scheduledAt: string | null = null;
	if (scheduledAtRaw) {
		try {
			scheduledAt = parseAppDateTime(scheduledAtRaw).toISOString();
		} catch {
			return { error: "予約日時の形式が不正です" };
		}
	}

	if (status === "scheduled" && !scheduledAt) {
		return { error: "予約ステータスには予約日時が必要です" };
	}

	try {
		await db
			.prepare(
				`UPDATE x_posts
				 SET title = ?,
				     body = ?,
				     image_key = ?,
				     status = ?,
				     scheduled_at = ?,
				     notes = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(title, body, imageKey, status, scheduledAt, notes, id)
			.run();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `投稿の更新に失敗しました: ${message}` };
	}

	try {
		revalidateXPostPages();
	} catch (error) {
		console.error("revalidateXPostPages failed", error);
	}
	return {};
}

export async function updateXPostFormAction(
	_prev: XPostFormState,
	formData: FormData,
): Promise<XPostFormState> {
	const result = await updateXPost(formData);
	if (result.error) return { error: result.error, ok: false };
	return { error: null, ok: true };
}

export async function createCategory(formData: FormData) {
	const db = await getDb();
	const name = String(formData.get("name") ?? "").trim();
	const color = normalizeColor(formData.get("color"));
	if (!name) {
		throw new Error("カテゴリ名は必須です");
	}

	const existing = await db
		.prepare("SELECT id FROM categories WHERE lower(name) = lower(?)")
		.bind(name)
		.first();
	if (existing) {
		throw new Error("同じ名前のカテゴリが既にあります");
	}

	const maxSort = await db
		.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM categories")
		.first<{ max_sort: number }>();

	const id = newId("cat");
	await db
		.prepare(
			`INSERT INTO categories (id, name, color, sort_order)
			 VALUES (?, ?, ?, ?)`,
		)
		.bind(id, name, color, (maxSort?.max_sort ?? 0) + 10)
		.run();

	revalidateTaskPages();
}

export async function updateCategory(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const name = String(formData.get("name") ?? "").trim();
	const color = normalizeColor(formData.get("color"));
	const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();

	if (!id || !name) {
		throw new Error("id とカテゴリ名が必要です");
	}

	const duplicate = await db
		.prepare("SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?")
		.bind(name, id)
		.first();
	if (duplicate) {
		throw new Error("同じ名前のカテゴリが既にあります");
	}

	const sortOrder = Number.parseInt(sortOrderRaw, 10);
	await db
		.prepare(
			`UPDATE categories
			 SET name = ?,
			     color = ?,
			     sort_order = ?,
			     updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(name, color, Number.isFinite(sortOrder) ? sortOrder : 0, id)
		.run();

	revalidateTaskPages();
}

export async function deleteCategory(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	await db
		.prepare("UPDATE tasks SET category_id = NULL, updated_at = datetime('now') WHERE category_id = ?")
		.bind(id)
		.run();
	await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
	revalidateTaskPages();
}

export async function createOrgRule(formData: FormData) {
	const db = await getDb();
	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const isActive = parseIsActive(formData);

	if (!title) {
		throw new Error("タイトルは必須です");
	}
	if (!body) {
		throw new Error("本文は必須です");
	}

	const maxSort = await db
		.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM org_rules")
		.first<{ max_sort: number }>();

	const id = newId("rule");
	await db
		.prepare(
			`INSERT INTO org_rules (id, title, body, sort_order, is_active)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, title, body, (maxSort?.max_sort ?? 0) + 10, isActive)
		.run();

	revalidateOrgRulesPage();
}

export async function updateOrgRule(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const title = String(formData.get("title") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();
	const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
	const isActive = parseIsActive(formData);

	if (!id || !title) {
		throw new Error("id とタイトルが必要です");
	}
	if (!body) {
		throw new Error("本文は必須です");
	}

	const sortOrder = Number.parseInt(sortOrderRaw, 10);
	await db
		.prepare(
			`UPDATE org_rules
			 SET title = ?,
			     body = ?,
			     sort_order = ?,
			     is_active = ?,
			     updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(title, body, Number.isFinite(sortOrder) ? sortOrder : 0, isActive, id)
		.run();

	revalidateOrgRulesPage();
}

export async function updateOrgRuleBody(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const body = String(formData.get("body") ?? "").trim();

	if (!id) {
		throw new Error("id が必要です");
	}
	if (!body) {
		throw new Error("本文は必須です");
	}

	const existing = await db
		.prepare("SELECT id FROM org_rules WHERE id = ?")
		.bind(id)
		.first();
	if (!existing) {
		throw new Error("組織ルールが見つかりません");
	}

	await db
		.prepare(
			`UPDATE org_rules
			 SET body = ?,
			     updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(body, id)
		.run();

	revalidateOrgRulesPage();
}

export async function deleteOrgRule(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	await db.prepare("DELETE FROM org_rules WHERE id = ?").bind(id).run();
	revalidateOrgRulesPage();
}

export async function createTag(formData: FormData) {
	const db = await getDb();
	const name = String(formData.get("name") ?? "").trim();
	const color = normalizeColor(formData.get("color"));
	if (!name) {
		throw new Error("タグ名は必須です");
	}

	const existing = await db
		.prepare("SELECT id FROM tags WHERE lower(name) = lower(?)")
		.bind(name)
		.first();
	if (existing) {
		throw new Error("同じ名前のタグが既にあります");
	}

	const id = newId("tag");
	await db
		.prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
		.bind(id, name, color)
		.run();
	revalidateTaskPages();
}

export async function updateTag(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const name = String(formData.get("name") ?? "").trim();
	const color = normalizeColor(formData.get("color"));

	if (!id || !name) {
		throw new Error("id とタグ名が必要です");
	}

	const duplicate = await db
		.prepare("SELECT id FROM tags WHERE lower(name) = lower(?) AND id != ?")
		.bind(name, id)
		.first();
	if (duplicate) {
		throw new Error("同じ名前のタグが既にあります");
	}

	const existing = await db.prepare("SELECT id FROM tags WHERE id = ?").bind(id).first();
	if (!existing) {
		throw new Error("タグが見つかりません");
	}

	await db
		.prepare("UPDATE tags SET name = ?, color = ? WHERE id = ?")
		.bind(name, color, id)
		.run();

	revalidateTaskPages();
}

export async function deleteTag(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	await db.prepare("DELETE FROM task_tags WHERE tag_id = ?").bind(id).run();
	await db.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
	revalidateTaskPages();
}

export async function updateTaskStatus(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const status = String(formData.get("status") ?? "").trim() as TaskStatus;

	if (!id || !status) {
		throw new Error("id と status が必要です");
	}

	await db
		.prepare(
			`UPDATE tasks
			 SET status = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(status, id)
		.run();

	revalidateTaskPages();
}

export async function deleteTask(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	const row = await db
		.prepare("SELECT image_key FROM tasks WHERE id = ?")
		.bind(id)
		.first<{ image_key: string | null }>();

	if (row?.image_key) {
		const media = await getMediaBucket();
		await media.delete(row.image_key);
	}

	await db.prepare("DELETE FROM task_tags WHERE task_id = ?").bind(id).run();
	await db.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
	revalidateTaskPages();
}

export async function updateXPostStatus(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	const status = String(formData.get("status") ?? "").trim() as TaskStatus;

	if (!id || !status) {
		throw new Error("id と status が必要です");
	}

	await db
		.prepare(
			`UPDATE x_posts
			 SET status = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(status, id)
		.run();

	revalidateXPostPages();
}

export async function deleteXPost(formData: FormData) {
	const db = await getDb();
	const id = String(formData.get("id") ?? "").trim();
	if (!id) return;

	const row = await db
		.prepare("SELECT image_key FROM x_posts WHERE id = ?")
		.bind(id)
		.first<{ image_key: string | null }>();

	if (row?.image_key) {
		const media = await getMediaBucket();
		await media.delete(row.image_key);
	}

	await db.prepare("DELETE FROM x_posts WHERE id = ?").bind(id).run();
	revalidateXPostPages();
}

/** 予約時刻を過ぎた X 投稿をまとめて実行 */
export async function runDueXPosts() {
	const { env } = await getCloudflareContext({ async: true });
	const startedAt = new Date().toISOString();
	try {
		const result = await publishDueXPosts(env);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "x-due-ui",
			ok: result.failed === 0,
			startedAt,
			finishedAt: new Date().toISOString(),
			error:
				result.failed > 0
					? result.errors.map((e) => e.message).join("; ").slice(0, 2000)
					: null,
			meta: {
				attempted: result.attempted,
				succeeded: result.succeeded,
				failed: result.failed,
			},
		});
		revalidateXPostPages();
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "x-due-ui",
			ok: false,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: message,
		});
		throw error;
	}
}

/**
 * @automation
 * id: x-one-ui
 * name: X へ単発投稿
 * runner: manual
 * status: manual
 * trigger: 予定一覧の行アクション「Xへ投稿」
 * summary: 指定の x_posts 1件を予約時刻を待たず投稿する（承認済・予約・失敗が対象）。
 * location: XPostScheduleTable → postXPostNow → publishXPostNow
 * href: /x-schedule
 */
export async function postXPostNow(formData: FormData) {
	const id = String(formData.get("id") ?? "").trim();
	if (!id) {
		throw new Error("id が必要です");
	}
	const { env } = await getCloudflareContext({ async: true });
	const startedAt = new Date().toISOString();
	try {
		await publishXPostNow(env, id);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "x-one-ui",
			ok: true,
			startedAt,
			finishedAt: new Date().toISOString(),
			meta: { postId: id },
		});
		revalidateXPostPages();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await recordAutomationRun(env.DB, {
			source: LOCAL_SOURCE,
			automationId: "x-one-ui",
			ok: false,
			startedAt,
			finishedAt: new Date().toISOString(),
			error: message,
			meta: { postId: id },
		});
		throw error;
	}
}

async function resolveAppName(
	db: Awaited<ReturnType<typeof getDb>>,
	appNameId: string,
): Promise<AppName> {
	const row = await db
		.prepare(
			`SELECT id, name, sort_order, created_at, updated_at
			 FROM app_names WHERE id = ?`,
		)
		.bind(appNameId)
		.first<AppName>();
	if (!row) {
		throw new Error("アプリケーション名マスタが見つかりません");
	}
	return row;
}

async function resolveAppGroup(
	db: Awaited<ReturnType<typeof getDb>>,
	appGroupId: string,
): Promise<AppGroup> {
	const row = await db
		.prepare(
			`SELECT id, name, sort_order, created_at, updated_at
			 FROM app_groups WHERE id = ?`,
		)
		.bind(appGroupId)
		.first<AppGroup>();
	if (!row) {
		throw new Error("アプリグループマスタが見つかりません");
	}
	return row;
}

async function resolveAppType(
	db: Awaited<ReturnType<typeof getDb>>,
	appTypeId: string,
): Promise<AppType> {
	const row = await db
		.prepare(
			`SELECT id, name, color, text_color, icon, sort_order, created_at, updated_at
			 FROM app_types WHERE id = ?`,
		)
		.bind(appTypeId)
		.first<AppType>();
	if (!row) {
		throw new Error("AppType マスタが見つかりません");
	}
	return row;
}

type MasterKind = "names" | "groups" | "types";

const MASTER_CONFIG = {
	names: {
		table: "app_names",
		fkColumn: "app_name_id",
		idPrefix: "appname",
		label: "アプリケーション名",
		syncColumn: "name",
		hasColor: true,
		hasIcon: true,
	},
	groups: {
		table: "app_groups",
		fkColumn: "app_group_id",
		idPrefix: "appgroup",
		label: "アプリグループ",
		syncColumn: "app_group",
		hasColor: true,
		hasIcon: true,
	},
	types: {
		table: "app_types",
		fkColumn: "app_type_id",
		idPrefix: "apptype",
		label: "AppType",
		syncColumn: "app_type",
		hasColor: true,
		hasIcon: true,
	},
} as const;

async function listMasterRows<T>(kind: MasterKind): Promise<T[]> {
	const db = await getDb();
	const { table, hasColor, hasIcon } = MASTER_CONFIG[kind];
	const columns = [
		"id",
		"name",
		...(hasColor ? ["color", "text_color"] : []),
		...(hasIcon ? ["icon"] : []),
		"sort_order",
		"created_at",
		"updated_at",
	].join(", ");
	const { results } = await db
		.prepare(
			`SELECT ${columns}
			 FROM ${table}
			 ORDER BY sort_order ASC, name ASC`,
		)
		.all<T>();
	return results ?? [];
}

async function createMasterRow(kind: MasterKind, formData: FormData) {
	const db = await getDb();
	const { table, idPrefix, label, hasColor, hasIcon } = MASTER_CONFIG[kind];
	const name = formText(formData, "name");
	if (!name) {
		throw new Error(`${label}は必須です`);
	}

	const existing = await db
		.prepare(`SELECT id FROM ${table} WHERE lower(name) = lower(?)`)
		.bind(name)
		.first();
	if (existing) {
		throw new Error(`同じ${label}が既にあります`);
	}

	const maxSort = await db
		.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM ${table}`)
		.first<{ max_sort: number }>();

	const id = newId(idPrefix);
	const sortOrder = (maxSort?.max_sort ?? 0) + 10;
	const color = hasColor ? normalizeColor(formData.get("color")) : "";
	const textColor = hasColor ? normalizeColor(formData.get("text_color")) : "";
	const icon = hasIcon ? normalizeAppMasterIcon(formData.get("icon")) : "";

	if (hasColor && hasIcon) {
		await db
			.prepare(
				`INSERT INTO ${table} (id, name, color, text_color, icon, sort_order)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(id, name, color, textColor, icon, sortOrder)
			.run();
	} else if (hasColor) {
		await db
			.prepare(
				`INSERT INTO ${table} (id, name, color, text_color, sort_order)
				 VALUES (?, ?, ?, ?, ?)`,
			)
			.bind(id, name, color, textColor, sortOrder)
			.run();
	} else {
		await db
			.prepare(`INSERT INTO ${table} (id, name, sort_order) VALUES (?, ?, ?)`)
			.bind(id, name, sortOrder)
			.run();
	}

	revalidateAppsPage();
}

async function updateMasterRow(kind: MasterKind, formData: FormData) {
	const db = await getDb();
	const { table, fkColumn, syncColumn, label, hasColor, hasIcon } = MASTER_CONFIG[kind];
	const id = formText(formData, "id");
	const name = formText(formData, "name");
	if (!id || !name) {
		throw new Error(`id と${label}が必要です`);
	}

	const duplicate = await db
		.prepare(`SELECT id FROM ${table} WHERE lower(name) = lower(?) AND id != ?`)
		.bind(name, id)
		.first();
	if (duplicate) {
		throw new Error(`同じ${label}が既にあります`);
	}

	const color = hasColor ? normalizeColor(formData.get("color")) : "";
	const textColor = hasColor ? normalizeColor(formData.get("text_color")) : "";
	const icon = hasIcon ? normalizeAppMasterIcon(formData.get("icon")) : "";

	if (hasColor && hasIcon) {
		await db
			.prepare(
				`UPDATE ${table}
				 SET name = ?,
				     color = ?,
				     text_color = ?,
				     icon = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(name, color, textColor, icon, id)
			.run();
	} else if (hasColor) {
		await db
			.prepare(
				`UPDATE ${table}
				 SET name = ?,
				     color = ?,
				     text_color = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(name, color, textColor, id)
			.run();
	} else {
		await db
			.prepare(
				`UPDATE ${table}
				 SET name = ?,
				     updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(name, id)
			.run();
	}

	await db
		.prepare(
			`UPDATE apps
			 SET ${syncColumn} = ?, updated_at = datetime('now')
			 WHERE ${fkColumn} = ?`,
		)
		.bind(name, id)
		.run();

	revalidateAppsPage();
}

async function reorderMasterRows(kind: MasterKind, ids: string[]) {
	const db = await getDb();
	const { table } = MASTER_CONFIG[kind];
	const orderedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
	if (orderedIds.length === 0) return;

	const statements = orderedIds.map((id, index) =>
		db
			.prepare(
				`UPDATE ${table} SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
			)
			.bind((index + 1) * 10, id),
	);
	await db.batch(statements);
	revalidateAppsPage();
}

async function deleteMasterRow(kind: MasterKind, formData: FormData) {
	const db = await getDb();
	const { table, fkColumn, label } = MASTER_CONFIG[kind];
	const id = formText(formData, "id");
	if (!id) return;

	const inUse = await db
		.prepare(`SELECT id FROM apps WHERE ${fkColumn} = ? LIMIT 1`)
		.bind(id)
		.first();
	if (inUse) {
		throw new Error(`この${label}は App 管理で使用中のため削除できません`);
	}

	await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
	revalidateAppsPage();
}

export async function listAppNames(): Promise<AppName[]> {
	return listMasterRows<AppName>("names");
}

export async function createAppName(formData: FormData) {
	await createMasterRow("names", formData);
}

export async function updateAppName(formData: FormData) {
	await updateMasterRow("names", formData);
}

export async function reorderAppNames(ids: string[]) {
	await reorderMasterRows("names", ids);
}

export async function deleteAppName(formData: FormData) {
	await deleteMasterRow("names", formData);
}

export async function listAppGroups(): Promise<AppGroup[]> {
	return listMasterRows<AppGroup>("groups");
}

export async function createAppGroup(formData: FormData) {
	await createMasterRow("groups", formData);
}

export async function updateAppGroup(formData: FormData) {
	await updateMasterRow("groups", formData);
}

export async function reorderAppGroups(ids: string[]) {
	await reorderMasterRows("groups", ids);
}

export async function deleteAppGroup(formData: FormData) {
	await deleteMasterRow("groups", formData);
}

export async function listAppTypes(): Promise<AppType[]> {
	return listMasterRows<AppType>("types");
}

export async function createAppType(formData: FormData) {
	await createMasterRow("types", formData);
}

export async function updateAppType(formData: FormData) {
	await updateMasterRow("types", formData);
}

export async function reorderAppTypes(ids: string[]) {
	await reorderMasterRows("types", ids);
}

export async function deleteAppType(formData: FormData) {
	await deleteMasterRow("types", formData);
}

export async function listApps(): Promise<AppEntry[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT a.id, a.sort_order,
			        a.app_group_id, COALESCE(g.name, a.app_group) AS app_group,
			        COALESCE(g.color, '') AS app_group_color,
			        COALESCE(g.text_color, '') AS app_group_text_color,
			        COALESCE(g.icon, '') AS app_group_icon,
			        a.app_name_id, COALESCE(n.name, a.name) AS name,
			        COALESCE(n.color, '') AS name_color,
			        COALESCE(n.text_color, '') AS name_text_color,
			        COALESCE(n.icon, '') AS name_icon,
			        a.app_type_id, COALESCE(t.name, a.app_type) AS app_type,
			        COALESCE(t.color, '') AS app_type_color,
			        COALESCE(t.text_color, '') AS app_type_text_color,
			        COALESCE(t.icon, '') AS app_type_icon,
			        a.dev_policy, a.dev_folder,
			        a.frontend, a.css, a.backend, a.db, a.storage, a.port, a.auth,
			        a.staging_url, a.hosting, a.production_url, a.owner, a.last_deployed_at, a.notes,
			        a.created_at, a.updated_at
			 FROM apps a
			 LEFT JOIN app_names n ON n.id = a.app_name_id
			 LEFT JOIN app_groups g ON g.id = a.app_group_id
			 LEFT JOIN app_types t ON t.id = a.app_type_id
			 ORDER BY a.sort_order ASC, name ASC`,
		)
		.all<AppEntry>();
	return results ?? [];
}

export async function createApp(formData: FormData) {
	const db = await getDb();
	const appNameId = formText(formData, "app_name_id");
	if (!appNameId) {
		throw new Error("アプリケーション名は必須です");
	}
	const appName = await resolveAppName(db, appNameId);

	const appGroupId = formText(formData, "app_group_id");
	const appGroup = appGroupId ? await resolveAppGroup(db, appGroupId) : null;
	const appTypeId = formText(formData, "app_type_id");
	const appType = appTypeId ? await resolveAppType(db, appTypeId) : null;

	const maxSort = await db
		.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM apps")
		.first<{ max_sort: number }>();

	const id = newId("app");
	await db
		.prepare(
			`INSERT INTO apps (
				id, sort_order, app_group_id, app_group, app_name_id, name,
				app_type_id, app_type, dev_policy, dev_folder,
				frontend, css, backend, db, storage, port, auth,
				staging_url, hosting, production_url, owner, last_deployed_at, notes
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			(maxSort?.max_sort ?? 0) + 10,
			appGroup?.id ?? null,
			appGroup?.name ?? "",
			appName.id,
			appName.name,
			appType?.id ?? null,
			appType?.name ?? "",
			formText(formData, "dev_policy"),
			formText(formData, "dev_folder"),
			formText(formData, "frontend"),
			formText(formData, "css"),
			formText(formData, "backend"),
			formText(formData, "db"),
			formText(formData, "storage"),
			formText(formData, "port"),
			formText(formData, "auth"),
			formText(formData, "staging_url"),
			formText(formData, "hosting"),
			formText(formData, "production_url"),
			formText(formData, "owner"),
			formText(formData, "last_deployed_at"),
			formText(formData, "notes"),
		)
		.run();

	revalidateAppsPage();
}

export async function updateApp(formData: FormData) {
	const db = await getDb();
	const id = formText(formData, "id");
	const appNameId = formText(formData, "app_name_id");
	if (!id || !appNameId) {
		throw new Error("id とアプリケーション名が必要です");
	}

	const existing = await db
		.prepare("SELECT id FROM apps WHERE id = ?")
		.bind(id)
		.first();
	if (!existing) {
		throw new Error("アプリが見つかりません");
	}

	const appName = await resolveAppName(db, appNameId);
	const appGroupId = formText(formData, "app_group_id");
	const appGroup = appGroupId ? await resolveAppGroup(db, appGroupId) : null;
	const appTypeId = formText(formData, "app_type_id");
	const appType = appTypeId ? await resolveAppType(db, appTypeId) : null;

	await db
		.prepare(
			`UPDATE apps
			 SET app_group_id = ?,
			     app_group = ?,
			     app_name_id = ?,
			     name = ?,
			     app_type_id = ?,
			     app_type = ?,
			     dev_policy = ?,
			     dev_folder = ?,
			     frontend = ?,
			     css = ?,
			     backend = ?,
			     db = ?,
			     storage = ?,
			     port = ?,
			     auth = ?,
			     staging_url = ?,
			     hosting = ?,
			     production_url = ?,
			     owner = ?,
			     last_deployed_at = ?,
			     notes = ?,
			     updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(
			appGroup?.id ?? null,
			appGroup?.name ?? "",
			appName.id,
			appName.name,
			appType?.id ?? null,
			appType?.name ?? "",
			formText(formData, "dev_policy"),
			formText(formData, "dev_folder"),
			formText(formData, "frontend"),
			formText(formData, "css"),
			formText(formData, "backend"),
			formText(formData, "db"),
			formText(formData, "storage"),
			formText(formData, "port"),
			formText(formData, "auth"),
			formText(formData, "staging_url"),
			formText(formData, "hosting"),
			formText(formData, "production_url"),
			formText(formData, "owner"),
			formText(formData, "last_deployed_at"),
			formText(formData, "notes"),
			id,
		)
		.run();

	revalidateAppsPage();
}

export async function reorderApps(ids: string[]) {
	const db = await getDb();
	const orderedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
	if (orderedIds.length === 0) return;

	const statements = orderedIds.map((id, index) =>
		db
			.prepare("UPDATE apps SET sort_order = ?, updated_at = datetime('now') WHERE id = ?")
			.bind((index + 1) * 10, id),
	);
	await db.batch(statements);
	revalidateAppsPage();
}

export async function deleteApp(formData: FormData) {
	const db = await getDb();
	const id = formText(formData, "id");
	if (!id) return;

	await db.prepare("DELETE FROM apps WHERE id = ?").bind(id).run();
	revalidateAppsPage();
}

export async function listAppCrons(): Promise<AppCron[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT id, sort_order, environment, schedule, kind, target, notes,
			        created_at, updated_at
			 FROM app_crons
			 ORDER BY sort_order ASC, created_at ASC`,
		)
		.all<AppCron>();
	return results ?? [];
}

export async function createAppCron(formData: FormData) {
	const db = await getDb();
	const schedule = formText(formData, "schedule");
	const target = formText(formData, "target");
	if (!schedule && !target) {
		throw new Error("スケジュールか対象のどちらかは必須です");
	}

	const maxSort = await db
		.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM app_crons")
		.first<{ max_sort: number }>();

	const id = newId("cron");
	await db
		.prepare(
			`INSERT INTO app_crons (
				id, sort_order, environment, schedule, kind, target, notes
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			(maxSort?.max_sort ?? 0) + 10,
			formText(formData, "environment"),
			schedule,
			formText(formData, "kind"),
			target,
			formText(formData, "notes"),
		)
		.run();

	revalidateAutomationsPage();
}

export async function updateAppCron(formData: FormData) {
	const db = await getDb();
	const id = formText(formData, "id");
	if (!id) {
		throw new Error("id が必要です");
	}

	const existing = await db
		.prepare("SELECT id FROM app_crons WHERE id = ?")
		.bind(id)
		.first();
	if (!existing) {
		throw new Error("cron が見つかりません");
	}

	await db
		.prepare(
			`UPDATE app_crons
			 SET environment = ?,
			     schedule = ?,
			     kind = ?,
			     target = ?,
			     notes = ?,
			     updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(
			formText(formData, "environment"),
			formText(formData, "schedule"),
			formText(formData, "kind"),
			formText(formData, "target"),
			formText(formData, "notes"),
			id,
		)
		.run();

	revalidateAutomationsPage();
}

export async function reorderAppCrons(ids: string[]) {
	const db = await getDb();
	const orderedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
	if (orderedIds.length === 0) return;

	const statements = orderedIds.map((id, index) =>
		db
			.prepare(
				"UPDATE app_crons SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
			)
			.bind((index + 1) * 10, id),
	);
	await db.batch(statements);
	revalidateAutomationsPage();
}

export async function deleteAppCron(formData: FormData) {
	const db = await getDb();
	const id = formText(formData, "id");
	if (!id) return;

	await db.prepare("DELETE FROM app_crons WHERE id = ?").bind(id).run();
	revalidateAutomationsPage();
}

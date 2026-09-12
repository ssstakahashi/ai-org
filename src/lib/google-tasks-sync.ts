import { newId, queryInChunks } from "@/lib/db";
import {
	getGoogleTasksAccessToken,
	isGoogleTasksAuthConfigured,
	type GoogleTasksAuthEnv,
} from "@/lib/google-auth";
import {
	deleteGoogleTask,
	insertGoogleTask,
	insertGoogleTasklist,
	listGoogleTasklists,
	listGoogleTasks,
	patchGoogleTask,
	type GoogleTask,
	type GoogleTaskStatus,
} from "@/lib/google-tasks";
import { fromZonedParts, getZonedParts, toAppDateKey } from "@/lib/timezone";
import type { TaskStatus } from "@/lib/types";

export const GOOGLE_TASKS_DEFAULT_LIST_TITLE = "ai-org";
export const GOOGLE_TASKS_CRON = "*/10 * * * *";

const UNTITLED = "（無題）";
const TITLE_MAX = 1024;
const NOTES_MAX = 8192;
const STATE_ID = "default";

export type GoogleTasksSyncEnv = GoogleTasksAuthEnv & {
	DB: D1Database;
	GOOGLE_TASKS_LIST_ID?: string;
	GOOGLE_TASKS_LIST_TITLE?: string;
	GOOGLE_TASKS_DEFAULT_EMPLOYEE_ID?: string;
};

type LocalTaskRow = {
	id: string;
	employee_id: string;
	title: string;
	body: string;
	status: TaskStatus;
	start_at: string | null;
	end_at: string | null;
	updated_at: string;
};

type SyncMapRow = {
	task_id: string;
	google_tasklist_id: string;
	google_task_id: string;
	etag: string;
	google_updated_at: string | null;
	payload_hash: string;
	last_source: "ai-org" | "google";
	synced_at: string;
};

type SyncStateRow = {
	id: string;
	tasklist_id: string | null;
	last_polled_at: string | null;
	last_updated_min: string | null;
	oauth_refresh_token?: string | null;
};

export type GoogleTaskRef = {
	google_tasklist_id: string;
	google_task_id: string;
};

export type GoogleTasksSyncResult = {
	skipped: boolean;
	reason?: string;
	tasklistId?: string;
	pulled: number;
	createdLocal: number;
	updatedLocal: number;
	deletedLocal: number;
	createdGoogle: number;
	updatedGoogle: number;
	deletedGoogle: number;
	errors: string[];
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

export async function isGoogleTasksSyncConfigured(env: GoogleTasksSyncEnv): Promise<boolean> {
	const stored = await loadOauthRefreshToken(env.DB);
	return isGoogleTasksAuthConfigured(env, stored);
}

async function loadOauthRefreshToken(db: D1Database): Promise<string | null> {
	try {
		const row = await db
			.prepare("SELECT oauth_refresh_token FROM google_task_sync_state WHERE id = ?")
			.bind(STATE_ID)
			.first<{ oauth_refresh_token: string | null }>();
		return row?.oauth_refresh_token?.trim() || null;
	} catch {
		return null;
	}
}

export async function saveGoogleTasksOauthRefreshToken(
	db: D1Database,
	refreshToken: string,
): Promise<void> {
	await db.prepare("INSERT OR IGNORE INTO google_task_sync_state (id) VALUES (?)").bind(STATE_ID).run();
	await db
		.prepare("UPDATE google_task_sync_state SET oauth_refresh_token = ? WHERE id = ?")
		.bind(refreshToken, STATE_ID)
		.run();
}

async function tasksAccessToken(env: GoogleTasksSyncEnv): Promise<string> {
	const stored = await loadOauthRefreshToken(env.DB);
	return getGoogleTasksAccessToken(env, stored);
}

export function localStatusToGoogle(status: TaskStatus): GoogleTaskStatus {
	return status === "done" ? "completed" : "needsAction";
}

export function applyGoogleStatus(local: TaskStatus, google: GoogleTaskStatus): TaskStatus {
	if (google === "completed") return "done";
	if (local === "done") return "approved";
	return local;
}

export function googleDueDateKey(due: string | undefined): string | null {
	if (!due) return null;
	const date = new Date(due);
	if (Number.isNaN(date.getTime())) return null;
	return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function endAtToGoogleDue(endAt: string | null): string | null {
	if (!endAt) return null;
	const key = toAppDateKey(endAt);
	if (!key) return null;
	return `${key}T00:00:00.000Z`;
}

export function applyDueToEndAt(
	due: string | undefined,
	existingEndAt: string | null,
	existingStartAt: string | null,
): { endAt: string | null; startAt: string | null } {
	const dateKey = googleDueDateKey(due);
	if (!dateKey) {
		return { endAt: existingEndAt, startAt: existingStartAt };
	}
	const [year, month, day] = dateKey.split("-").map(Number);
	const existing = existingEndAt ? getZonedParts(new Date(existingEndAt)) : null;
	const endAt = fromZonedParts({
		year,
		month,
		day,
		hour: existing?.hour ?? 18,
		minute: existing?.minute ?? 0,
		second: existing?.second ?? 0,
		millisecond: existing?.millisecond ?? 0,
	}).toISOString();

	if (!existingStartAt) {
		return { endAt, startAt: existingStartAt };
	}
	const start = new Date(existingStartAt);
	const end = new Date(endAt);
	if (start.getTime() <= end.getTime()) {
		return { endAt, startAt: existingStartAt };
	}
	const startParts = getZonedParts(start);
	const startAt = fromZonedParts({
		year,
		month,
		day,
		hour: startParts.hour,
		minute: startParts.minute,
		second: startParts.second,
		millisecond: startParts.millisecond,
	}).toISOString();
	if (new Date(startAt).getTime() <= end.getTime()) {
		return { endAt, startAt };
	}
	return { endAt, startAt: endAt };
}

export function syncedPayloadHash(input: {
	title: string;
	notes: string;
	googleStatus: GoogleTaskStatus;
	dueDateKey: string | null;
}): string {
	return [input.title, input.notes, input.googleStatus, input.dueDateKey ?? ""].join("\n");
}

function hashFromLocal(task: Pick<LocalTaskRow, "title" | "body" | "status" | "end_at">): string {
	return syncedPayloadHash({
		title: task.title.slice(0, TITLE_MAX),
		notes: task.body.slice(0, NOTES_MAX),
		googleStatus: localStatusToGoogle(task.status),
		dueDateKey: task.end_at ? toAppDateKey(task.end_at) || null : null,
	});
}

function hashFromGoogle(task: GoogleTask): string {
	const title = (task.title ?? "").trim() || UNTITLED;
	return syncedPayloadHash({
		title: title.slice(0, TITLE_MAX),
		notes: (task.notes ?? "").slice(0, NOTES_MAX),
		googleStatus: task.status === "completed" ? "completed" : "needsAction",
		dueDateKey: googleDueDateKey(task.due),
	});
}

function parseTimestamp(value: string | null | undefined): number {
	if (!value) return 0;
	if (value.includes("T")) {
		const ms = Date.parse(value);
		return Number.isNaN(ms) ? 0 : ms;
	}
	const ms = Date.parse(`${value.replace(" ", "T")}Z`);
	return Number.isNaN(ms) ? 0 : ms;
}

function googleIsNewer(googleUpdated: string | undefined, localUpdated: string): boolean {
	return parseTimestamp(googleUpdated) >= parseTimestamp(localUpdated);
}

function isAssigned(task: GoogleTask): boolean {
	return task.assignmentInfo != null;
}

function clipTitle(title: string): string {
	const trimmed = title.trim() || UNTITLED;
	return trimmed.slice(0, TITLE_MAX);
}

function clipNotes(notes: string): string {
	return notes.slice(0, NOTES_MAX);
}

function googleWriteBody(task: Pick<LocalTaskRow, "title" | "body" | "status" | "end_at">) {
	const due = endAtToGoogleDue(task.end_at);
	return {
		title: clipTitle(task.title),
		notes: clipNotes(task.body),
		status: localStatusToGoogle(task.status),
		due: due ?? undefined,
	};
}

function emptyResult(skipped: boolean, reason?: string): GoogleTasksSyncResult {
	return {
		skipped,
		reason,
		pulled: 0,
		createdLocal: 0,
		updatedLocal: 0,
		deletedLocal: 0,
		createdGoogle: 0,
		updatedGoogle: 0,
		deletedGoogle: 0,
		errors: [],
	};
}

function pushError(result: GoogleTasksSyncResult, context: string, error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	result.errors.push(`${context}: ${message}`);
	console.error("google tasks sync", context, error);
}

async function loadState(db: D1Database): Promise<SyncStateRow> {
	const row = await db
		.prepare(
			"SELECT id, tasklist_id, last_polled_at, last_updated_min FROM google_task_sync_state WHERE id = ?",
		)
		.bind(STATE_ID)
		.first<SyncStateRow>();
	if (row) return row;
	await db.prepare("INSERT OR IGNORE INTO google_task_sync_state (id) VALUES (?)").bind(STATE_ID).run();
	return { id: STATE_ID, tasklist_id: null, last_polled_at: null, last_updated_min: null };
}

async function saveState(
	db: D1Database,
	patch: { tasklist_id?: string | null; last_polled_at?: string | null; last_updated_min?: string | null },
): Promise<void> {
	await db
		.prepare(
			`UPDATE google_task_sync_state
			 SET tasklist_id = COALESCE(?, tasklist_id),
			     last_polled_at = COALESCE(?, last_polled_at),
			     last_updated_min = COALESCE(?, last_updated_min)
			 WHERE id = ?`,
		)
		.bind(patch.tasklist_id ?? null, patch.last_polled_at ?? null, patch.last_updated_min ?? null, STATE_ID)
		.run();
}

async function ensureTasklist(token: string, env: GoogleTasksSyncEnv, db: D1Database): Promise<string> {
	const configuredId = env.GOOGLE_TASKS_LIST_ID?.trim();
	if (configuredId) {
		await saveState(db, { tasklist_id: configuredId });
		return configuredId;
	}

	const title = env.GOOGLE_TASKS_LIST_TITLE?.trim() || GOOGLE_TASKS_DEFAULT_LIST_TITLE;
	const lists = await listGoogleTasklists(token);
	const found = lists.find((list) => (list.title ?? "") === title && list.id);
	if (found?.id) {
		await saveState(db, { tasklist_id: found.id });
		return found.id;
	}

	const created = await insertGoogleTasklist(token, title);
	if (!created.id) {
		throw new Error("Google タスクリストの作成に失敗しました");
	}
	await saveState(db, { tasklist_id: created.id });
	return created.id;
}

async function defaultEmployeeId(env: GoogleTasksSyncEnv): Promise<string | null> {
	const configured = env.GOOGLE_TASKS_DEFAULT_EMPLOYEE_ID?.trim();
	if (configured) {
		const row = await env.DB.prepare("SELECT id FROM employees WHERE id = ?")
			.bind(configured)
			.first<{ id: string }>();
		if (row?.id) return row.id;
	}
	const row = await env.DB.prepare(
		"SELECT id FROM employees ORDER BY sort_order ASC, name ASC LIMIT 1",
	).first<{ id: string }>();
	return row?.id ?? null;
}

async function loadMappings(db: D1Database): Promise<SyncMapRow[]> {
	const { results } = await db
		.prepare(
			`SELECT task_id, google_tasklist_id, google_task_id, etag, google_updated_at,
			        payload_hash, last_source, synced_at
			 FROM google_task_sync`,
		)
		.all<SyncMapRow>();
	return results ?? [];
}

async function loadLocalTasks(db: D1Database): Promise<LocalTaskRow[]> {
	const { results } = await db
		.prepare(
			`SELECT id, employee_id, title, body, status, start_at, end_at, updated_at
			 FROM tasks`,
		)
		.all<LocalTaskRow>();
	return results ?? [];
}

async function upsertMapping(
	db: D1Database,
	row: {
		task_id: string;
		google_tasklist_id: string;
		google_task_id: string;
		etag: string;
		google_updated_at: string | null;
		payload_hash: string;
		last_source: "ai-org" | "google";
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO google_task_sync
				(task_id, google_tasklist_id, google_task_id, etag, google_updated_at, payload_hash, last_source, synced_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(task_id) DO UPDATE SET
				google_tasklist_id = excluded.google_tasklist_id,
				google_task_id = excluded.google_task_id,
				etag = excluded.etag,
				google_updated_at = excluded.google_updated_at,
				payload_hash = excluded.payload_hash,
				last_source = excluded.last_source,
				synced_at = datetime('now')`,
		)
		.bind(
			row.task_id,
			row.google_tasklist_id,
			row.google_task_id,
			row.etag,
			row.google_updated_at,
			row.payload_hash,
			row.last_source,
		)
		.run();
}

async function deleteMappingByTaskId(db: D1Database, taskId: string): Promise<void> {
	await db.prepare("DELETE FROM google_task_sync WHERE task_id = ?").bind(taskId).run();
}

async function createLocalFromGoogle(
	env: GoogleTasksSyncEnv,
	tasklistId: string,
	google: GoogleTask,
	employeeId: string,
): Promise<string> {
	const id = newId("task");
	const title = clipTitle(google.title ?? "");
	const body = clipNotes(google.notes ?? "");
	const status = applyGoogleStatus("approved", google.status === "completed" ? "completed" : "needsAction");
	const dates = applyDueToEndAt(google.due, null, null);
	await env.DB.prepare(
		`INSERT INTO tasks
			(id, employee_id, title, body, image_key, status, start_at, end_at, notes, category_id, task_group_id, recurrence_series_id)
		 VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, '', NULL, NULL, NULL)`,
	)
		.bind(id, employeeId, title, body, status, dates.endAt)
		.run();
	await upsertMapping(env.DB, {
		task_id: id,
		google_tasklist_id: tasklistId,
		google_task_id: google.id ?? "",
		etag: google.etag ?? "",
		google_updated_at: google.updated ?? null,
		payload_hash: hashFromGoogle(google),
		last_source: "google",
	});
	return id;
}

async function applyGoogleToLocal(
	db: D1Database,
	local: LocalTaskRow,
	google: GoogleTask,
	map: SyncMapRow,
): Promise<void> {
	const title = clipTitle(google.title ?? "");
	const body = clipNotes(google.notes ?? "");
	const status = applyGoogleStatus(
		local.status,
		google.status === "completed" ? "completed" : "needsAction",
	);
	const dates = applyDueToEndAt(google.due, local.end_at, local.start_at);
	await db
		.prepare(
			`UPDATE tasks
			 SET title = ?, body = ?, status = ?, start_at = ?, end_at = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(title, body, status, dates.startAt, dates.endAt, local.id)
		.run();
	await upsertMapping(db, {
		task_id: local.id,
		google_tasklist_id: map.google_tasklist_id,
		google_task_id: map.google_task_id,
		etag: google.etag ?? "",
		google_updated_at: google.updated ?? null,
		payload_hash: hashFromGoogle(google),
		last_source: "google",
	});
}

async function pushLocal(
	token: string,
	tasklistId: string,
	db: D1Database,
	local: LocalTaskRow,
	map: SyncMapRow | null,
): Promise<{ created: boolean; task: GoogleTask }> {
	const body = googleWriteBody(local);
	if (map) {
		try {
			const updated = await patchGoogleTask(token, map.google_tasklist_id || tasklistId, map.google_task_id, {
				...body,
				etag: map.etag || undefined,
			});
			await upsertMapping(db, {
				task_id: local.id,
				google_tasklist_id: map.google_tasklist_id || tasklistId,
				google_task_id: map.google_task_id,
				etag: updated.etag ?? "",
				google_updated_at: updated.updated ?? null,
				payload_hash: hashFromLocal(local),
				last_source: "ai-org",
			});
			return { created: false, task: updated };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes("Google Tasks API 412") && !message.includes("Google Tasks API 400")) {
				throw error;
			}
			const updated = await patchGoogleTask(token, map.google_tasklist_id || tasklistId, map.google_task_id, body);
			await upsertMapping(db, {
				task_id: local.id,
				google_tasklist_id: map.google_tasklist_id || tasklistId,
				google_task_id: map.google_task_id,
				etag: updated.etag ?? "",
				google_updated_at: updated.updated ?? null,
				payload_hash: hashFromLocal(local),
				last_source: "ai-org",
			});
			return { created: false, task: updated };
		}
	}

	const created = await insertGoogleTask(token, tasklistId, body);
	if (!created.id) {
		throw new Error("Google タスクの作成に失敗しました");
	}
	await upsertMapping(db, {
		task_id: local.id,
		google_tasklist_id: tasklistId,
		google_task_id: created.id,
		etag: created.etag ?? "",
		google_updated_at: created.updated ?? null,
		payload_hash: hashFromLocal(local),
		last_source: "ai-org",
	});
	return { created: true, task: created };
}

async function deleteLocalTask(db: D1Database, taskId: string): Promise<void> {
	await db.batch([
		db.prepare("DELETE FROM task_tags WHERE task_id = ?").bind(taskId),
		db.prepare("DELETE FROM task_links WHERE task_id = ?").bind(taskId),
		db.prepare("DELETE FROM google_task_sync WHERE task_id = ?").bind(taskId),
		db.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId),
	]);
}

export async function syncGoogleTasks(env: GoogleTasksSyncEnv): Promise<GoogleTasksSyncResult> {
	if (!(await isGoogleTasksSyncConfigured(env))) {
		return emptyResult(
			true,
			"Google Tasks の認証が未設定です。OAuth または Workspace ドメイン委任を設定してください。",
		);
	}

	const result = emptyResult(false);
	const token = await tasksAccessToken(env);
	const db = env.DB;
	const tasklistId = await ensureTasklist(token, env, db);
	result.tasklistId = tasklistId;

	const state = await loadState(db);
	const overlapMs = 60_000;
	const updatedMin =
		state.last_updated_min && parseTimestamp(state.last_updated_min) > 0
			? new Date(Math.max(0, parseTimestamp(state.last_updated_min) - overlapMs)).toISOString()
			: undefined;

	const googleTasks = await listGoogleTasks(token, tasklistId, { updatedMin });
	result.pulled = googleTasks.length;

	const googleById = new Map<string, GoogleTask>();
	for (const task of googleTasks) {
		if (task.id) googleById.set(task.id, task);
	}

	const mappings = await loadMappings(db);
	const mapByTaskId = new Map(mappings.map((row) => [row.task_id, row]));
	const mapByGoogleId = new Map(mappings.map((row) => [row.google_task_id, row]));
	const locals = await loadLocalTasks(db);
	const localById = new Map(locals.map((row) => [row.id, row]));

	const employeeId = await defaultEmployeeId(env);
	const seenGoogleIds = new Set<string>();

	for (const google of googleTasks) {
		if (!google.id) continue;
		seenGoogleIds.add(google.id);
		const map = mapByGoogleId.get(google.id);

		if (google.deleted) {
			if (map && localById.has(map.task_id)) {
				try {
					await deleteLocalTask(db, map.task_id);
					result.deletedLocal += 1;
					localById.delete(map.task_id);
					mapByTaskId.delete(map.task_id);
					mapByGoogleId.delete(google.id);
				} catch (error) {
					pushError(result, `delete local ${map.task_id}`, error);
				}
			} else if (map) {
				await deleteMappingByTaskId(db, map.task_id);
				mapByTaskId.delete(map.task_id);
				mapByGoogleId.delete(google.id);
			}
			continue;
		}

		if (map) {
			const local = localById.get(map.task_id);
			if (!local) {
				mapByGoogleId.delete(google.id);
				continue;
			}
			const googleHash = hashFromGoogle(google);
			const localHash = hashFromLocal(local);
			if (googleHash === map.payload_hash && localHash === map.payload_hash) {
				continue;
			}
			if (googleHash !== map.payload_hash && localHash !== map.payload_hash) {
				if (googleIsNewer(google.updated, local.updated_at)) {
					try {
						await applyGoogleToLocal(db, local, google, map);
						result.updatedLocal += 1;
					} catch (error) {
						pushError(result, `update local ${local.id}`, error);
					}
				} else {
					try {
						await pushLocal(token, tasklistId, db, local, map);
						result.updatedGoogle += 1;
					} catch (error) {
						pushError(result, `update google ${map.google_task_id}`, error);
					}
				}
				continue;
			}
			if (googleHash !== map.payload_hash) {
				try {
					await applyGoogleToLocal(db, local, google, map);
					result.updatedLocal += 1;
				} catch (error) {
					pushError(result, `update local ${local.id}`, error);
				}
			}
			continue;
		}

		if (isAssigned(google)) continue;

		if (!employeeId) {
			pushError(result, `import ${google.id}`, new Error("担当従業員がいないため Google 側の新規タスクを取り込めません"));
			continue;
		}
		try {
			const localId = await createLocalFromGoogle(env, tasklistId, google, employeeId);
			result.createdLocal += 1;
			const created = await db
				.prepare(
					`SELECT id, employee_id, title, body, status, start_at, end_at, updated_at FROM tasks WHERE id = ?`,
				)
				.bind(localId)
				.first<LocalTaskRow>();
			if (created) localById.set(created.id, created);
		} catch (error) {
			pushError(result, `import ${google.id}`, error);
		}
	}

	const mappingsAfter = await loadMappings(db);
	const mapByTaskIdAfter = new Map(mappingsAfter.map((row) => [row.task_id, row]));
	const localRows = await loadLocalTasks(db);

	for (const local of localRows) {
		const map = mapByTaskIdAfter.get(local.id);
		if (!map) {
			try {
				await pushLocal(token, tasklistId, db, local, null);
				result.createdGoogle += 1;
			} catch (error) {
				pushError(result, `create google ${local.id}`, error);
			}
			continue;
		}

		if (updatedMin && !seenGoogleIds.has(map.google_task_id) && googleById.size > 0) {
			const localHash = hashFromLocal(local);
			if (localHash === map.payload_hash) continue;
		}

		if (!updatedMin && map.google_task_id && !googleById.has(map.google_task_id) && !seenGoogleIds.has(map.google_task_id)) {
			try {
				const created = await pushLocal(token, tasklistId, db, local, null);
				if (created.created) result.createdGoogle += 1;
			} catch (error) {
				pushError(result, `recreate google ${local.id}`, error);
			}
			continue;
		}

		const localHash = hashFromLocal(local);
		if (localHash === map.payload_hash) continue;
		try {
			await pushLocal(token, tasklistId, db, local, map);
			result.updatedGoogle += 1;
		} catch (error) {
			pushError(result, `update google ${local.id}`, error);
		}
	}

	const polledAt = new Date().toISOString();
	if (result.errors.length === 0) {
		await db
			.prepare(
				`UPDATE google_task_sync_state
				 SET last_polled_at = ?, last_updated_min = ?
				 WHERE id = ?`,
			)
			.bind(polledAt, polledAt, STATE_ID)
			.run();
	} else {
		await db
			.prepare(
				`UPDATE google_task_sync_state
				 SET last_polled_at = ?
				 WHERE id = ?`,
			)
			.bind(polledAt, STATE_ID)
			.run();
	}

	return result;
}

export async function pushLocalTaskToGoogle(env: GoogleTasksSyncEnv, taskId: string): Promise<void> {
	if (!(await isGoogleTasksSyncConfigured(env)) || !taskId) return;
	const token = await tasksAccessToken(env);
	const tasklistId = await ensureTasklist(token, env, env.DB);
	const local = await env.DB.prepare(
		`SELECT id, employee_id, title, body, status, start_at, end_at, updated_at
		 FROM tasks WHERE id = ?`,
	)
		.bind(taskId)
		.first<LocalTaskRow>();
	if (!local) return;
	const map = await env.DB.prepare(
		`SELECT task_id, google_tasklist_id, google_task_id, etag, google_updated_at,
		        payload_hash, last_source, synced_at
		 FROM google_task_sync WHERE task_id = ?`,
	)
		.bind(taskId)
		.first<SyncMapRow>();
	if (map && hashFromLocal(local) === map.payload_hash) return;
	await pushLocal(token, tasklistId, env.DB, local, map);
}

export async function deleteGoogleTasksByRefs(
	env: GoogleTasksSyncEnv,
	refs: GoogleTaskRef[],
): Promise<void> {
	if (!(await isGoogleTasksSyncConfigured(env)) || refs.length === 0) return;
	const token = await tasksAccessToken(env);
	for (const ref of refs) {
		if (!ref.google_tasklist_id || !ref.google_task_id) continue;
		await deleteGoogleTask(token, ref.google_tasklist_id, ref.google_task_id);
	}
}

export function queueGoogleTaskPushes(env: GoogleTasksSyncEnv, taskIds: string[]): void {
	void (async () => {
		if (!(await isGoogleTasksSyncConfigured(env)) || taskIds.length === 0) return;
		for (const taskId of taskIds) {
			try {
				await pushLocalTaskToGoogle(env, taskId);
			} catch (error) {
				console.error("google tasks push failed", taskId, error);
			}
		}
	})();
}

export function queueGoogleTaskApiDeletes(env: GoogleTasksSyncEnv, refs: GoogleTaskRef[]): void {
	void (async () => {
		if (!(await isGoogleTasksSyncConfigured(env)) || refs.length === 0) return;
		await deleteGoogleTasksByRefs(env, refs);
	})().catch((error) => {
		console.error("google tasks delete failed", error);
	});
}

export async function listGoogleTaskSyncRefs(
	db: D1Database,
	taskIds: string[],
): Promise<GoogleTaskRef[]> {
	return queryInChunks<GoogleTaskRef>(
		db,
		taskIds,
		(placeholders) =>
			`SELECT google_tasklist_id, google_task_id FROM google_task_sync WHERE task_id IN (${placeholders})`,
	);
}

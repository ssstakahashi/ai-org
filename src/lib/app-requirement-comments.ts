import { queryInChunks } from "@/lib/db-query";
import { newId } from "@/lib/ids";
import {
	APP_REQUIREMENT_COMMENT_STATUS_OPTIONS,
	type AppRequirementComment,
	type AppRequirementCommentStatus,
} from "@/lib/types";

export const APP_REQUIREMENT_COMMENT_SELECT = `SELECT
	c.id, c.requirement_id, c.employee_id, c.author_name, c.source, c.body, c.status,
	c.created_at, c.updated_at,
	e.name AS employee_name, e.color AS employee_color, e.text_color AS employee_text_color
 FROM app_requirement_comments c
 LEFT JOIN employees e ON e.id = c.employee_id`;

export const APP_REQUIREMENT_COMMENT_ORDER = `ORDER BY
	CASE c.status WHEN 'open' THEN 0 ELSE 1 END,
	c.created_at ASC, c.id ASC`;

type AppRequirementCommentRow = {
	id: string;
	requirement_id: string;
	employee_id: string | null;
	author_name: string;
	source: string;
	body: string;
	status: string | null;
	created_at: string;
	updated_at: string;
	employee_name: string | null;
	employee_color: string | null;
	employee_text_color: string | null;
};

export type AppRequirementCommentInsertInput = {
	requirement_id: string;
	employee_id?: string;
	author_name?: string;
	source?: string;
	body: string;
};

export function parseAppRequirementCommentStatus(raw: unknown): AppRequirementCommentStatus {
	const value = String(raw ?? "").trim();
	if ((APP_REQUIREMENT_COMMENT_STATUS_OPTIONS as readonly string[]).includes(value)) {
		return value as AppRequirementCommentStatus;
	}
	throw new Error("コメントのステータスが不正です");
}

function asOptionalString(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

export function appRequirementCommentAuthorLabel(comment: AppRequirementComment): string {
	return (
		comment.employee_name?.trim() ||
		comment.author_name.trim() ||
		comment.source.trim() ||
		"担当"
	);
}

export function withAppRequirementCommentDefaults(
	row: AppRequirementCommentRow,
): AppRequirementComment {
	return {
		id: row.id,
		requirement_id: row.requirement_id,
		employee_id: row.employee_id?.trim() || null,
		author_name: row.author_name ?? "",
		source: row.source ?? "",
		body: row.body ?? "",
		status:
			row.status &&
			(APP_REQUIREMENT_COMMENT_STATUS_OPTIONS as readonly string[]).includes(row.status)
				? (row.status as AppRequirementCommentStatus)
				: "open",
		created_at: row.created_at,
		updated_at: row.updated_at || row.created_at,
		employee_name: row.employee_name ?? null,
		employee_color: row.employee_color ?? null,
		employee_text_color: row.employee_text_color ?? null,
	};
}

export function groupAppRequirementComments(
	comments: AppRequirementComment[],
): Record<string, AppRequirementComment[]> {
	const grouped: Record<string, AppRequirementComment[]> = {};
	for (const comment of comments) {
		const list = grouped[comment.requirement_id] ?? [];
		list.push(comment);
		grouped[comment.requirement_id] = list;
	}
	return grouped;
}

export async function listAppRequirementCommentsFromDb(
	db: D1Database,
	requirementIds?: string[],
): Promise<AppRequirementComment[]> {
	if (requirementIds) {
		if (requirementIds.length === 0) return [];
		const rows = await queryInChunks<AppRequirementCommentRow>(
			db,
			requirementIds,
			(placeholders) =>
				`${APP_REQUIREMENT_COMMENT_SELECT}
				 WHERE c.requirement_id IN (${placeholders})
				 ${APP_REQUIREMENT_COMMENT_ORDER}`,
		);
		return rows.map(withAppRequirementCommentDefaults);
	}

	const { results } = await db
		.prepare(`${APP_REQUIREMENT_COMMENT_SELECT} ${APP_REQUIREMENT_COMMENT_ORDER}`)
		.all<AppRequirementCommentRow>();
	return (results ?? []).map(withAppRequirementCommentDefaults);
}

export async function getAppRequirementCommentFromDb(
	db: D1Database,
	id: string,
): Promise<AppRequirementComment | null> {
	const row = await db
		.prepare(`${APP_REQUIREMENT_COMMENT_SELECT} WHERE c.id = ?`)
		.bind(id)
		.first<AppRequirementCommentRow>();
	return row ? withAppRequirementCommentDefaults(row) : null;
}

export async function insertAppRequirementComment(
	db: D1Database,
	input: AppRequirementCommentInsertInput,
): Promise<AppRequirementComment> {
	const requirementId = input.requirement_id.trim();
	const body = input.body.trim();
	if (!requirementId) {
		throw new Error("requirement not found");
	}
	if (!body) {
		throw new Error("body is required");
	}

	const requirement = await db
		.prepare("SELECT id FROM app_requirements WHERE id = ?")
		.bind(requirementId)
		.first<{ id: string }>();
	if (!requirement) {
		throw new Error("requirement not found");
	}

	let employee: { id: string; name: string } | null = null;
	const employeeId = asOptionalString(input.employee_id);
	if (employeeId) {
		employee =
			(await db
				.prepare("SELECT id, name FROM employees WHERE id = ?")
				.bind(employeeId)
				.first<{ id: string; name: string }>()) ?? null;
		if (!employee) {
			throw new Error("employee not found");
		}
	}

	const id = newId("reqc");
	const authorName = asOptionalString(input.author_name) || employee?.name || "";
	const source = asOptionalString(input.source);
	await db
		.prepare(
			`INSERT INTO app_requirement_comments
				(id, requirement_id, employee_id, author_name, source, body, status)
			 VALUES (?, ?, ?, ?, ?, ?, 'open')`,
		)
		.bind(id, requirement.id, employee?.id ?? null, authorName, source, body)
		.run();

	const saved = await getAppRequirementCommentFromDb(db, id);
	if (!saved) {
		throw new Error("comment save failed");
	}
	return saved;
}

export async function updateAppRequirementCommentStatusInDb(
	db: D1Database,
	id: string,
	status: AppRequirementCommentStatus,
): Promise<void> {
	const existing = await db
		.prepare("SELECT id FROM app_requirement_comments WHERE id = ?")
		.bind(id)
		.first<{ id: string }>();
	if (!existing) {
		throw new Error("comment not found");
	}
	await db
		.prepare(
			`UPDATE app_requirement_comments
			 SET status = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(status, id)
		.run();
}

import {
	X_POST_DESTINATION_DEFAULT,
	X_POST_DESTINATION_OPTIONS,
	X_POST_STATUS_OPTIONS,
	type TaskStatus,
	type XPost,
	type XPostDestination,
} from "@/lib/types";

export const X_POST_SELECT = `SELECT
	id, title, body, image_key, status, scheduled_at, notes, destination,
	x_post_id, last_error, created_at, updated_at
 FROM x_posts`;

export const X_POST_ORDER = `ORDER BY COALESCE(scheduled_at, created_at) DESC`;

export function parseXPostDestination(
	raw: unknown,
	options?: { fallback?: XPostDestination },
): XPostDestination {
	const value = String(raw ?? "").trim();
	if ((X_POST_DESTINATION_OPTIONS as readonly string[]).includes(value)) {
		return value as XPostDestination;
	}
	if (options?.fallback && !value) {
		return options.fallback;
	}
	throw new Error("投稿先が不正です");
}

export function withXPostDestination(post: XPost): XPost {
	return {
		...post,
		destination: parseXPostDestination(post.destination, {
			fallback: X_POST_DESTINATION_DEFAULT,
		}),
	};
}

export function parseXPostStatus(raw: unknown): TaskStatus {
	const value = String(raw ?? "").trim();
	if ((X_POST_STATUS_OPTIONS as readonly string[]).includes(value)) {
		return value as TaskStatus;
	}
	throw new Error("ステータスが不正です");
}

export async function listXPostsFromDb(
	db: D1Database,
	status?: TaskStatus,
	destination?: XPostDestination,
): Promise<XPost[]> {
	const filters: string[] = [];
	const binds: string[] = [];
	if (status) {
		filters.push("status = ?");
		binds.push(status);
	}
	if (destination) {
		filters.push("destination = ?");
		binds.push(destination);
	}
	const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
	const sql = `${X_POST_SELECT} ${where} ${X_POST_ORDER}`;
	const stmt = binds.length > 0 ? db.prepare(sql).bind(...binds) : db.prepare(sql);
	const { results } = await stmt.all<XPost>();
	return (results ?? []).map(withXPostDestination);
}

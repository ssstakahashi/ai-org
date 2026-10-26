import { timingSafeEqual } from "node:crypto";
import { API_ROLES, type ApiRole } from "@/lib/blog-post-rules";

export type ApiActor = {
	name: string;
	role: ApiRole;
};

type StoredKey = ApiActor & { secret: string };

const hits = new Map<string, { window: number; count: number }>();

function safeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function parseKeys(raw: string): StoredKey[] {
	const keys: StoredKey[] = [];
	for (const part of raw.split(",")) {
		const entry = part.trim();
		if (!entry) continue;
		const pieces = entry.split("|");
		const name = pieces[0]?.trim() ?? "";
		const role = pieces[1]?.trim() ?? "";
		const secret = pieces.slice(2).join("|").trim();
		if (!name || !secret || !(API_ROLES as readonly string[]).includes(role)) continue;
		keys.push({ name, role: role as ApiRole, secret });
	}
	return keys;
}

export function configuredApiKeys(): StoredKey[] {
	const raw = process.env.API_KEYS?.trim();
	if (raw) return parseKeys(raw);
	const secret = process.env.AUTOMATION_INGEST_SECRET?.trim();
	if (!secret) return [];
	return [{ name: "automation", role: "admin", secret }];
}

export function authenticateApiKey(header: string | null): ApiActor | null {
	const presented = header?.trim() ?? "";
	if (!presented) return null;
	for (const key of configuredApiKeys()) {
		if (safeEqual(presented, key.secret)) {
			return { name: key.name, role: key.role };
		}
	}
	return null;
}

export function consumeRateLimit(name: string): boolean {
	const now = Math.floor(Date.now() / 60000);
	const current = hits.get(name);
	if (!current || current.window !== now) {
		hits.set(name, { window: now, count: 1 });
		return true;
	}
	if (current.count >= 300) return false;
	current.count += 1;
	return true;
}

export function roleAllowed(role: ApiRole, allowed: readonly ApiRole[]): boolean {
	return allowed.includes(role);
}

export const ROLE_READ: readonly ApiRole[] = API_ROLES;
export const ROLE_REVIEW: readonly ApiRole[] = ["reviewer", "admin"];
export const ROLE_WRITE: readonly ApiRole[] = ["writer", "admin"];
export const ROLE_PUBLISH: readonly ApiRole[] = ["publisher", "admin"];
export const ROLE_ADMIN: readonly ApiRole[] = ["admin"];

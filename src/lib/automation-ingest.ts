import type { AutomationEntry, AutomationRunner, AutomationStatus } from "@/lib/automations";
import { newId } from "@/lib/db";

export const LOCAL_SOURCE = "ai-org";

export type AutomationHealth = "ok" | "degraded" | "unknown";

export type IngestAutomation = {
	id: string;
	name: string;
	runner: AutomationRunner;
	status: AutomationStatus;
	trigger: string;
	summary: string;
	location: string;
	href?: string;
};

export type IngestRun = {
	automationId: string;
	ok: boolean;
	startedAt: string;
	finishedAt: string;
	error?: string | null;
	meta?: Record<string, unknown>;
};

export type IngestBody = {
	source: string;
	automations?: IngestAutomation[];
	run?: IngestRun;
};

export type AutomationRunSummary = {
	lastSuccessAt: string | null;
	lastFailureAt: string | null;
	lastError: string | null;
	lastRunAt: string | null;
	lastOk: boolean | null;
	health: AutomationHealth;
};

export type CatalogRow = AutomationEntry & {
	source: string;
	run: AutomationRunSummary;
};

const RUNNERS = new Set(["program", "cursor", "manual"]);
const STATUSES = new Set(["active", "none", "manual"]);

export function verifyIngestSecret(
	headerSecret: string | null,
	authHeader: string | null,
	expected: string | undefined,
): "ok" | "missing_config" | "unauthorized" {
	const secret = expected?.trim();
	if (!secret) return "missing_config";
	const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
	const token = bearer || headerSecret?.trim() || null;
	if (!token || token !== secret) return "unauthorized";
	return "ok";
}

export function parseIngestBody(raw: unknown): { ok: true; body: IngestBody } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "JSON object required" };
	}
	const obj = raw as Record<string, unknown>;
	const source = typeof obj.source === "string" ? obj.source.trim() : "";
	if (!source) {
		return { ok: false, error: "source is required" };
	}
	if (source === LOCAL_SOURCE) {
		return { ok: false, error: "source 'ai-org' is reserved" };
	}

	let automations: IngestAutomation[] | undefined;
	if (obj.automations !== undefined) {
		if (!Array.isArray(obj.automations)) {
			return { ok: false, error: "automations must be an array" };
		}
		automations = [];
		for (const item of obj.automations) {
			const parsed = parseAutomation(item);
			if (!parsed.ok) return parsed;
			automations.push(parsed.value);
		}
	}

	let run: IngestRun | undefined;
	if (obj.run !== undefined) {
		const parsed = parseRun(obj.run);
		if (!parsed.ok) return parsed;
		run = parsed.value;
	}

	if (!automations?.length && !run) {
		return { ok: false, error: "automations or run is required" };
	}

	return { ok: true, body: { source, automations, run } };
}

function parseAutomation(
	raw: unknown,
): { ok: true; value: IngestAutomation } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "automation must be an object" };
	}
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === "string" ? o.id.trim() : "";
	const name = typeof o.name === "string" ? o.name.trim() : "";
	const runner = typeof o.runner === "string" ? o.runner.trim() : "";
	const status = typeof o.status === "string" ? o.status.trim() : "";
	const trigger = typeof o.trigger === "string" ? o.trigger.trim() : "";
	const summary = typeof o.summary === "string" ? o.summary.trim() : "";
	const location = typeof o.location === "string" ? o.location.trim() : "";
	const href = typeof o.href === "string" ? o.href.trim() : undefined;
	if (!id || !name || !trigger || !summary || !location) {
		return { ok: false, error: "automation fields incomplete" };
	}
	if (!RUNNERS.has(runner)) {
		return { ok: false, error: `invalid runner: ${runner}` };
	}
	if (!STATUSES.has(status)) {
		return { ok: false, error: `invalid status: ${status}` };
	}
	return {
		ok: true,
		value: {
			id,
			name,
			runner: runner as AutomationRunner,
			status: status as AutomationStatus,
			trigger,
			summary,
			location,
			href: href || undefined,
		},
	};
}

function parseRun(raw: unknown): { ok: true; value: IngestRun } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "run must be an object" };
	}
	const o = raw as Record<string, unknown>;
	const automationId = typeof o.automationId === "string" ? o.automationId.trim() : "";
	const startedAt = typeof o.startedAt === "string" ? o.startedAt.trim() : "";
	const finishedAt = typeof o.finishedAt === "string" ? o.finishedAt.trim() : "";
	if (!automationId || !startedAt || !finishedAt) {
		return { ok: false, error: "run fields incomplete" };
	}
	if (typeof o.ok !== "boolean") {
		return { ok: false, error: "run.ok must be boolean" };
	}
	const error =
		o.error === null || o.error === undefined
			? null
			: typeof o.error === "string"
				? o.error
				: String(o.error);
	const meta =
		o.meta && typeof o.meta === "object" && !Array.isArray(o.meta)
			? (o.meta as Record<string, unknown>)
			: undefined;
	return {
		ok: true,
		value: { automationId, ok: o.ok, startedAt, finishedAt, error, meta },
	};
}

export async function applyIngest(db: D1Database, body: IngestBody) {
	if (body.automations?.length) {
		for (const a of body.automations) {
			await db
				.prepare(
					`INSERT INTO remote_automations
					 (source, id, name, runner, status, trigger_text, summary, location, href, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
					 ON CONFLICT(source, id) DO UPDATE SET
					   name = excluded.name,
					   runner = excluded.runner,
					   status = excluded.status,
					   trigger_text = excluded.trigger_text,
					   summary = excluded.summary,
					   location = excluded.location,
					   href = excluded.href,
					   updated_at = datetime('now')`,
				)
				.bind(
					body.source,
					a.id,
					a.name,
					a.runner,
					a.status,
					a.trigger,
					a.summary,
					a.location,
					a.href ?? null,
				)
				.run();
		}
	}

	if (body.run) {
		await recordAutomationRun(db, {
			source: body.source,
			automationId: body.run.automationId,
			ok: body.run.ok,
			startedAt: body.run.startedAt,
			finishedAt: body.run.finishedAt,
			error: body.run.error ?? null,
			meta: body.run.meta,
		});
	}
}

export async function recordAutomationRun(
	db: D1Database,
	input: {
		source: string;
		automationId: string;
		ok: boolean;
		startedAt: string;
		finishedAt: string;
		error?: string | null;
		meta?: Record<string, unknown>;
	},
) {
	await db
		.prepare(
			`INSERT INTO automation_runs
			 (id, source, automation_id, ok, started_at, finished_at, error, meta_json, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		)
		.bind(
			newId("arun"),
			input.source,
			input.automationId,
			input.ok ? 1 : 0,
			input.startedAt,
			input.finishedAt,
			input.error ? input.error.slice(0, 2000) : null,
			input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
		)
		.run();
}

function emptyRunSummary(): AutomationRunSummary {
	return {
		lastSuccessAt: null,
		lastFailureAt: null,
		lastError: null,
		lastRunAt: null,
		lastOk: null,
		health: "unknown",
	};
}

function healthFrom(summary: Omit<AutomationRunSummary, "health">): AutomationHealth {
	if (!summary.lastRunAt) return "unknown";
	if (summary.lastOk === true) return "ok";
	if (summary.lastOk === false) return "degraded";
	return "unknown";
}

export async function loadRunSummaries(
	db: D1Database,
	pairs: { source: string; automationId: string }[],
): Promise<Map<string, AutomationRunSummary>> {
	const map = new Map<string, AutomationRunSummary>();
	for (const { source, automationId } of pairs) {
		const key = `${source}:${automationId}`;
		const latest = await db
			.prepare(
				`SELECT ok, finished_at, error
				 FROM automation_runs
				 WHERE source = ? AND automation_id = ?
				 ORDER BY finished_at DESC
				 LIMIT 1`,
			)
			.bind(source, automationId)
			.first<{ ok: number; finished_at: string; error: string | null }>();

		const lastSuccess = await db
			.prepare(
				`SELECT finished_at
				 FROM automation_runs
				 WHERE source = ? AND automation_id = ? AND ok = 1
				 ORDER BY finished_at DESC
				 LIMIT 1`,
			)
			.bind(source, automationId)
			.first<{ finished_at: string }>();

		const lastFailure = await db
			.prepare(
				`SELECT finished_at, error
				 FROM automation_runs
				 WHERE source = ? AND automation_id = ? AND ok = 0
				 ORDER BY finished_at DESC
				 LIMIT 1`,
			)
			.bind(source, automationId)
			.first<{ finished_at: string; error: string | null }>();

		const base = {
			lastSuccessAt: lastSuccess?.finished_at ?? null,
			lastFailureAt: lastFailure?.finished_at ?? null,
			lastError: lastFailure?.error ?? null,
			lastRunAt: latest?.finished_at ?? null,
			lastOk: latest ? latest.ok === 1 : null,
		};
		map.set(key, { ...base, health: healthFrom(base) });
	}
	return map;
}

export async function listRemoteAutomations(
	db: D1Database,
): Promise<(AutomationEntry & { source: string })[]> {
	const { results } = await db
		.prepare(
			`SELECT source, id, name, runner, status, trigger_text, summary, location, href
			 FROM remote_automations
			 ORDER BY source ASC, name ASC`,
		)
		.all<{
			source: string;
			id: string;
			name: string;
			runner: AutomationRunner;
			status: AutomationStatus;
			trigger_text: string;
			summary: string;
			location: string;
			href: string | null;
		}>();

	return (results ?? []).map((row) => ({
		source: row.source,
		id: row.id,
		name: row.name,
		runner: row.runner,
		status: row.status,
		trigger: row.trigger_text,
		summary: row.summary,
		location: row.location,
		href: row.href ?? undefined,
	}));
}

export async function buildCatalog(
	db: D1Database,
	local: (AutomationEntry & { source: string })[],
): Promise<CatalogRow[]> {
	const remote = await listRemoteAutomations(db);
	const merged = [...local, ...remote];
	const summaries = await loadRunSummaries(
		db,
		merged.map((e) => ({ source: e.source, automationId: e.id })),
	);
	return merged.map((entry) => ({
		...entry,
		run: summaries.get(`${entry.source}:${entry.id}`) ?? emptyRunSummary(),
	}));
}

import type { AutomationEntry, AutomationRunner, AutomationStatus } from "@/lib/automations";
import { applyIngest, type IngestAutomation } from "@/lib/automation-ingest";
import { newId } from "@/lib/db";

export const SPARK_SOURCE = "spark";
export const SPARK_DEFAULT_LOCATION = "Google Spark";
export const SPARK_DEFAULT_TRIGGER = "Google Spark";
export const SPARK_DEFAULT_RUNNER: AutomationRunner = "program";

const STATUSES = new Set<AutomationStatus>(["active", "none", "manual"]);

export type SparkAutomation = AutomationEntry & { source: typeof SPARK_SOURCE };

function asString(raw: unknown): string {
	return typeof raw === "string" ? raw.trim() : "";
}

function parseStatus(raw: unknown, fallback: AutomationStatus): AutomationStatus {
	const value = asString(raw);
	if (STATUSES.has(value as AutomationStatus)) return value as AutomationStatus;
	return fallback;
}

export function slugifySparkId(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

function withSparkDefaults(input: {
	id?: string;
	name: string;
	trigger?: string;
	summary: string;
	location?: string;
	href?: string;
	status?: AutomationStatus;
}): IngestAutomation {
	return {
		id: input.id?.trim() || slugifySparkId(input.name) || newId("spark"),
		name: input.name.trim(),
		runner: SPARK_DEFAULT_RUNNER,
		status: input.status ?? "none",
		trigger: input.trigger?.trim() || SPARK_DEFAULT_TRIGGER,
		summary: input.summary.trim(),
		location: input.location?.trim() || SPARK_DEFAULT_LOCATION,
		href: input.href?.trim() || undefined,
	};
}

export function parseSparkAutomation(
	raw: unknown,
	options?: { requireSummary?: boolean; defaultStatus?: AutomationStatus },
): { ok: true; value: IngestAutomation } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "automation must be an object" };
	}
	const o = raw as Record<string, unknown>;
	const name = asString(o.name);
	const summary = asString(o.summary);
	if (!name) return { ok: false, error: "name is required" };
	if (options?.requireSummary && !summary) {
		return { ok: false, error: "summary is required" };
	}

	const idRaw = asString(o.id);
	return {
		ok: true,
		value: withSparkDefaults({
			id: idRaw || undefined,
			name,
			trigger: asString(o.trigger) || undefined,
			summary,
			location: asString(o.location) || undefined,
			href: asString(o.href) || undefined,
			status: parseStatus(o.status, options?.defaultStatus ?? "none"),
		}),
	};
}

export function parseSparkIngestBody(
	raw: unknown,
): { ok: true; automations: IngestAutomation[] } | { ok: false; error: string } {
	if (!raw || typeof raw !== "object") {
		return { ok: false, error: "JSON object required" };
	}
	const obj = raw as Record<string, unknown>;
	const items = Array.isArray(obj.automations)
		? obj.automations
		: Array.isArray(raw)
			? (raw as unknown[])
			: [obj];

	if (items.length === 0) {
		return { ok: false, error: "automations is required" };
	}

	const automations: IngestAutomation[] = [];
	for (const item of items) {
		const parsed = parseSparkAutomation(item, {
			requireSummary: true,
			defaultStatus: "active",
		});
		if (!parsed.ok) return parsed;
		automations.push(parsed.value);
	}
	return { ok: true, automations };
}

export async function listSparkAutomations(db: D1Database): Promise<SparkAutomation[]> {
	const { results } = await db
		.prepare(
			`SELECT source, id, name, runner, status, trigger_text, summary, location, href
			 FROM remote_automations
			 WHERE source = ?
			 ORDER BY name ASC`,
		)
		.bind(SPARK_SOURCE)
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
		source: SPARK_SOURCE,
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

async function allocateSparkId(db: D1Database, desired: string): Promise<string> {
	const base = slugifySparkId(desired) || newId("spark");
	for (let attempt = 0; attempt < 20; attempt++) {
		const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
		const existing = await db
			.prepare("SELECT id FROM remote_automations WHERE source = ? AND id = ?")
			.bind(SPARK_SOURCE, candidate)
			.first();
		if (!existing) return candidate;
	}
	return newId("spark");
}

export async function upsertSparkAutomation(
	db: D1Database,
	input: IngestAutomation,
	options?: { allocateId?: boolean },
): Promise<IngestAutomation> {
	const id = options?.allocateId ? await allocateSparkId(db, input.id) : input.id;
	const automation = { ...input, id };
	await applyIngest(db, { source: SPARK_SOURCE, automations: [automation] });
	return automation;
}

export async function deleteSparkAutomation(db: D1Database, id: string) {
	const trimmed = id.trim();
	if (!trimmed) return;
	await db
		.prepare("DELETE FROM remote_automations WHERE source = ? AND id = ?")
		.bind(SPARK_SOURCE, trimmed)
		.run();
}

export async function replaceSparkAutomations(
	db: D1Database,
	automations: IngestAutomation[],
) {
	const existing = await listSparkAutomations(db);
	const incomingIds = new Set(automations.map((item) => item.id));
	for (const automation of automations) {
		await upsertSparkAutomation(db, automation);
	}
	for (const previous of existing) {
		if (!incomingIds.has(previous.id)) {
			await deleteSparkAutomation(db, previous.id);
		}
	}
}

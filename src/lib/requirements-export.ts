import type { AppRequirementStatus } from "@/lib/types";

export type RequirementExportContext = {
	app_name_id: string;
	app_name: string;
	dev_folder: string;
	dev_policy: string;
	frontend: string;
	css: string;
	backend: string;
	db: string;
	storage: string;
	port: string;
	auth: string;
	hosting: string;
	staging_url: string;
	production_url: string;
};

export type RequirementExportItem = {
	id: string;
	app_name_id: string;
	app_name: string;
	title: string;
	body: string;
	status: AppRequirementStatus;
	sort_order: number;
};

type AppRow = {
	app_name_id: string | null;
	dev_folder: string;
	dev_policy: string;
	frontend: string;
	css: string;
	backend: string;
	db: string;
	storage: string;
	port: string;
	auth: string;
	hosting: string;
	staging_url: string;
	production_url: string;
	sort_order: number;
};

function pickAppContext(rows: AppRow[]): Omit<RequirementExportContext, "app_name_id" | "app_name"> {
	if (rows.length === 0) {
		return {
			dev_folder: "",
			dev_policy: "",
			frontend: "",
			css: "",
			backend: "",
			db: "",
			storage: "",
			port: "",
			auth: "",
			hosting: "",
			staging_url: "",
			production_url: "",
		};
	}

	const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
	const withFolder = sorted.find((row) => row.dev_folder.trim());
	const row = withFolder ?? sorted[0];
	return {
		dev_folder: row.dev_folder.trim(),
		dev_policy: row.dev_policy.trim(),
		frontend: row.frontend.trim(),
		css: row.css.trim(),
		backend: row.backend.trim(),
		db: row.db.trim(),
		storage: row.storage.trim(),
		port: row.port.trim(),
		auth: row.auth.trim(),
		hosting: row.hosting.trim(),
		staging_url: row.staging_url.trim(),
		production_url: row.production_url.trim(),
	};
}

export async function loadAppExportContexts(
	db: D1Database,
	appNameIds: string[],
): Promise<Map<string, RequirementExportContext>> {
	const map = new Map<string, RequirementExportContext>();
	if (appNameIds.length === 0) return map;

	const placeholders = appNameIds.map(() => "?").join(", ");
	const { results } = await db
		.prepare(
			`SELECT app_name_id, dev_folder, dev_policy,
			        frontend, css, backend, db, storage, port, auth, hosting,
			        staging_url, production_url, sort_order
			 FROM apps
			 WHERE app_name_id IN (${placeholders})
			 ORDER BY sort_order ASC`,
		)
		.bind(...appNameIds)
		.all<AppRow>();

	const byApp = new Map<string, AppRow[]>();
	for (const row of results ?? []) {
		if (!row.app_name_id) continue;
		const list = byApp.get(row.app_name_id) ?? [];
		list.push(row);
		byApp.set(row.app_name_id, list);
	}

	for (const appNameId of appNameIds) {
		const context = pickAppContext(byApp.get(appNameId) ?? []);
		map.set(appNameId, {
			app_name_id: appNameId,
			app_name: "",
			...context,
		});
	}

	return map;
}

export async function listRequirementsForExport(
	db: D1Database,
	options: {
		appNameId?: string;
		appName?: string;
		all?: boolean;
		status?: AppRequirementStatus;
	},
): Promise<RequirementExportItem[]> {
	const status = options.status ?? "approved";
	let sql = `SELECT r.id, r.app_name_id, n.name AS app_name,
	                  r.title, r.body, r.status, r.sort_order
	           FROM app_requirements r
	           JOIN app_names n ON n.id = r.app_name_id
	           WHERE r.status = ?`;
	const binds: string[] = [status];

	if (options.appNameId) {
		sql += " AND r.app_name_id = ?";
		binds.push(options.appNameId);
	} else if (options.appName && !options.all) {
		sql += " AND lower(n.name) = lower(?)";
		binds.push(options.appName);
	}

	sql += " ORDER BY n.sort_order ASC, n.name ASC, r.sort_order ASC, r.title ASC";

	const { results } = await db
		.prepare(sql)
		.bind(...binds)
		.all<RequirementExportItem>();
	return results ?? [];
}

function stackLine(label: string, value: string): string | null {
	return value ? `- ${label}: ${value}` : null;
}

export function formatRequirementsMarkdown(
	items: RequirementExportItem[],
	contexts: Map<string, RequirementExportContext>,
): string {
	if (items.length === 0) {
		return "# App 要件定義\n\n（該当する要件はありません）\n";
	}

	const byApp = new Map<string, RequirementExportItem[]>();
	for (const item of items) {
		const list = byApp.get(item.app_name_id) ?? [];
		list.push(item);
		byApp.set(item.app_name_id, list);
	}

	const sections: string[] = ["# App 要件定義 export", ""];

	for (const [appNameId, appItems] of byApp) {
		const context = contexts.get(appNameId);
		const appName = appItems[0]?.app_name ?? context?.app_name ?? appNameId;
		sections.push(`# App: ${appName}`);
		if (context) {
			const meta = [
				stackLine("dev_folder", context.dev_folder),
				stackLine("dev_policy", context.dev_policy),
				stackLine("frontend", context.frontend),
				stackLine("css", context.css),
				stackLine("backend", context.backend),
				stackLine("db", context.db),
				stackLine("storage", context.storage),
				stackLine("port", context.port),
				stackLine("auth", context.auth),
				stackLine("hosting", context.hosting),
				stackLine("staging_url", context.staging_url),
				stackLine("production_url", context.production_url),
			].filter((line): line is string => line !== null);
			if (meta.length > 0) {
				sections.push("", ...meta);
			}
		}
		sections.push("");

		for (const item of appItems) {
			sections.push(
				`## 要件: ${item.title} [${item.id}] (${item.status})`,
				"",
				item.body || "（本文なし）",
				"",
			);
		}
	}

	return `${sections.join("\n").trim()}\n`;
}

export async function buildRequirementsExport(
	db: D1Database,
	options: {
		appNameId?: string;
		appName?: string;
		all?: boolean;
		status?: AppRequirementStatus;
	},
): Promise<string> {
	const items = await listRequirementsForExport(db, options);
	const appNameIds = [...new Set(items.map((item) => item.app_name_id))];
	const contexts = await loadAppExportContexts(db, appNameIds);
	for (const item of items) {
		const context = contexts.get(item.app_name_id);
		if (context) {
			context.app_name = item.app_name;
		}
	}
	return formatRequirementsMarkdown(items, contexts);
}

export async function resolveAppNameIdByName(
	db: D1Database,
	appName: string,
): Promise<string | null> {
	const row = await db
		.prepare("SELECT id FROM app_names WHERE lower(name) = lower(?) LIMIT 1")
		.bind(appName)
		.first<{ id: string }>();
	return row?.id ?? null;
}

export function parseExportStatus(raw: string | null): AppRequirementStatus | null {
	const value = raw?.trim();
	if (!value) return null;
	if (
		value === "draft" ||
		value === "approved" ||
		value === "in_progress" ||
		value === "done" ||
		value === "cancelled"
	) {
		return value;
	}
	return null;
}

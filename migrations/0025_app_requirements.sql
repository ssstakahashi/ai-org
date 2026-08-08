-- App ごとの要件定義（App管理）

CREATE TABLE IF NOT EXISTS app_requirements (
	id TEXT PRIMARY KEY,
	app_name_id TEXT NOT NULL REFERENCES app_names(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'in_progress', 'done', 'cancelled')),
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_requirements_app ON app_requirements(app_name_id, sort_order);

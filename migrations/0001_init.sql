-- AI組織の従業員（エージェント）とタスク台帳

CREATE TABLE IF NOT EXISTS employees (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
	id TEXT PRIMARY KEY,
	employee_id TEXT NOT NULL REFERENCES employees(id),
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	image_key TEXT,
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'scheduled', 'done', 'failed')),
	scheduled_at TEXT,
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON tasks(scheduled_at);

INSERT OR IGNORE INTO employees (id, name, role) VALUES
	('emp-x-poster', 'X投稿担当', 'x_poster'),
	('emp-researcher', 'リサーチ担当', 'researcher'),
	('emp-ops', '運用担当', 'ops');

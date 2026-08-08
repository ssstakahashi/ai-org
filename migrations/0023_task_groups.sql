-- タスクをまとめるグループ（マスタ）

CREATE TABLE IF NOT EXISTS task_groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	color TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE tasks ADD COLUMN task_group_id TEXT
	REFERENCES task_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_group ON tasks(task_group_id);

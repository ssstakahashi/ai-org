-- タスクに紐づく参考リンク（複数可）

CREATE TABLE IF NOT EXISTS task_links (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	url TEXT NOT NULL,
	label TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_links_task ON task_links(task_id);

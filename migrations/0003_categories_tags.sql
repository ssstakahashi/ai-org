-- タスクのカテゴリ（マスタ）とタグ

CREATE TABLE IF NOT EXISTS categories (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_tags (
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

ALTER TABLE tasks ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);

INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES
	('cat-x-post', 'X投稿', 10),
	('cat-research', 'リサーチ', 20),
	('cat-ops', '運用', 30),
	('cat-planning', '企画', 40),
	('cat-other', 'その他', 50);

INSERT OR IGNORE INTO tags (id, name) VALUES
	('tag-urgent', '緊急'),
	('tag-recurring', '定期'),
	('tag-review', 'レビュー');

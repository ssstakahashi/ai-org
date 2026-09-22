-- ネタの正本。スプレッドシート連携は使わない。

CREATE TABLE IF NOT EXISTS blog_ideas (
	id TEXT PRIMARY KEY,
	topic TEXT NOT NULL,
	no TEXT NOT NULL DEFAULT '',
	title TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT '',
	summary TEXT NOT NULL DEFAULT '',
	badge TEXT NOT NULL DEFAULT '',
	details TEXT NOT NULL DEFAULT '[]',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_ideas_topic ON blog_ideas(topic);

CREATE TABLE IF NOT EXISTS blog_idea_uses (
	id TEXT PRIMARY KEY,
	idea_id TEXT NOT NULL REFERENCES blog_ideas(id) ON DELETE CASCADE,
	medium TEXT NOT NULL CHECK (medium IN ('blog', 'x')),
	destination TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (idea_id, medium, destination)
);

CREATE INDEX IF NOT EXISTS idx_blog_idea_uses_idea ON blog_idea_uses(idea_id);

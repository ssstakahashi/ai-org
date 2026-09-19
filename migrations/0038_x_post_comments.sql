-- X投稿への AI コメント（1記事に複数AI・複数件、未対応 / 対応済）

CREATE TABLE IF NOT EXISTS x_post_comments (
	id TEXT PRIMARY KEY,
	x_post_id TEXT NOT NULL REFERENCES x_posts(id) ON DELETE CASCADE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_x_post_comments_post ON x_post_comments(x_post_id);
CREATE INDEX IF NOT EXISTS idx_x_post_comments_created ON x_post_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_x_post_comments_status ON x_post_comments(x_post_id, status);

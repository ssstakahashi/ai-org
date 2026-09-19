-- 未公開ブログ下書きへの AI コメント（1記事に複数AI・複数件）

CREATE TABLE IF NOT EXISTS blog_post_comments (
	id TEXT PRIMARY KEY,
	blog_post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_post_comments_post ON blog_post_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_comments_created ON blog_post_comments(created_at);

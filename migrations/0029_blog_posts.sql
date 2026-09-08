-- AI が作成した公式ブログ下書きの確認・承認台帳

CREATE TABLE IF NOT EXISTS blog_posts (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	excerpt TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '',
	category TEXT NOT NULL DEFAULT '',
	tags TEXT NOT NULL DEFAULT '',
	thumbnail_url TEXT NOT NULL DEFAULT '',
	published_on TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
	notes TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_updated ON blog_posts(updated_at);

INSERT OR IGNORE INTO pages (id, title, path, body, category_id, sort_order) VALUES
	('page-blog-drafts', 'ブログ下書き', '/blog-drafts', 'AIが作成した公式ブログ下書きを確認し、承認します。', NULL, 25);

INSERT OR IGNORE INTO page_tags (page_id, tag_id)
SELECT 'page-blog-drafts', id FROM tags WHERE id = 'tag-review';

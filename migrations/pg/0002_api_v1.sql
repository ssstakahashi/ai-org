-- /api/v1 の状態・履歴・通知。既存行の id は変えない。

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS body_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS thumbnail_origin TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS external_check_date TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS external_check_result TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS rewrite_mark TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_at TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_url TEXT NOT NULL DEFAULT '';

ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS target_body_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS verdict TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS quote TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS suggestion TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS resolved_by TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_post_comments ADD COLUMN IF NOT EXISTS decision_status TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS blog_post_audit (
	id TEXT PRIMARY KEY,
	blog_post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	request_id TEXT NOT NULL DEFAULT '',
	actor TEXT NOT NULL DEFAULT '',
	action TEXT NOT NULL DEFAULT '',
	before_json TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE INDEX IF NOT EXISTS idx_blog_post_audit_post
	ON blog_post_audit (blog_post_id, created_at);

CREATE TABLE IF NOT EXISTS blog_post_release_checks (
	id TEXT PRIMARY KEY,
	blog_post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	checked_at TEXT NOT NULL DEFAULT (app_now()),
	thumbnail_ok INTEGER NOT NULL DEFAULT 0 CHECK (thumbnail_ok IN (0, 1)),
	ogp_ok INTEGER NOT NULL DEFAULT 0 CHECK (ogp_ok IN (0, 1)),
	category_ok INTEGER NOT NULL DEFAULT 0 CHECK (category_ok IN (0, 1)),
	detail_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS blog_site_categories (
	name TEXT PRIMARY KEY,
	created_at TEXT NOT NULL DEFAULT (app_now())
);

INSERT INTO blog_site_categories (name)
SELECT DISTINCT btrim(category)
FROM blog_posts
WHERE btrim(category) <> ''
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS ops_alerts (
	id TEXT PRIMARY KEY,
	kind TEXT NOT NULL,
	message TEXT NOT NULL,
	detail_json TEXT NOT NULL DEFAULT '{}',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_alerts_unread
	ON ops_alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS board_links (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	url TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

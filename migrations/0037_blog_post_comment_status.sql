-- ブログ下書きコメントの対応状況（未対応 / 対応済）

ALTER TABLE blog_post_comments ADD COLUMN status TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_blog_post_comments_status ON blog_post_comments(blog_post_id, status);

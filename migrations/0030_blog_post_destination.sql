-- ブログ下書きの投稿先（スタジオフーズHP / 農業日誌アプリLP）

ALTER TABLE blog_posts ADD COLUMN destination TEXT NOT NULL DEFAULT 'studiofoods_hp';

CREATE INDEX IF NOT EXISTS idx_blog_posts_destination ON blog_posts(destination);

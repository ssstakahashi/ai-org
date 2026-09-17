-- ブログ下書きの TOP 画像と図表・グラフ（R2 キー）

ALTER TABLE blog_posts ADD COLUMN thumbnail_key TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN figure_keys TEXT NOT NULL DEFAULT '[]';

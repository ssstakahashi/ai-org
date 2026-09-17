-- X投稿の投稿先アカウント（スタジオフーズ / Agri）。増やすときはアプリ側の OPTIONS も追加する

ALTER TABLE x_posts ADD COLUMN destination TEXT NOT NULL DEFAULT 'studiofoods';

CREATE INDEX IF NOT EXISTS idx_x_posts_destination ON x_posts(destination);

UPDATE x_posts
SET destination = 'agri'
WHERE notes LIKE '%Agri_Twitter%';

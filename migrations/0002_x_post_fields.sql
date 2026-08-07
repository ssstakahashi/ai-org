-- X投稿結果の記録

ALTER TABLE tasks ADD COLUMN x_post_id TEXT;
ALTER TABLE tasks ADD COLUMN last_error TEXT NOT NULL DEFAULT '';

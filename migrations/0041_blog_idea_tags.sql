-- ネタに、タスク・ページと同じタグマスタを付ける

CREATE TABLE IF NOT EXISTS blog_idea_tags (
	idea_id TEXT NOT NULL REFERENCES blog_ideas(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_idea_tags_tag ON blog_idea_tags(tag_id);

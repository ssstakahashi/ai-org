-- App 要件定義とタグ（複数）
CREATE TABLE IF NOT EXISTS app_requirement_tags (
	requirement_id TEXT NOT NULL REFERENCES app_requirements(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (requirement_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_app_requirement_tags_tag ON app_requirement_tags(tag_id);
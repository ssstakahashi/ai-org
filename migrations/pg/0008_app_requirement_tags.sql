CREATE TABLE app_requirement_tags (
	requirement_id TEXT NOT NULL REFERENCES app_requirements(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	PRIMARY KEY (requirement_id, tag_id)
);

CREATE INDEX idx_app_requirement_tags_tag ON app_requirement_tags(tag_id);
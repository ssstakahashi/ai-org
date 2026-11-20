CREATE TABLE app_requirement_comments (
	id TEXT PRIMARY KEY,
	requirement_id TEXT NOT NULL REFERENCES app_requirements(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE INDEX idx_app_requirement_comments_requirement ON app_requirement_comments(requirement_id);
CREATE INDEX idx_app_requirement_comments_created ON app_requirement_comments(created_at);
CREATE INDEX idx_app_requirement_comments_status ON app_requirement_comments(requirement_id, status);

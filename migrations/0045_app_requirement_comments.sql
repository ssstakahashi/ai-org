-- App 要件へのコメント（1要件に複数。未対応 / 対応済）
-- 要件削除時はブログ / X コメントと同様に CASCADE で消す。

CREATE TABLE IF NOT EXISTS app_requirement_comments (
	id TEXT PRIMARY KEY,
	requirement_id TEXT NOT NULL REFERENCES app_requirements(id) ON DELETE CASCADE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_requirement_comments_requirement ON app_requirement_comments(requirement_id);
CREATE INDEX IF NOT EXISTS idx_app_requirement_comments_created ON app_requirement_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_app_requirement_comments_status ON app_requirement_comments(requirement_id, status);

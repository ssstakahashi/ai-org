-- ページ台帳（カテゴリ・タグマスタで分類）

CREATE TABLE IF NOT EXISTS pages (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	path TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '',
	category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category_id);
CREATE INDEX IF NOT EXISTS idx_pages_sort ON pages(sort_order);

CREATE TABLE IF NOT EXISTS page_tags (
	page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (page_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_page_tags_tag ON page_tags(tag_id);

INSERT OR IGNORE INTO pages (id, title, path, body, category_id, sort_order) VALUES
	('page-home', '業務台帳', '/', 'AI従業員の業務タスクを管理します。', 'cat-ops', 10),
	('page-x-schedule', 'X投稿スケジュール', '/x-schedule', '投稿文・画像・予約日時を管理します。', 'cat-x-post', 20),
	('page-automations', '自動化一覧', '/automations', 'Cron や手動トリガーの自動化を一覧します。', 'cat-ops', 30),
	('page-apps', 'App管理', '/apps', 'アプリのデプロイ先とマスタを管理します。', 'cat-ops', 40),
	('page-employees', '従業員', '/employees', 'AI従業員マスタを管理します。', 'cat-ops', 50),
	('page-org-rules', '組織ルール', '/org-rules', '組織ルールと職務権限表を管理します。', 'cat-planning', 60);

INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES
	('page-home', 'tag-recurring'),
	('page-x-schedule', 'tag-recurring'),
	('page-automations', 'tag-review'),
	('page-apps', 'tag-review'),
	('page-employees', 'tag-review'),
	('page-org-rules', 'tag-review');

-- ai-org PostgreSQL 14 schema
-- 正本。SQLite の migrations/*.sql（0001〜0041）は履歴であり、ここでは適用しない。
-- 日時は TEXT のまま。datetime('now') は app_now()（UTC、YYYY-MM-DD HH:MM:SS）。
-- 外部キーは DEFERRABLE。取り込みスクリプトが SET CONSTRAINTS ALL DEFERRED できる。

CREATE OR REPLACE FUNCTION app_now() RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT to_char((clock_timestamp() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS');
$$;

CREATE TABLE app_crons (
	id TEXT PRIMARY KEY,
	sort_order INTEGER NOT NULL DEFAULT 0,
	environment TEXT NOT NULL DEFAULT '',
	schedule TEXT NOT NULL DEFAULT '',
	kind TEXT NOT NULL DEFAULT '',
	target TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE app_groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, color TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '', text_color TEXT NOT NULL DEFAULT '');

CREATE TABLE app_types (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, color TEXT NOT NULL DEFAULT '', text_color TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '');

CREATE TABLE automation_runs (
	id TEXT PRIMARY KEY,
	source TEXT NOT NULL,
	automation_id TEXT NOT NULL,
	ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
	started_at TEXT NOT NULL,
	finished_at TEXT NOT NULL,
	error TEXT,
	meta_json TEXT,
	created_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE blog_ideas (
	id TEXT PRIMARY KEY,
	topic TEXT NOT NULL,
	no TEXT NOT NULL DEFAULT '',
	title TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT '',
	summary TEXT NOT NULL DEFAULT '',
	badge TEXT NOT NULL DEFAULT '',
	details TEXT NOT NULL DEFAULT '[]',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE blog_posts (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	excerpt TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '',
	category TEXT NOT NULL DEFAULT '',
	tags TEXT NOT NULL DEFAULT '',
	thumbnail_url TEXT NOT NULL DEFAULT '',
	published_on TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
	notes TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, destination TEXT NOT NULL DEFAULT 'studiofoods_hp', thumbnail_key TEXT NOT NULL DEFAULT '', figure_keys TEXT NOT NULL DEFAULT '[]');

CREATE TABLE categories (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, color TEXT NOT NULL DEFAULT '');

CREATE TABLE employees (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (app_now())
, sort_order INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', authority TEXT NOT NULL DEFAULT '', text_color TEXT NOT NULL DEFAULT '');

CREATE TABLE google_task_sync_state (
	id TEXT PRIMARY KEY CHECK (id = 'default'),
	tasklist_id TEXT,
	last_polled_at TEXT,
	last_updated_min TEXT
, oauth_refresh_token TEXT);

CREATE TABLE org_rules (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE remote_automations (
	source TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	runner TEXT NOT NULL CHECK (runner IN ('program', 'cursor', 'manual')),
	status TEXT NOT NULL CHECK (status IN ('active', 'none', 'manual')),
	trigger_text TEXT NOT NULL,
	summary TEXT NOT NULL,
	location TEXT NOT NULL,
	href TEXT,
	updated_at TEXT NOT NULL DEFAULT (app_now()),
	PRIMARY KEY (source, id)
);

CREATE TABLE tags (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL DEFAULT (app_now())
, color TEXT NOT NULL DEFAULT '', text_color TEXT NOT NULL DEFAULT '');

CREATE TABLE task_groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	color TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE x_posts (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	image_key TEXT,
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'scheduled', 'done', 'failed')),
	scheduled_at TEXT,
	notes TEXT NOT NULL DEFAULT '',
	x_post_id TEXT,
	last_error TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, destination TEXT NOT NULL DEFAULT 'studiofoods');

CREATE TABLE app_names (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, color TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '', text_color TEXT NOT NULL DEFAULT '', app_group_id TEXT REFERENCES app_groups(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE, app_group TEXT NOT NULL DEFAULT '', app_type_id TEXT REFERENCES app_types(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE, app_type TEXT NOT NULL DEFAULT '');

CREATE TABLE blog_idea_tags (
	idea_id TEXT NOT NULL REFERENCES blog_ideas(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	PRIMARY KEY (idea_id, tag_id)
);

CREATE TABLE blog_idea_uses (
	id TEXT PRIMARY KEY,
	idea_id TEXT NOT NULL REFERENCES blog_ideas(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	medium TEXT NOT NULL CHECK (medium IN ('blog', 'x')),
	destination TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	UNIQUE (idea_id, medium, destination)
);

CREATE TABLE blog_post_comments (
	id TEXT PRIMARY KEY,
	blog_post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (app_now())
, status TEXT NOT NULL DEFAULT 'open');

CREATE TABLE pages (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	path TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '',
	category_id TEXT REFERENCES categories(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE tasks (
	id TEXT PRIMARY KEY,
	employee_id TEXT NOT NULL REFERENCES employees(id) DEFERRABLE INITIALLY IMMEDIATE,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	image_key TEXT,
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'scheduled', 'done', 'failed')),
	scheduled_at TEXT,
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, x_post_id TEXT, last_error TEXT NOT NULL DEFAULT '', category_id TEXT REFERENCES categories(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE, start_at TEXT, end_at TEXT, task_group_id TEXT
	REFERENCES task_groups(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE, recurrence_series_id TEXT);

CREATE TABLE x_post_comments (
	id TEXT PRIMARY KEY,
	x_post_id TEXT NOT NULL REFERENCES x_posts(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
	author_name TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	created_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE app_requirements (
	id TEXT PRIMARY KEY,
	app_name_id TEXT NOT NULL REFERENCES app_names(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'in_progress', 'done', 'cancelled')),
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE apps (
	id TEXT PRIMARY KEY,
	sort_order INTEGER NOT NULL DEFAULT 0,
	app_group TEXT NOT NULL DEFAULT '',
	name TEXT NOT NULL,
	app_type TEXT NOT NULL DEFAULT '',
	dev_policy TEXT NOT NULL DEFAULT '',
	dev_folder TEXT NOT NULL DEFAULT '',
	frontend TEXT NOT NULL DEFAULT '',
	css TEXT NOT NULL DEFAULT '',
	backend TEXT NOT NULL DEFAULT '',
	db TEXT NOT NULL DEFAULT '',
	storage TEXT NOT NULL DEFAULT '',
	port TEXT NOT NULL DEFAULT '',
	auth TEXT NOT NULL DEFAULT '',
	staging_url TEXT NOT NULL DEFAULT '',
	hosting TEXT NOT NULL DEFAULT '',
	production_url TEXT NOT NULL DEFAULT '',
	owner TEXT NOT NULL DEFAULT '',
	last_deployed_at TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
, app_name_id TEXT REFERENCES app_names(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE, app_group_id TEXT REFERENCES app_groups(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE, app_type_id TEXT REFERENCES app_types(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE);

CREATE TABLE google_task_sync (
	task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	google_tasklist_id TEXT NOT NULL,
	google_task_id TEXT NOT NULL,
	etag TEXT NOT NULL DEFAULT '',
	google_updated_at TEXT,
	payload_hash TEXT NOT NULL DEFAULT '',
	last_source TEXT NOT NULL DEFAULT 'ai-org'
		CHECK (last_source IN ('ai-org', 'google')),
	synced_at TEXT NOT NULL DEFAULT (app_now()),
	UNIQUE (google_task_id)
);

CREATE TABLE page_tags (
	page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	PRIMARY KEY (page_id, tag_id)
);

CREATE TABLE task_links (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	url TEXT NOT NULL,
	label TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE task_tags (
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX idx_tasks_employee ON tasks(employee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_scheduled_at ON tasks(scheduled_at);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_tasks_start_at ON tasks(start_at);
CREATE INDEX idx_tasks_end_at ON tasks(end_at);
CREATE INDEX idx_employees_sort_order ON employees(sort_order);
CREATE INDEX idx_automation_runs_source_id_finished
	ON automation_runs(source, automation_id, finished_at DESC);
CREATE INDEX idx_apps_sort ON apps(sort_order, name);
CREATE INDEX idx_app_crons_sort ON app_crons(sort_order);
CREATE INDEX idx_x_posts_status ON x_posts(status);
CREATE INDEX idx_x_posts_scheduled_at ON x_posts(scheduled_at);
CREATE INDEX idx_app_names_sort ON app_names(sort_order, name);
CREATE INDEX idx_apps_app_name ON apps(app_name_id);
CREATE INDEX idx_app_groups_sort ON app_groups(sort_order, name);
CREATE INDEX idx_app_types_sort ON app_types(sort_order, name);
CREATE INDEX idx_apps_app_group ON apps(app_group_id);
CREATE INDEX idx_apps_app_type ON apps(app_type_id);
CREATE INDEX idx_org_rules_sort ON org_rules(sort_order, title);
CREATE INDEX idx_app_names_app_group ON app_names(app_group_id);
CREATE INDEX idx_app_names_app_type ON app_names(app_type_id);
CREATE INDEX idx_pages_category ON pages(category_id);
CREATE INDEX idx_pages_sort ON pages(sort_order);
CREATE INDEX idx_page_tags_tag ON page_tags(tag_id);
CREATE INDEX idx_tasks_task_group ON tasks(task_group_id);
CREATE INDEX idx_app_requirements_app ON app_requirements(app_name_id, sort_order);
CREATE INDEX idx_task_links_task ON task_links(task_id);
CREATE INDEX idx_tasks_recurrence_series ON tasks(recurrence_series_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_updated ON blog_posts(updated_at);
CREATE INDEX idx_blog_posts_destination ON blog_posts(destination);
CREATE INDEX idx_google_task_sync_list
	ON google_task_sync(google_tasklist_id);
CREATE INDEX idx_x_posts_destination ON x_posts(destination);
CREATE INDEX idx_blog_post_comments_post ON blog_post_comments(blog_post_id);
CREATE INDEX idx_blog_post_comments_created ON blog_post_comments(created_at);
CREATE INDEX idx_blog_post_comments_status ON blog_post_comments(blog_post_id, status);
CREATE INDEX idx_x_post_comments_post ON x_post_comments(x_post_id);
CREATE INDEX idx_x_post_comments_created ON x_post_comments(created_at);
CREATE INDEX idx_x_post_comments_status ON x_post_comments(x_post_id, status);
CREATE INDEX idx_blog_ideas_topic ON blog_ideas(topic);
CREATE INDEX idx_blog_idea_uses_idea ON blog_idea_uses(idea_id);
CREATE INDEX idx_blog_idea_tags_tag ON blog_idea_tags(tag_id);

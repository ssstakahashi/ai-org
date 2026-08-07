-- アプリグループ / AppType マスタ

CREATE TABLE IF NOT EXISTS app_groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_groups_sort ON app_groups(sort_order, name);

CREATE TABLE IF NOT EXISTS app_types (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_types_sort ON app_types(sort_order, name);

INSERT OR IGNORE INTO app_groups (id, name, sort_order)
SELECT
	'appgroup-' || lower(hex(randomblob(8))),
	app_group,
	MIN(sort_order)
FROM apps
WHERE trim(app_group) != ''
GROUP BY app_group;

INSERT OR IGNORE INTO app_types (id, name, sort_order)
SELECT
	'apptype-' || lower(hex(randomblob(8))),
	app_type,
	MIN(sort_order)
FROM apps
WHERE trim(app_type) != ''
GROUP BY app_type;

INSERT OR IGNORE INTO app_types (id, name, sort_order) VALUES
	('apptype-app', 'App', 10),
	('apptype-individual', '個別App', 20),
	('apptype-hp', 'HP', 30),
	('apptype-blog', 'ブログ', 40);

ALTER TABLE apps ADD COLUMN app_group_id TEXT REFERENCES app_groups(id) ON DELETE RESTRICT;
ALTER TABLE apps ADD COLUMN app_type_id TEXT REFERENCES app_types(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_apps_app_group ON apps(app_group_id);
CREATE INDEX IF NOT EXISTS idx_apps_app_type ON apps(app_type_id);

UPDATE apps
SET app_group_id = (
	SELECT id FROM app_groups WHERE app_groups.name = apps.app_group LIMIT 1
)
WHERE app_group_id IS NULL AND trim(app_group) != '';

UPDATE apps
SET app_type_id = (
	SELECT id FROM app_types WHERE app_types.name = apps.app_type LIMIT 1
)
WHERE app_type_id IS NULL AND trim(app_type) != '';

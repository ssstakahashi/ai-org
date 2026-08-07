-- アプリケーション名マスタ（App管理で選択）

CREATE TABLE IF NOT EXISTS app_names (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_names_sort ON app_names(sort_order, name);

-- 既存 apps.name をマスタへ投入
INSERT OR IGNORE INTO app_names (id, name, sort_order)
SELECT
	'appname-' || lower(hex(randomblob(8))),
	name,
	MIN(sort_order)
FROM apps
WHERE trim(name) != ''
GROUP BY name;

ALTER TABLE apps ADD COLUMN app_name_id TEXT REFERENCES app_names(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_apps_app_name ON apps(app_name_id);

UPDATE apps
SET app_name_id = (
	SELECT id FROM app_names WHERE app_names.name = apps.name LIMIT 1
)
WHERE app_name_id IS NULL AND trim(name) != '';

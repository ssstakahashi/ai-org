-- アプリケーション名マスタにアプリグループ・AppType を紐づけ

ALTER TABLE app_names ADD COLUMN app_group_id TEXT REFERENCES app_groups(id) ON DELETE RESTRICT;
ALTER TABLE app_names ADD COLUMN app_group TEXT NOT NULL DEFAULT '';
ALTER TABLE app_names ADD COLUMN app_type_id TEXT REFERENCES app_types(id) ON DELETE RESTRICT;
ALTER TABLE app_names ADD COLUMN app_type TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_app_names_app_group ON app_names(app_group_id);
CREATE INDEX IF NOT EXISTS idx_app_names_app_type ON app_names(app_type_id);

-- 既存 apps 行から代表値をバックフィル
UPDATE app_names
SET app_group_id = (
	SELECT app_group_id FROM apps
	WHERE app_name_id = app_names.id AND app_group_id IS NOT NULL
	LIMIT 1
),
app_group = COALESCE((
	SELECT app_group FROM apps
	WHERE app_name_id = app_names.id AND trim(app_group) != ''
	LIMIT 1
), ''),
app_type_id = (
	SELECT app_type_id FROM apps
	WHERE app_name_id = app_names.id AND app_type_id IS NOT NULL
	LIMIT 1
),
app_type = COALESCE((
	SELECT app_type FROM apps
	WHERE app_name_id = app_names.id AND trim(app_type) != ''
	LIMIT 1
), '');

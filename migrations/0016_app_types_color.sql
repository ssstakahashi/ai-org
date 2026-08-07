-- AppType マスタの表示色・テキスト色・アイコン（グループと同様）

ALTER TABLE app_types ADD COLUMN color TEXT NOT NULL DEFAULT '';
ALTER TABLE app_types ADD COLUMN text_color TEXT NOT NULL DEFAULT '';
ALTER TABLE app_types ADD COLUMN icon TEXT NOT NULL DEFAULT '';

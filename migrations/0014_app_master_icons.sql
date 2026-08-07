-- アプリケーション名 / アプリグループのアイコン

ALTER TABLE app_names ADD COLUMN icon TEXT NOT NULL DEFAULT '';
ALTER TABLE app_groups ADD COLUMN icon TEXT NOT NULL DEFAULT '';

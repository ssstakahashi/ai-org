-- アプリグループマスタの表示色

ALTER TABLE app_groups ADD COLUMN color TEXT NOT NULL DEFAULT '';

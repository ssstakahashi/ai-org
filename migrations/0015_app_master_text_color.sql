-- アプリ名・グループマスタのテキスト色（color は背景として継続）

ALTER TABLE app_names ADD COLUMN text_color TEXT NOT NULL DEFAULT '';
ALTER TABLE app_groups ADD COLUMN text_color TEXT NOT NULL DEFAULT '';

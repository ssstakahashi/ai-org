-- タグの文字色（背景色 color とは別指定）

ALTER TABLE tags ADD COLUMN text_color TEXT NOT NULL DEFAULT '';

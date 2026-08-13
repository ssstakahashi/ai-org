-- 従業員の文字色（背景色 color とは別指定）

ALTER TABLE employees ADD COLUMN text_color TEXT NOT NULL DEFAULT '';

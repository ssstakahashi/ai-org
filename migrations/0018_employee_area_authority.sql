-- 従業員の担当領域・職務権限

ALTER TABLE employees ADD COLUMN area TEXT NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN authority TEXT NOT NULL DEFAULT '';

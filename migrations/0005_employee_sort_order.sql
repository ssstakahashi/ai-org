-- 従業員の表示順

ALTER TABLE employees ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_employees_sort_order ON employees(sort_order);

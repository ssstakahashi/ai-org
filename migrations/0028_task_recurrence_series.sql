-- 繰り返しタスクのシリーズ紐付け

ALTER TABLE tasks ADD COLUMN recurrence_series_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_series ON tasks(recurrence_series_id);

-- タスクの期間（連続表示用）

ALTER TABLE tasks ADD COLUMN start_at TEXT;
ALTER TABLE tasks ADD COLUMN end_at TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_start_at ON tasks(start_at);
CREATE INDEX IF NOT EXISTS idx_tasks_end_at ON tasks(end_at);

-- 既存の予約日時があるタスクは1日期間として引き継ぐ
UPDATE tasks
SET start_at = scheduled_at,
    end_at = scheduled_at
WHERE scheduled_at IS NOT NULL
  AND start_at IS NULL
  AND end_at IS NULL;

ALTER TABLE app_requirements
	ADD COLUMN IF NOT EXISTS completed_at TEXT;

UPDATE app_requirements
SET completed_at = updated_at
WHERE status = 'done'
	AND completed_at IS NULL;

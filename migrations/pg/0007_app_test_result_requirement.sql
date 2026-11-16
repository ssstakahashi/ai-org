ALTER TABLE app_test_results
	ADD COLUMN IF NOT EXISTS requirement_id TEXT REFERENCES app_requirements(id)
		ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS idx_app_test_results_requirement
	ON app_test_results(requirement_id, recorded_at DESC);

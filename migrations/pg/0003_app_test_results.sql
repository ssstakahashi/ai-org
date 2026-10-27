-- App ごとのテスト計画・テスト結果（App管理）

CREATE TABLE IF NOT EXISTS app_test_plans (
	id TEXT PRIMARY KEY,
	app_name_id TEXT NOT NULL UNIQUE REFERENCES app_names(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	body TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE TABLE IF NOT EXISTS app_test_results (
	id TEXT PRIMARY KEY,
	app_name_id TEXT NOT NULL REFERENCES app_names(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	outcome TEXT NOT NULL DEFAULT 'info'
		CHECK (outcome IN ('pass', 'fail', 'partial', 'blocked', 'skipped', 'info')),
	recorded_at TEXT NOT NULL DEFAULT (app_now()),
	created_at TEXT NOT NULL DEFAULT (app_now()),
	updated_at TEXT NOT NULL DEFAULT (app_now())
);

CREATE INDEX IF NOT EXISTS idx_app_test_results_app
	ON app_test_results(app_name_id, recorded_at DESC, created_at DESC);

-- 外部アプリからの自動化カタログ取り込みと実行履歴

CREATE TABLE IF NOT EXISTS remote_automations (
	source TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	runner TEXT NOT NULL CHECK (runner IN ('program', 'cursor', 'manual')),
	status TEXT NOT NULL CHECK (status IN ('active', 'none', 'manual')),
	trigger_text TEXT NOT NULL,
	summary TEXT NOT NULL,
	location TEXT NOT NULL,
	href TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (source, id)
);

CREATE TABLE IF NOT EXISTS automation_runs (
	id TEXT PRIMARY KEY,
	source TEXT NOT NULL,
	automation_id TEXT NOT NULL,
	ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
	started_at TEXT NOT NULL,
	finished_at TEXT NOT NULL,
	error TEXT,
	meta_json TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_source_id_finished
	ON automation_runs(source, automation_id, finished_at DESC);

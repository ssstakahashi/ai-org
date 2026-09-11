-- Google Tasks ↔ 業務台帳の対応表

CREATE TABLE IF NOT EXISTS google_task_sync (
	task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
	google_tasklist_id TEXT NOT NULL,
	google_task_id TEXT NOT NULL,
	etag TEXT NOT NULL DEFAULT '',
	google_updated_at TEXT,
	payload_hash TEXT NOT NULL DEFAULT '',
	last_source TEXT NOT NULL DEFAULT 'ai-org'
		CHECK (last_source IN ('ai-org', 'google')),
	synced_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (google_task_id)
);

CREATE INDEX IF NOT EXISTS idx_google_task_sync_list
	ON google_task_sync(google_tasklist_id);

CREATE TABLE IF NOT EXISTS google_task_sync_state (
	id TEXT PRIMARY KEY CHECK (id = 'default'),
	tasklist_id TEXT,
	last_polled_at TEXT,
	last_updated_min TEXT
);

INSERT OR IGNORE INTO google_task_sync_state (id) VALUES ('default');

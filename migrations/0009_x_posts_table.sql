-- X投稿を業務タスク（tasks）から分離

CREATE TABLE IF NOT EXISTS x_posts (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	image_key TEXT,
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'approved', 'scheduled', 'done', 'failed')),
	scheduled_at TEXT,
	notes TEXT NOT NULL DEFAULT '',
	x_post_id TEXT,
	last_error TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_x_posts_status ON x_posts(status);
CREATE INDEX IF NOT EXISTS idx_x_posts_scheduled_at ON x_posts(scheduled_at);

-- 既存の X投稿担当タスクを移行
INSERT INTO x_posts (
	id, title, body, image_key, status, scheduled_at, notes, x_post_id, last_error, created_at, updated_at
)
SELECT
	t.id,
	t.title,
	t.body,
	t.image_key,
	t.status,
	t.scheduled_at,
	t.notes,
	t.x_post_id,
	t.last_error,
	t.created_at,
	t.updated_at
FROM tasks t
JOIN employees e ON e.id = t.employee_id
WHERE e.role = 'x_poster';

-- 移行済み行は同一 id で x_posts にある
DELETE FROM task_tags WHERE task_id IN (SELECT id FROM x_posts);
DELETE FROM tasks WHERE id IN (SELECT id FROM x_posts);

UPDATE app_crons
SET notes = '予約かつ scheduled_at 超過の x_posts を最大20件投稿',
    updated_at = datetime('now')
WHERE id = 'cron-ai-org-x-due';

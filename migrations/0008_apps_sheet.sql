-- アプリケーション開発・デプロイ管理シート（Deploy_list 相当）

CREATE TABLE IF NOT EXISTS apps (
	id TEXT PRIMARY KEY,
	sort_order INTEGER NOT NULL DEFAULT 0,
	app_group TEXT NOT NULL DEFAULT '',
	name TEXT NOT NULL,
	app_type TEXT NOT NULL DEFAULT '',
	dev_policy TEXT NOT NULL DEFAULT '',
	dev_folder TEXT NOT NULL DEFAULT '',
	frontend TEXT NOT NULL DEFAULT '',
	css TEXT NOT NULL DEFAULT '',
	backend TEXT NOT NULL DEFAULT '',
	db TEXT NOT NULL DEFAULT '',
	storage TEXT NOT NULL DEFAULT '',
	port TEXT NOT NULL DEFAULT '',
	auth TEXT NOT NULL DEFAULT '',
	staging_url TEXT NOT NULL DEFAULT '',
	hosting TEXT NOT NULL DEFAULT '',
	production_url TEXT NOT NULL DEFAULT '',
	owner TEXT NOT NULL DEFAULT '',
	last_deployed_at TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_sort ON apps(sort_order, name);

CREATE TABLE IF NOT EXISTS app_crons (
	id TEXT PRIMARY KEY,
	sort_order INTEGER NOT NULL DEFAULT 0,
	environment TEXT NOT NULL DEFAULT '',
	schedule TEXT NOT NULL DEFAULT '',
	kind TEXT NOT NULL DEFAULT '',
	target TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_crons_sort ON app_crons(sort_order);

INSERT OR IGNORE INTO apps (
	id, sort_order, app_group, name, app_type, dev_policy, dev_folder,
	frontend, css, backend, db, storage, port, auth,
	staging_url, hosting, production_url, owner, last_deployed_at, notes
) VALUES (
	'app-ai-org',
	10,
	'AI-Org',
	'ai-org',
	'App',
	'継続',
	'/Users/user/Developer/ai-org/00_private/ai-org',
	'Next.js 16（React 19）+ OpenNext',
	'Tailwind CSS v4',
	'Cloudflare Workers',
	'D1（cloudflare）ai-org',
	'R2（cloudflare）ai-org-media',
	'3000',
	'Cloudflare Access（メールOTP）',
	'',
	'Cloudflare Workers',
	'https://ai-org.s-takahashi-241.workers.dev',
	'昌兵',
	'2026/08/05',
	'X自動投稿Cron毎分；初期従業員=X投稿/リサーチ/運用'
);

INSERT OR IGNORE INTO app_crons (
	id, sort_order, environment, schedule, kind, target, notes
) VALUES (
	'cron-ai-org-x-due',
	10,
	'Cloudflare Workers',
	'* * * * *（毎分）',
	'Cron',
	'ai-org / x-due-cron',
	'予約かつ scheduled_at 超過の X投稿担当タスクを最大20件投稿'
);

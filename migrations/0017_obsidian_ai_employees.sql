-- Obsidian「AI従業員」フォルダの7名を正とする（一度きり投入）
-- 旧シード（X投稿担当 / リサーチ / 運用 等）は削除し、残タスクは代表へ付け替える

INSERT OR REPLACE INTO employees (id, name, role, color, sort_order) VALUES
	(
		'emp-ceo',
		'高橋昌兵（代表）',
		'個人事業の代表。最終決裁・稟議承認・対外の公式意思決定を担う。',
		'',
		10
	),
	(
		'emp-planning',
		'経営企画AI',
		'タスクの優先度付け、進捗会議の議事起案、部署横断の調整、Inbox の振り分け。',
		'',
		20
	),
	(
		'emp-dev',
		'開発AI',
		'MIERU、WATOWA、農業App、Tauri、各種HP の設計・実装・技術選定。',
		'',
		30
	),
	(
		'emp-accounting',
		'会計税務AI',
		'税務申告、仕訳、会計App機能、個人税務、自動仕訳の設計・実行。',
		'',
		40
	),
	(
		'emp-service',
		'受託サービスAI',
		'会計受託クライアントの日常対応、問い合わせ、進捗管理。',
		'',
		50
	),
	(
		'emp-content',
		'コンテンツAI',
		'ブログ、HP、Web開示資料、移住・農業ブログの執筆・構成・公開準備。',
		'',
		60
	),
	(
		'emp-politics',
		'政治活動AI',
		'政治活動に関する調査、執筆、事務局業務、400_Politics 配下コンテンツの整理。',
		'',
		70
	);

UPDATE tasks
SET employee_id = 'emp-ceo',
	updated_at = datetime('now')
WHERE employee_id NOT IN (
	'emp-ceo',
	'emp-planning',
	'emp-dev',
	'emp-accounting',
	'emp-service',
	'emp-content',
	'emp-politics'
);

DELETE FROM employees
WHERE id NOT IN (
	'emp-ceo',
	'emp-planning',
	'emp-dev',
	'emp-accounting',
	'emp-service',
	'emp-content',
	'emp-politics'
);

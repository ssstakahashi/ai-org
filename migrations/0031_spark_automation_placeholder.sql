-- Google Spark の自動化カタログ用プレースホルダ（人が編集 / Spark が上書き）
INSERT OR IGNORE INTO remote_automations (
	source, id, name, runner, status, trigger_text, summary, location, href, updated_at
) VALUES (
	'spark',
	'google-spark',
	'Google Spark',
	'program',
	'none',
	'未設定（Spark が記述）',
	'（Spark または人が内容を記入）',
	'Google Spark',
	NULL,
	datetime('now')
);

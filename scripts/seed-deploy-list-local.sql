-- Deploy_list をローカル D1 に投入（Google Sheets 同期）
DELETE FROM apps;
DELETE FROM app_crons;
DELETE FROM app_names;
DELETE FROM app_groups;
DELETE FROM app_types;

INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-001', 10, 'Agri', '鳥取県就農支援', '', '', '', 'Rimix（react）', '', 'Rimix', 'D1（cloudflare）agri-starter', '', '', '', '[URL]', 'Cloundflare', 'https://agri-starter-next.pages.dev/', '昌兵', '2025/11/20', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-002', 20, 'Agri', '農業ブログ', 'ブログ', '継続', '', 'CloudFlare emDash', '', 'CloudFlare emDash', 'D1（cloudflare）agri-manual', 'R2（cloudflare）', '', '', '', 'Cloundflare Workers', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-003', 30, 'Agri', 'アグリレコード', 'App', '停止', '/Users/user/developer/15_agri/agri_app_fullstack/my-agri-app', 'react', '', 'Agriバックエンド', 'ー', '', '[URL]', 'agri（Firebase Authentication）shouhei0123456789@gmail.com', '[URL]', 'Firebase', 'https://agri-4f5f9.web.app/map', '昌兵', '2025/11/15', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-004', 40, 'Agri', 'アグリレコード クライアント', 'App', '優先', '/Users/user/developer/15_agri/agri-client', '', '', 'Agriバックエンド Next', '', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-005', 50, 'Agri', '農薬検索', 'App', '保留', '/Users/user/developer/15_agri/', '', '', 'Agriバックエンド', 'ー', '', '', '', '', '', 'https://agri.studiofoods.net', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-006', 60, 'Agri', '肥料検索', 'App', '保留', '/Users/user/developer/15_agri/', '', '', 'Agriバックエンド', 'ー', '', '', '', '', '', '', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-007', 70, 'Agri', 'Agriバックエンド', 'App', '保留', '/Users/user/developer/15_agri/agri_app_fullstack/agri-backend', 'ー', '', 'Hono', 'Postgresql', '', '', '', '', 'loclaUbuntu KURAYOSHI', '', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-008', 80, 'Agri', 'Agriバックエンド Next', 'App', '優先', '/Users/user/developer/15_agri/agri-starter-next', '', '', 'ー', '', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-009', 90, 'Agri', 'Agriマニュアル', 'App', '優先', '/Users/user/developer/15_agri/agri-manual', 'CloudFlare emDash', '', 'CloudFlare emDash', 'D1（cloudflare）agri-manual', 'R2（cloudflare）', '', '', '', 'Cloundflare Workers', 'https://agri-manual.studiofoods.net', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-010', 100, 'MIERU', 'MIERUバックエンド', 'App', '優先', '/Users/user/developer/10_MIERU/', 'ー', '', 'Hono', 'Postgresql', '', '3001', 'MIERU（Firebase Authentication）', '', 'Kagoya ', 'http://mieru.studiofoods.net/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-011', 110, 'MIERU', 'MIERU 会計管理', 'App', '優先', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', 'MIERU（Firebase Hosting）', 'https://mieru-incometax.web.app/', '昌兵', '2025/11/22', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-012', 120, 'MIERU', 'MIERU 会計管理 Mobile', 'App', '優先', '/Users/user/developer/10_MIERU/', 'Nextjs', '', 'CloudFlare Hono', '', '', '', '', '', 'Cloundflare Workers', '', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-013', 130, 'MIERU', 'MIERU 債権管理', 'App', '継続', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', 'MIERU（Firebase Hosting）', 'https://mieru-receivable.web.app/', '昌兵', '2025/11/18', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-014', 140, 'MIERU', 'MIERU 設定管理', 'App', '継続', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', 'MIERU（Firebase Hosting）', '[URL]', '昌兵', '2025/11/10', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-015', 150, 'MIERU', 'MIERU 固定資産管理', 'App', '継続', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', 'MIERU（Firebase Hosting）', '[URL]', '昌兵', '2025/11/24', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-016', 160, 'MIERU', 'MIERU 名刺管理', 'App', '継続', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', 'MIERU（Firebase Hosting）', '[URL]', '昌兵', '2025/11/05', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-017', 170, 'MIERU', 'カイレコ', 'App', '保留', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '[URL]', 'MIERU（Firebase Authentication）', '[URL]', '', 'https://purchase.studiofoods.net/', '昌兵', '2025/11/12', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-018', 180, 'MIERU', '職務経歴書ツクル', 'App', '継続', '/Users/user/developer/12_Career/create-front', 'react', '', 'CAREERバックエンド', '', '', '5173', 'MIERU（Firebase Authentication）', '', '', 'https://create-resume.pages.dev/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-019', 190, 'MIERU', 'CAREERバックエンド', 'App', '継続', '/Users/user/developer/12_Career/career-backend', 'hono', '', 'ー', '', '', '3300', 'MIERU（Firebase Authentication）', '', '', 'https://career.studiofoods.net', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-020', 200, 'MIERU', 'MERU 文書管理', 'App', '停止', '/Users/user/developer/10_MIERU/', 'react', '', '', '', '', '', 'MIERU（Firebase Authentication）', '', '', 'https://mieru-document.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-021', 210, 'MIERU', 'MERU KAKEIBO', 'App', '継続', '/Users/user/developer/10_MIERU/', 'react', '', 'MIERUバックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://mieru-purchase.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-022', 220, 'MIERU', 'MERU Totonou CSV ', 'App', '削除', '/Users/user/developer/10_MIERU/mieru-csv-change', 'react', '', '', 'D1（cloudflare）mieru-db', '', '', 'MIERU（Firebase Authentication）', '', 'Cloundflare Workers', 'https://mieru-csv-change.s-takahashi-241.workers.dev/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-023', 230, '独立', '調整さん', 'App', '保留', '', 'react', '', '', 'D1（cloudflare） adjustment-db', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-024', 240, '独立', 'NAGARERU', 'App', '継続', '/Users/user/developer/02_Web/diagrams', 'react', '', 'CloudFlare Hono', 'D1（cloudflare） diagrams-db', 'R2（cloudflare）', '', 'Hono', '', 'Cloundflare', 'https://diagrams-dez.pages.dev/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-025', 250, 'Studiofoods', 'スタジオフーズHP', 'HP', '優先', '/Users/user/developer/01_Static_Site/studiofoods-public', 'hono', 'tailwindcss', 'hono', '', '', '', 'ー', '', 'Cloundflare', 'https://www.studiofoods.net/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-026', 260, 'Studiofoods', 'サービス詳細', 'HP', '優先', '/Users/user/developer/01_Static_Site/service-page', '', '', '', '', '', '', 'ー', '', 'Cloundflare', 'https://service-description.studiofoods.net/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-027', 270, 'Studiofoods', 'MIERU＋スタジオフーズHP', '', '', '', '', '', '', '', '', '', '', '', '', '', '和子', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-028', 280, '高橋昌兵', '個人ブログ', 'ブログ', '', '', '', '', '', '', '', '', '', '', 'Local Ubuntu Aoyama', 'https://s-takahashi.studiofoods.net/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-029', 290, '地経塾', '地経塾ブログ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-030', 300, 'WATOWA', 'WATOWA 勤怠', '個別App', '優先', '/Users/user/developer/70_Watowa/watowa-freee-validation/watowa-attend', 'react', '', 'WATOWA バックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://watowa-c0d7d.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-031', 310, 'WATOWA', 'WATOWA バックエンド', '個別App', '優先', '/Users/user/developer/70_Watowa/', 'ー', '', 'Hono', 'Postgresql', '', '', 'MIERU（Firebase Authentication）', '', 'Kagoya ', 'https://watowa-backend.studiofoods.net/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-032', 320, 'WATOWA', 'WATOWA セルフチェックイン', '個別App', '継続', '/Users/user/developer/70_Watowa/', 'react', '', 'WATOWA バックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://watowa-self-check-in.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-033', 330, 'WATOWA', 'WATOWA レシート管理', '個別App', '継続', '/Users/user/developer/70_Watowa/', 'react', '', 'WATOWA バックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://watowa-receipt.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-034', 340, 'WATOWA', 'WATOWA 販売管理', '個別App', '継続', '/Users/user/developer/70_Watowa/watowa-freee-validation', 'react', '', 'WATOWA バックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://watowa-freee.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-035', 350, 'WATOWA', 'WATOWA 労務', '個別App', '継続', '/Users/user/developer/70_Watowa/', 'react', '', 'WATOWA バックエンド', '', '', '', 'MIERU（Firebase Authentication）', '', 'MIERU（Firebase Hosting）', 'https://watowa-hotel-dashboard.web.app/', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-036', 360, 'WATOWA', 'WATOWA Email', '個別App', '継続', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-037', 370, 'WATOWA', 'WATOWA Square', '個別App', '継続', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-038', 380, '山本', 'ホテル Admin', '個別App', '継続', '', '', '', '', '', '', '', '', '', '', 'https://agri-manual.studiofoods.net/_emdash/admin', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-deploy-039', 390, '山本', 'ホテル予約サイト', '個別App', '継続', '', '', '', '', '', '', '', '', '', '', 'https://agri-manual.studiofoods.net', '昌兵', '', '');
INSERT INTO apps (id, sort_order, app_group, name, app_type, dev_policy, dev_folder, frontend, css, backend, db, storage, port, auth, staging_url, hosting, production_url, owner, last_deployed_at, notes) VALUES ('app-ai-org', 400, 'AI-Org', 'ai-org', 'App', '継続', '/Users/user/Developer/ai-org/00_private/ai-org', 'Next.js 16（React 19）+ OpenNext', 'Tailwind CSS v4', 'Cloudflare Workers', 'D1（cloudflare）ai-org', 'R2（cloudflare）ai-org-media', '3000', 'Cloudflare Access（メールOTP）', '', 'Cloudflare Workers', 'https://ai-org.s-takahashi-241.workers.dev', '昌兵', '2026/08/05', 'X自動投稿Cron毎分；初期従業員=X投稿/リサーチ/運用');
INSERT INTO app_crons (id, sort_order, environment, schedule, kind, target, notes) VALUES ('cron-001', 10, 'local-ubuntu', '毎日2時30分', 'postgresql', 'agri', '');
INSERT INTO app_crons (id, sort_order, environment, schedule, kind, target, notes) VALUES ('cron-002', 20, '', '', 'postgresql', 'watowa-confidential', '');
INSERT INTO app_crons (id, sort_order, environment, schedule, kind, target, notes) VALUES ('cron-003', 30, '', '', 'folder', '/home/s-takahashi/development', '');
INSERT INTO app_crons (id, sort_order, environment, schedule, kind, target, notes) VALUES ('cron-004', 40, 'local-ubuntu', '0 */6 * * * / */2 * * * *', 'crontab', 'agri-next-backend', 'RSSキュー投入（6時間ごと）と要約キュー処理（2分ごと）');
INSERT INTO app_crons (id, sort_order, environment, schedule, kind, target, notes) VALUES ('cron-ai-org-x-due', 50, 'Cloudflare Workers', '* * * * *（毎分）', 'Cron', 'ai-org / x-due-cron', '予約かつ scheduled_at 超過の x_posts を最大20件投稿');

-- アプリケーション名 / グループ / AppType マスタを再構築
INSERT INTO app_names (id, name, sort_order)
SELECT
	'appname-' || lower(hex(randomblob(8))),
	name,
	MIN(sort_order)
FROM apps
WHERE trim(name) != ''
GROUP BY name;

UPDATE apps
SET app_name_id = (
	SELECT id FROM app_names WHERE app_names.name = apps.name LIMIT 1
)
WHERE trim(name) != '';

INSERT INTO app_groups (id, name, sort_order)
SELECT
	'appgroup-' || lower(hex(randomblob(8))),
	app_group,
	MIN(sort_order)
FROM apps
WHERE trim(app_group) != ''
GROUP BY app_group;

UPDATE apps
SET app_group_id = (
	SELECT id FROM app_groups WHERE app_groups.name = apps.app_group LIMIT 1
)
WHERE trim(app_group) != '';

INSERT OR IGNORE INTO app_types (id, name, sort_order) VALUES
	('apptype-app', 'App', 10),
	('apptype-individual', '個別App', 20),
	('apptype-hp', 'HP', 30),
	('apptype-blog', 'ブログ', 40);

INSERT INTO app_types (id, name, sort_order)
SELECT
	'apptype-' || lower(hex(randomblob(8))),
	app_type,
	MIN(sort_order)
FROM apps
WHERE trim(app_type) != ''
	AND NOT EXISTS (
		SELECT 1 FROM app_types t WHERE lower(t.name) = lower(apps.app_type)
	)
GROUP BY app_type;

UPDATE apps
SET app_type_id = (
	SELECT id FROM app_types WHERE app_types.name = apps.app_type LIMIT 1
)
WHERE trim(app_type) != '';


UPDATE tasks
SET status='done',
    notes='下書き投入済み。ai-org /blog-drafts slug=kurayoshi-one-farm-diary-sensor id=blog_3aa7d53d-0f0d-4491-a303-a5995863a4d5。本番は承認後。',
    updated_at=datetime('now')
WHERE id='task_blog_2026-09-12_agri-dx';

-- ensure a few more days of approved tasks exist beyond 9/20 if missing
INSERT OR IGNORE INTO tasks (id, employee_id, title, body, status, notes, created_at, updated_at)
VALUES
('task_blog_2026-09-21_backoffice', 'emp-content', '【ブログ】バックオフィス実務 Tips（次の切り口）', '毎日9:00の8本柱。', 'approved', '毎日9:00の8本柱。担当はスタジオフーズ広報。', datetime('now'), datetime('now')),
('task_blog_2026-09-22_tax', 'emp-content', '【ブログ】税制の変化（一般解説・続き）', '毎日9:00の8本柱。', 'approved', '毎日9:00の8本柱。担当はスタジオフーズ広報。', datetime('now'), datetime('now')),
('task_blog_2026-09-23_social', 'emp-content', '【ブログ】社会保険制度の変化（一般解説・続き）', '毎日9:00の8本柱。', 'approved', '毎日9:00の8本柱。担当はスタジオフーズ広報。', datetime('now'), datetime('now'));

-- Mark today's CF series task done
UPDATE tasks
SET status='done',
    notes='下書き投入済み。ai-org /blog-drafts slug=cloudflare-tunnel-minimum-for-smb id=blog_ef65365b-2d82-43ac-85ba-08648e173d65。本番は承認後。Sheets Data!A14追記済み。',
    updated_at=datetime('now')
WHERE id='task_blog_cf_2026-09-18';

-- Ensure next Mon/Wed/Fri CF series tasks exist (9/28, 9/30, 10/2)
INSERT OR IGNORE INTO tasks (id, employee_id, title, body, status, notes, start_at, created_at, updated_at)
VALUES
('task_blog_cf_2026-09-28', 'emp-content', '【ブログ】Cloudflareのアクセス制限とネットワークセキュリティ', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', 'approved', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', '2026-09-28T01:52:00.000Z', datetime('now'), datetime('now')),
('task_blog_cf_2026-09-30', 'emp-content', '【ブログ】Cloudflareのアクセス制限とネットワークセキュリティ', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', 'approved', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', '2026-09-30T01:52:00.000Z', datetime('now'), datetime('now')),
('task_blog_cf_2026-10-02', 'emp-content', '【ブログ】Cloudflareのアクセス制限とネットワークセキュリティ', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', 'approved', '月水金10:52。毎日の8本柱とは別。担当はスタジオフーズ広報。', '2026-10-02T01:52:00.000Z', datetime('now'), datetime('now'));

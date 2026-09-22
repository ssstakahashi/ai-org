-- 投稿メニューのネタページをページ台帳へ登録する

INSERT OR IGNORE INTO pages (id, title, path, body, category_id, sort_order) VALUES
	('page-blog-ideas', 'ネタ', '/blog-ideas', 'ブログネタ（SideBusiness / Agri / 税務 / DX / 業務プロセス改革 / M＆A / 行政手続き）を参照します。', NULL, 26);

INSERT OR IGNORE INTO page_tags (page_id, tag_id)
SELECT 'page-blog-ideas', id FROM tags WHERE id = 'tag-review';

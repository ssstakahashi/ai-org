-- X投稿の投稿内容分野（Agri / 会計タブ内のサブカテゴリー）

ALTER TABLE x_posts ADD COLUMN content_subcategory TEXT NOT NULL DEFAULT '';

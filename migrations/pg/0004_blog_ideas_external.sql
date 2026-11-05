-- 外部スクリプト（Gemini等）からのブログアイデアAPI投入のためのスキーマ拡張

ALTER TABLE blog_ideas ADD COLUMN IF NOT EXISTS external_id TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_ideas ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_ideas ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_ideas_external_id
	ON blog_ideas(external_id)
	WHERE external_id <> '';

CREATE INDEX IF NOT EXISTS idx_blog_ideas_source
	ON blog_ideas(source)
	WHERE source <> '';

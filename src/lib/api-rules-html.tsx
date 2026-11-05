import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { resolveApiV1BaseUrl } from "@/lib/api-rules-doc";

const PAGE_CSS = `
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  background: #f6f7f9;
}
.wrap {
  max-width: 52rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
}
.banner {
  background: #fff;
  border: 1px solid #e2e5ea;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}
.banner code {
  font-size: 0.85em;
}
.doc {
  background: #fff;
  border: 1px solid #e2e5ea;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}
.markdown-preview h1 { font-size: 1.5rem; margin-top: 0; }
.markdown-preview h2 { font-size: 1.2rem; margin-top: 1.75rem; border-bottom: 1px solid #e2e5ea; padding-bottom: 0.35rem; }
.markdown-preview h3 { font-size: 1.05rem; }
.markdown-preview table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 1rem 0; }
.markdown-preview th, .markdown-preview td { border: 1px solid #d8dde5; padding: 0.4rem 0.55rem; text-align: left; vertical-align: top; }
.markdown-preview th { background: #f0f2f5; }
.markdown-preview code { font-size: 0.85em; background: #f0f2f5; padding: 0.1em 0.35em; border-radius: 4px; }
.markdown-preview pre { overflow-x: auto; background: #f0f2f5; padding: 0.75rem 1rem; border-radius: 6px; }
.markdown-preview pre code { background: none; padding: 0; }
.markdown-preview ul, .markdown-preview ol { padding-left: 1.35rem; }
.markdown-preview blockquote { margin: 0; padding-left: 1rem; border-left: 3px solid #c5cad3; color: #444; }
`;

export function buildApiRulesHtmlPage(markdown: string, publicUrl?: string | null): string {
	const base = resolveApiV1BaseUrl(publicUrl);
	const body = renderToStaticMarkup(<MarkdownPreview markdown={markdown} />);
	return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ai-org API ルール</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="wrap">
<p class="banner">
  <strong>ai-org API ルール</strong> — <code>X-API-Key</code>（<code>reader</code> 以上）が必要です。
  JSON: <code>GET ${base}/spec</code> /
  Markdown: <code>Accept: text/markdown</code> /
  画面（JWT）: <code>/api-rules</code>
</p>
<article class="doc">${body}</article>
</div>
</body>
</html>`;
}

import {
	parseMarkdownPreview,
	svgMarkupToDataUrl,
	type BlockNode,
	type InlineNode,
} from "@/lib/markdown-preview";

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function escapeAttr(text: string): string {
	return escapeHtml(text);
}

function renderInline(nodes: InlineNode[]): string {
	return nodes
		.map((node) => {
			switch (node.type) {
				case "text":
					return escapeHtml(node.text);
				case "strong":
					return `<strong>${renderInline(node.children)}</strong>`;
				case "em":
					return `<em>${renderInline(node.children)}</em>`;
				case "code":
					return `<code>${escapeHtml(node.text)}</code>`;
				case "link":
					return `<a href="${escapeAttr(node.href)}" target="_blank" rel="noreferrer">${renderInline(node.children)}</a>`;
				case "image":
					return `<img src="${escapeAttr(node.src)}" alt="${escapeAttr(node.alt)}" loading="lazy" />`;
				case "break":
					return "<br />";
			}
		})
		.join("");
}

function renderBlock(block: BlockNode): string {
	switch (block.type) {
		case "heading":
			return `<h${block.level}>${renderInline(block.children)}</h${block.level}>`;
		case "paragraph":
			return `<p>${renderInline(block.children)}</p>`;
		case "quote":
			return `<blockquote>${renderInline(block.children)}</blockquote>`;
		case "list": {
			const tag = block.ordered ? "ol" : "ul";
			const items = block.items.map((item) => `<li>${renderInline(item)}</li>`).join("");
			return `<${tag}>${items}</${tag}>`;
		}
		case "table": {
			const head = block.headers
				.map((header) => `<th>${renderInline(header)}</th>`)
				.join("");
			const body = block.rows
				.map(
					(row) =>
						`<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`,
				)
				.join("");
			return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
		}
		case "code":
			return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
		case "svg": {
			const src = svgMarkupToDataUrl(block.markup);
			const alt = block.caption || "図";
			const caption = block.caption
				? `<p>${escapeHtml(block.caption)}</p>`
				: "";
			return `<div><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />${caption}</div>`;
		}
		case "hr":
			return "<hr />";
	}
}

export function renderMarkdownPreviewHtml(markdown: string, className = "markdown-preview"): string {
	const blocks = parseMarkdownPreview(markdown);
	if (blocks.length === 0) {
		return `<p>${escapeHtml("本文はありません")}</p>`;
	}
	const inner = blocks.map((block) => renderBlock(block)).join("");
	return `<div class="${escapeAttr(className)}">${inner}</div>`;
}

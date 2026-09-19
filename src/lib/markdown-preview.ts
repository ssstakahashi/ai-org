export type InlineNode =
	| { type: "text"; text: string }
	| { type: "strong"; children: InlineNode[] }
	| { type: "em"; children: InlineNode[] }
	| { type: "code"; text: string }
	| { type: "link"; href: string; children: InlineNode[] }
	| { type: "image"; src: string; alt: string }
	| { type: "break" };

export type BlockNode =
	| { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
	| { type: "paragraph"; children: InlineNode[] }
	| { type: "quote"; children: InlineNode[] }
	| { type: "list"; ordered: boolean; items: InlineNode[][] }
	| { type: "table"; headers: InlineNode[][]; rows: InlineNode[][][] }
	| { type: "code"; text: string }
	| { type: "svg"; markup: string; caption?: string }
	| { type: "hr" };

function splitCells(line: string): string[] {
	return line
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
	const cells = splitCells(line);
	return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function headingMatch(line: string) {
	const match = line.trim().match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
	if (!match) return null;
	const level = match[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
	return { level, text: match[2]!.trim() };
}

function isHr(line: string) {
	return /^([-*_])\1{2,}$/.test(line.trim());
}

function unorderedItem(line: string) {
	const match = line.match(/^(\s*)([-*+])\s+(.+)$/);
	if (!match) return null;
	if (isHr(line)) return null;
	return { indent: match[1]!.length, text: match[3]! };
}

function orderedItem(line: string) {
	const match = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
	if (!match) return null;
	return { indent: match[1]!.length, text: match[3]! };
}

function quoteText(line: string) {
	const match = line.match(/^\s{0,3}>\s?(.*)$/);
	return match ? match[1]! : null;
}

function fenceLang(line: string) {
	const match = line.trim().match(/^```(.*)$/);
	return match ? match[1]!.trim() : null;
}

function htmlBlockOpen(line: string): "figure" | "svg" | null {
	const match = line.trim().match(/^<(figure|svg)\b/i);
	if (!match) return null;
	return match[1]!.toLowerCase() as "figure" | "svg";
}

function consumeHtmlElement(
	lines: string[],
	start: number,
	tag: string,
): { html: string; next: number } | null {
	const close = new RegExp(`</${tag}\\s*>`, "i");
	const chunks: string[] = [];
	let index = start;
	while (index < lines.length) {
		chunks.push(lines[index] ?? "");
		const html = chunks.join("\n");
		if (close.test(html)) {
			return { html, next: index + 1 };
		}
		index += 1;
	}
	return null;
}

function stripTags(value: string): string {
	return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractFigcaption(html: string): string | undefined {
	const match = html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption\s*>/i);
	if (!match) return undefined;
	const caption = stripTags(match[1] ?? "");
	return caption || undefined;
}

function extractSvgMarkup(text: string): string | null {
	const match = text.match(/<svg\b[\s\S]*?<\/svg\s*>/i);
	if (!match) return null;
	let markup = match[0]!;
	markup = markup
		.replace(/<script\b[\s\S]*?<\/script>/gi, "")
		.replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
	if (!/\sxmlns\s*=/i.test(markup)) {
		markup = markup.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	return markup;
}

function parseSvgHtmlBlock(html: string): { markup: string; caption?: string } | null {
	const markup = extractSvgMarkup(html);
	if (!markup) return null;
	return { markup, caption: extractFigcaption(html) };
}

function isSvgFenceLang(lang: string): boolean {
	const value = lang.trim().toLowerCase();
	return value === "svg" || value === "xml" || value.startsWith("svg ");
}

export function svgMarkupToDataUrl(markup: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export function safeHref(href: string): string | null {
	const value = href.trim();
	if (!value) return null;
	if (/^(https?:|mailto:)/i.test(value)) return value;
	if (value.startsWith("#")) return value;
	if (value.startsWith("/") && !value.startsWith("//")) return value;
	return null;
}

function findClosing(text: string, from: number, end: number, delim: string): number {
	let index = from;
	while (index < end) {
		const found = text.indexOf(delim, index);
		if (found < 0 || found >= end) return -1;
		if (text[found - 1] !== "\\") return found;
		index = found + delim.length;
	}
	return -1;
}

function parseLinkLike(
	text: string,
	start: number,
	end: number,
	image: boolean,
): { node: InlineNode; next: number } | null {
	const open = image ? start + 2 : start + 1;
	if (image && !text.startsWith("![", start)) return null;
	if (!image && text[start] !== "[") return null;

	const closeLabel = findClosing(text, open, end, "]");
	if (closeLabel < 0 || text[closeLabel + 1] !== "(") return null;
	const closeUrl = findClosing(text, closeLabel + 2, end, ")");
	if (closeUrl < 0) return null;

	const label = text.slice(open, closeLabel);
	const href = safeHref(text.slice(closeLabel + 2, closeUrl));
	const next = closeUrl + 1;
	if (!href) {
		return {
			node: { type: "text", text: text.slice(start, next) },
			next,
		};
	}
	if (image) {
		return { node: { type: "image", src: href, alt: label }, next };
	}
	return {
		node: { type: "link", href, children: parseInline(label) },
		next,
	};
}

export function parseInline(text: string): InlineNode[] {
	const nodes: InlineNode[] = [];
	const end = text.length;
	let index = 0;
	let buffer = "";

	const flush = () => {
		if (!buffer) return;
		nodes.push({ type: "text", text: buffer });
		buffer = "";
	};

	while (index < end) {
		if (text[index] === "\n") {
			flush();
			nodes.push({ type: "break" });
			index += 1;
			continue;
		}

		if (text[index] === "`") {
			const close = findClosing(text, index + 1, end, "`");
			if (close >= 0) {
				flush();
				nodes.push({ type: "code", text: text.slice(index + 1, close) });
				index = close + 1;
				continue;
			}
		}

		if (text.startsWith("![", index)) {
			const parsed = parseLinkLike(text, index, end, true);
			if (parsed) {
				flush();
				nodes.push(parsed.node);
				index = parsed.next;
				continue;
			}
		}

		if (text[index] === "[") {
			const parsed = parseLinkLike(text, index, end, false);
			if (parsed) {
				flush();
				nodes.push(parsed.node);
				index = parsed.next;
				continue;
			}
		}

		if (text.startsWith("**", index) || text.startsWith("__", index)) {
			const delim = text.slice(index, index + 2);
			const close = findClosing(text, index + 2, end, delim);
			if (close >= 0) {
				flush();
				nodes.push({
					type: "strong",
					children: parseInline(text.slice(index + 2, close)),
				});
				index = close + 2;
				continue;
			}
		}

		if (text[index] === "*" || text[index] === "_") {
			const delim = text[index]!;
			const close = findClosing(text, index + 1, end, delim);
			if (close >= 0) {
				flush();
				nodes.push({
					type: "em",
					children: parseInline(text.slice(index + 1, close)),
				});
				index = close + 1;
				continue;
			}
		}

		buffer += text[index];
		index += 1;
	}

	flush();
	return nodes;
}

function joinWrappedLines(lines: string[]): string {
	let result = "";
	let previousHard = false;
	for (const line of lines) {
		const hard = / {2}$/.test(line);
		const content = line.replace(/ {2}$/, "");
		if (result) result += previousHard ? "\n" : " ";
		result += content;
		previousHard = hard;
	}
	return result;
}

function isBlank(line: string) {
	return !line.trim();
}

function startsNewBlock(line: string) {
	const trimmed = line.trim();
	if (!trimmed) return true;
	if (trimmed.startsWith("|")) return true;
	if (headingMatch(line)) return true;
	if (isHr(line)) return true;
	if (fenceLang(line) !== null) return true;
	if (htmlBlockOpen(line)) return true;
	if (quoteText(line) !== null) return true;
	const ul = unorderedItem(line);
	if (ul && ul.indent === 0) return true;
	const ol = orderedItem(line);
	if (ol && ol.indent === 0) return true;
	return false;
}

function consumeContinuations(lines: string[], start: number): { text: string; next: number } {
	const first = lines[start] ?? "";
	const chunks = [first.replace(/^(\s*)([-*+]|\d+\.)\s+/, "")];
	let index = start + 1;
	while (index < lines.length) {
		const line = lines[index] ?? "";
		if (isBlank(line)) break;
		if (startsNewBlock(line)) break;
		if (/^\s{2,}\S/.test(line) || /^\t\S/.test(line)) {
			chunks.push(line.trim());
			index += 1;
			continue;
		}
		break;
	}
	return { text: joinWrappedLines(chunks), next: index };
}

export function parseMarkdownPreview(markdown: string): BlockNode[] {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const blocks: BlockNode[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index] ?? "";
		if (isBlank(line)) {
			index += 1;
			continue;
		}

		const fence = fenceLang(line);
		if (fence !== null) {
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && fenceLang(lines[index] ?? "") === null) {
				codeLines.push(lines[index] ?? "");
				index += 1;
			}
			if (index < lines.length) index += 1;
			const text = codeLines.join("\n");
			const svg = isSvgFenceLang(fence) ? parseSvgHtmlBlock(text) : null;
			if (svg) {
				blocks.push({ type: "svg", markup: svg.markup, caption: svg.caption });
			} else {
				blocks.push({ type: "code", text });
			}
			continue;
		}

		const htmlTag = htmlBlockOpen(line);
		if (htmlTag) {
			const consumed = consumeHtmlElement(lines, index, htmlTag);
			const svg = consumed ? parseSvgHtmlBlock(consumed.html) : null;
			if (consumed && svg) {
				blocks.push({ type: "svg", markup: svg.markup, caption: svg.caption });
				index = consumed.next;
				continue;
			}
		}

		if (isHr(line)) {
			blocks.push({ type: "hr" });
			index += 1;
			continue;
		}

		const heading = headingMatch(line);
		if (heading) {
			blocks.push({
				type: "heading",
				level: heading.level,
				children: parseInline(heading.text),
			});
			index += 1;
			continue;
		}

		if (line.trimStart().startsWith("|")) {
			const tableLines: string[] = [];
			while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
				tableLines.push((lines[index] ?? "").trim());
				index += 1;
			}
			if (tableLines.length >= 2 && isSeparatorRow(tableLines[1] ?? "")) {
				blocks.push({
					type: "table",
					headers: splitCells(tableLines[0] ?? "").map(parseInline),
					rows: tableLines.slice(2).map((row) => splitCells(row).map(parseInline)),
				});
			} else {
				for (const tableLine of tableLines) {
					blocks.push({ type: "paragraph", children: parseInline(tableLine) });
				}
			}
			continue;
		}

		if (quoteText(line) !== null) {
			const quoteLines: string[] = [];
			while (index < lines.length) {
				const quoted = quoteText(lines[index] ?? "");
				if (quoted === null) break;
				quoteLines.push(quoted);
				index += 1;
			}
			blocks.push({
				type: "quote",
				children: parseInline(joinWrappedLines(quoteLines)),
			});
			continue;
		}

		const ul = unorderedItem(line);
		if (ul && ul.indent === 0) {
			const items: InlineNode[][] = [];
			while (index < lines.length) {
				const item = unorderedItem(lines[index] ?? "");
				if (!item || item.indent !== 0) break;
				const consumed = consumeContinuations(lines, index);
				items.push(parseInline(consumed.text));
				index = consumed.next;
			}
			blocks.push({ type: "list", ordered: false, items });
			continue;
		}

		const ol = orderedItem(line);
		if (ol && ol.indent === 0) {
			const items: InlineNode[][] = [];
			while (index < lines.length) {
				const item = orderedItem(lines[index] ?? "");
				if (!item || item.indent !== 0) break;
				const consumed = consumeContinuations(lines, index);
				items.push(parseInline(consumed.text));
				index = consumed.next;
			}
			blocks.push({ type: "list", ordered: true, items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (index < lines.length) {
			const current = lines[index] ?? "";
			if (isBlank(current)) break;
			if (paragraphLines.length > 0 && startsNewBlock(current)) break;
			paragraphLines.push(current.trimEnd());
			index += 1;
		}
		blocks.push({
			type: "paragraph",
			children: parseInline(joinWrappedLines(paragraphLines)),
		});
	}

	return blocks;
}

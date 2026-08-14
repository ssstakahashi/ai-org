import { truncateXPostText, X_POST_MAX_WEIGHT } from "@/lib/x-post-length";

export type ParsedXPostDraft = {
	title: string;
	body: string;
};

const PLACEHOLDER_LINE = /^[（(].*[）)]$/u;

function normalizeLine(line: string): string {
	return line.trim().replace(/^\*+|\*+$/g, "").trim();
}

function isTitleHeader(line: string): boolean {
	const normalized = normalizeLine(line);
	return (
		normalized === "タイトル" ||
		normalized === "タイトル:" ||
		normalized === "タイトル：" ||
		/^#{1,3}\s*タイトル[:：]?\s*$/u.test(normalized)
	);
}

function isBodyHeader(line: string): boolean {
	const normalized = normalizeLine(line);
	return (
		normalized === "投稿文" ||
		normalized === "投稿文:" ||
		normalized === "投稿文：" ||
		normalized === "本文" ||
		normalized === "本文:" ||
		normalized === "本文：" ||
		/^#{1,3}\s*投稿文[:：]?\s*$/u.test(normalized) ||
		/^#{1,3}\s*本文[:：]?\s*$/u.test(normalized)
	);
}

function inlineValue(line: string, label: "タイトル" | "投稿文" | "本文"): string | null {
	const match = line.trim().match(new RegExp(`^\\*{0,2}${label}\\*{0,2}[:：]\\s*(.+)$`, "u"));
	return match?.[1]?.trim() ?? null;
}

function isSkippableLine(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed) return true;
	if (PLACEHOLDER_LINE.test(trimmed)) return true;
	if (/^ここは.+$/u.test(trimmed)) return true;
	if (/^（Xに投稿する本文/u.test(trimmed)) return true;
	if (/^（管理用/u.test(trimmed)) return true;
	return false;
}

function nextContentLine(lines: string[], startIndex: number): { value: string; nextIndex: number } {
	let index = startIndex;
	while (index < lines.length) {
		const line = lines[index];
		if (isTitleHeader(line) || isBodyHeader(line)) {
			return { value: "", nextIndex: index };
		}
		if (!isSkippableLine(line)) {
			return { value: line.trim(), nextIndex: index + 1 };
		}
		index += 1;
	}
	return { value: "", nextIndex: index };
}

function cleanField(text: string): string {
	return text.replace(/^["「『]|["」』]$/g, "").trim();
}

/** **タイトル** の次の1行 → タイトル、**投稿文** の次の行以降 → 投稿文 */
export function parseGeneratedPost(raw: string): ParsedXPostDraft {
	const lines = raw.split(/\r?\n/);
	let title = "";
	let body = "";
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (isTitleHeader(line)) {
			const inline = inlineValue(line, "タイトル");
			if (inline && !isSkippableLine(inline)) {
				title = inline;
				index += 1;
				continue;
			}
			index += 1;
			const next = nextContentLine(lines, index);
			title = next.value;
			index = next.nextIndex;
			continue;
		}

		if (isBodyHeader(line)) {
			const inline = inlineValue(line, "投稿文") ?? inlineValue(line, "本文");
			index += 1;
			const bodyLines: string[] = [];
			if (inline && !isSkippableLine(inline)) {
				bodyLines.push(inline);
			}
			while (index < lines.length) {
				if (isTitleHeader(lines[index]) || isBodyHeader(lines[index])) {
					break;
				}
				if (!isSkippableLine(lines[index])) {
					bodyLines.push(lines[index]);
				}
				index += 1;
			}
			body = bodyLines.join("\n").trim();
			continue;
		}

		index += 1;
	}

	// フォールバック: タイトル:/投稿文: 形式
	if (!title || !body) {
		const titleInline = raw.match(/^タイトル[:：]\s*(.+)$/m);
		const bodyInline = raw.match(/^投稿文[:：]\s*([\s\S]+)$/m) ?? raw.match(/^本文[:：]\s*([\s\S]+)$/m);
		if (!title && titleInline?.[1]) title = titleInline[1].trim();
		if (!body && bodyInline?.[1]) body = bodyInline[1].trim();
	}

	title = cleanField(title);
	body = cleanField(body);

	return {
		title: truncateXPostText(title, 60),
		body: truncateXPostText(body, X_POST_MAX_WEIGHT),
	};
}

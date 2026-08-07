export type MarkdownTable = {
	headers: string[];
	rows: string[][];
};

export type AuthorityEditableSection = "terms" | "matrix";

export const AUTHORITY_SECTION_HEADING: Record<AuthorityEditableSection, string> = {
	terms: "用語定義",
	matrix: "職位別権限マトリクス",
};

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

function formatTable(table: MarkdownTable): string {
	const headers = table.headers.map((cell) => cell.trim());
	const rows = table.rows.map((row) =>
		headers.map((_, index) => String(row[index] ?? "").trim()),
	);
	const sep = headers.map(() => "------");
	const lines = [
		`| ${headers.join(" | ")} |`,
		`| ${sep.join(" | ")} |`,
		...rows.map((row) => `| ${row.join(" | ")} |`),
	];
	return lines.join("\n");
}

export function extractSectionTable(
	markdown: string,
	sectionHeading: string,
): MarkdownTable | null {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const heading = `## ${sectionHeading}`;
	const start = lines.findIndex((line) => line.trim() === heading);
	if (start < 0) return null;

	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if ((lines[index] ?? "").trim().startsWith("## ")) {
			end = index;
			break;
		}
	}

	for (let index = start + 1; index < end; index += 1) {
		const line = (lines[index] ?? "").trim();
		if (!line.startsWith("|")) continue;

		const tableLines: string[] = [];
		let cursor = index;
		while (cursor < end && (lines[cursor] ?? "").trim().startsWith("|")) {
			tableLines.push((lines[cursor] ?? "").trim());
			cursor += 1;
		}
		if (tableLines.length >= 2 && isSeparatorRow(tableLines[1] ?? "")) {
			return {
				headers: splitCells(tableLines[0] ?? ""),
				rows: tableLines.slice(2).map(splitCells),
			};
		}
	}

	return null;
}

export function replaceSectionTable(
	markdown: string,
	sectionHeading: string,
	table: MarkdownTable,
): string {
	const normalized = markdown.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	const heading = `## ${sectionHeading}`;
	const start = lines.findIndex((line) => line.trim() === heading);
	if (start < 0) {
		throw new Error(`見出し「${sectionHeading}」が見つかりません`);
	}

	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if ((lines[index] ?? "").trim().startsWith("## ")) {
			end = index;
			break;
		}
	}

	let tableStart = -1;
	let tableEnd = -1;
	for (let index = start + 1; index < end; index += 1) {
		if (!(lines[index] ?? "").trim().startsWith("|")) continue;
		tableStart = index;
		tableEnd = index;
		while (tableEnd < end && (lines[tableEnd] ?? "").trim().startsWith("|")) {
			tableEnd += 1;
		}
		break;
	}

	const formatted = formatTable(table).split("\n");
	if (tableStart < 0) {
		const insertAt = end;
		const next = [
			...lines.slice(0, insertAt),
			"",
			...formatted,
			"",
			...lines.slice(insertAt),
		];
		return next.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
	}

	const next = [
		...lines.slice(0, tableStart),
		...formatted,
		...lines.slice(tableEnd),
	];
	return next.join("\n");
}

type Block =
	| { type: "heading"; level: 1 | 2; text: string }
	| { type: "quote"; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; items: string[] }
	| { type: "table"; headers: string[]; rows: string[][] };

export function parseMarkdownBlocks(markdown: string): Block[] {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const blocks: Block[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index] ?? "";
		const trimmed = line.trim();

		if (!trimmed) {
			index += 1;
			continue;
		}

		if (trimmed.startsWith("|")) {
			const tableLines: string[] = [];
			while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
				tableLines.push((lines[index] ?? "").trim());
				index += 1;
			}
			if (tableLines.length >= 2 && isSeparatorRow(tableLines[1] ?? "")) {
				const headers = splitCells(tableLines[0] ?? "");
				const rows = tableLines.slice(2).map(splitCells);
				blocks.push({ type: "table", headers, rows });
			} else {
				for (const tableLine of tableLines) {
					blocks.push({ type: "paragraph", text: tableLine });
				}
			}
			continue;
		}

		if (trimmed.startsWith("## ")) {
			blocks.push({ type: "heading", level: 2, text: trimmed.slice(3).trim() });
			index += 1;
			continue;
		}

		if (trimmed.startsWith("# ")) {
			blocks.push({ type: "heading", level: 1, text: trimmed.slice(2).trim() });
			index += 1;
			continue;
		}

		if (trimmed.startsWith("> ")) {
			blocks.push({ type: "quote", text: trimmed.slice(2).trim() });
			index += 1;
			continue;
		}

		if (trimmed.startsWith("- ")) {
			const items: string[] = [];
			while (index < lines.length && (lines[index] ?? "").trim().startsWith("- ")) {
				items.push((lines[index] ?? "").trim().slice(2).trim());
				index += 1;
			}
			blocks.push({ type: "list", items });
			continue;
		}

		blocks.push({ type: "paragraph", text: trimmed });
		index += 1;
	}

	return blocks;
}

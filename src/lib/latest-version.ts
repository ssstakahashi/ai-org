import fs from "node:fs";
import path from "node:path";

/**
 * docs/VERSION.md から最新のバージョンエントリを取得する。
 * 形式: "## バージョン (日付)" で始まる最初のセクションとその箇条書きを返す。
 */
export function getLatestVersionEntry(): {
	version: string;
	date: string;
	changes: string[];
} | null {
	try {
		const versionPath = path.join(process.cwd(), "docs", "VERSION.md");
		const content = fs.readFileSync(versionPath, "utf-8");
		const lines = content.split("\n");

		let version = "";
		let date = "";
		const changes: string[] = [];
		let inLatestSection = false;

		for (const line of lines) {
			// 最初の ## 見出しを探す
			const match = line.match(/^##\s+([\d.]+)\s+\(([^)]+)\)/);
			if (match && !inLatestSection) {
				version = match[1];
				date = match[2];
				inLatestSection = true;
				continue;
			}

			// 次の ## 見出しが来たら終了
			if (inLatestSection && line.startsWith("## ")) {
				break;
			}

			// 箇条書きを収集
			if (inLatestSection && line.trim().startsWith("-")) {
				changes.push(line.trim().substring(1).trim());
			}
		}

		if (version && date) {
			return { version, date, changes };
		}

		return null;
	} catch (error) {
		console.error("Failed to read VERSION.md:", error);
		return null;
	}
}

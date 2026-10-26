import { existsSync, readFileSync } from "node:fs";

export function loadEnvFiles(paths) {
	for (const file of paths) {
		if (!file || !existsSync(file)) continue;
		for (const rawLine of readFileSync(file, "utf8").split("\n")) {
			const line = rawLine.trim();
			if (!line || line.startsWith("#")) continue;
			const eq = line.indexOf("=");
			if (eq <= 0) continue;
			const key = line.slice(0, eq).trim();
			let value = line.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (process.env[key] === undefined) process.env[key] = value;
		}
	}
}

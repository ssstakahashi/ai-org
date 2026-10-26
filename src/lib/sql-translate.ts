/** SQLite 方言のうち、アプリの SQL が実際に使っているものだけを PostgreSQL に寄せる。 */

function replacePlaceholders(sql: string): string {
	let out = "";
	let index = 0;
	let inSingle = false;
	let inDouble = false;

	for (let i = 0; i < sql.length; i += 1) {
		const char = sql[i];
		if (char === "'" && !inDouble) {
			if (inSingle && sql[i + 1] === "'") {
				out += "''";
				i += 1;
				continue;
			}
			inSingle = !inSingle;
			out += char;
			continue;
		}
		if (char === '"' && !inSingle) {
			inDouble = !inDouble;
			out += char;
			continue;
		}
		if (char === "?" && !inSingle && !inDouble) {
			index += 1;
			out += `$${index}`;
			continue;
		}
		out += char;
	}

	return out;
}

export function translateSql(sql: string): string {
	const insertOrIgnore = /\bINSERT\s+OR\s+IGNORE\b/i.test(sql);
	let out = sql.replace(/datetime\s*\(\s*'now'\s*\)/gi, "app_now()");
	out = out.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, "INSERT INTO");
	out = replacePlaceholders(out);
	if (insertOrIgnore && !/\bON\s+CONFLICT\b/i.test(out)) {
		out = out.replace(/\s*;?\s*$/, " ON CONFLICT DO NOTHING");
	}
	return out;
}

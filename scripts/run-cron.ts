import { existsSync, readFileSync } from "node:fs";
import { runBlogStatusReconcile } from "../src/lib/blog-status-reconcile";
import { runGoogleTasksCron, runXDueCron } from "../src/lib/scheduled-jobs";

function loadEnvFile(file: string) {
	if (!existsSync(file)) return;
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

loadEnvFile(".env");
loadEnvFile("/etc/ai-org.env");

async function main() {
	const job = process.argv[2];
	if (job === "google-tasks") {
		await runGoogleTasksCron();
	} else if (job === "x-due") {
		await runXDueCron();
	} else if (job === "blog-reconcile") {
		await runBlogStatusReconcile();
	} else {
		console.error("usage: tsx scripts/run-cron.ts <google-tasks|x-due|blog-reconcile>");
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

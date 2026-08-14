import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { getDeploymentId } from "@opennextjs/cloudflare";

// /Users/user/package.json があると Turbopack がホームをルートと誤認するため固定する
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function getPackageVersion(): string {
	try {
		const pkg = JSON.parse(
			readFileSync(path.join(projectRoot, "package.json"), "utf8"),
		) as { version?: string };
		return pkg.version ?? "unknown";
	} catch {
		return "unknown";
	}
}

/** git タグ（v0.0.1 → 0.0.1）を優先し、未タグ時は package.json の version */
function getAppVersion(): string {
	try {
		const tag = execSync("git describe --tags --abbrev=0", {
			cwd: projectRoot,
			encoding: "utf8",
		}).trim();
		if (tag) {
			return tag.replace(/^v/, "");
		}
	} catch {
		// タグ未設定
	}
	return getPackageVersion();
}

if (process.env.NODE_ENV === "production" && !process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
	throw new Error(
		"[ai-org] NEXT_SERVER_ACTIONS_ENCRYPTION_KEY が未設定です。README のデプロイ手順を参照してください。",
	);
}

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_APP_VERSION: getAppVersion(),
	},
	deploymentId: getDeploymentId(),
	turbopack: {
		root: projectRoot,
	},
	// Network URL（127.0.2.2）経由の HMR / 静的アセットを許可
	allowedDevOrigins: ["127.0.2.2"],
	experimental: {
		// 画像付き Server Action（デフォルト 1MB だと本番で 500 になる）
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
if (process.env.NODE_ENV === "development") {
	initOpenNextCloudflareForDev();
}

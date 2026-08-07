import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { getDeploymentId } from "@opennextjs/cloudflare";

function getGitVersionName(): string {
	try {
		return execSync("git describe --tags --always --dirty", {
			encoding: "utf8",
		}).trim();
	} catch {
		return "unknown";
	}
}

// /Users/user/package.json があると Turbopack がホームをルートと誤認するため固定する
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === "production" && !process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
	console.warn(
		"[ai-org] NEXT_SERVER_ACTIONS_ENCRYPTION_KEY が未設定です。" +
			"デプロイごとに Server Action ID が変わり、開きっぱなしのタブでエラーになりやすくなります。" +
			"本番ビルド前に固定キーを設定してください（README 参照）。",
	);
}

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_APP_VERSION: getGitVersionName(),
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
initOpenNextCloudflareForDev();

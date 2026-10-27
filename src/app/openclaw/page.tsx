import { AppHeader } from "@/components/AppHeader";
import { getAppEnv } from "@/lib/app-env";
import { getOpenClawControlUiUrl } from "@/lib/openclaw";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OpenClawPage() {
	const url = getOpenClawControlUiUrl(getAppEnv());
	if (url) {
		redirect(url);
	}

	return (
		<main className="page">
			<AppHeader
				title="OpenClaw"
				lede="別 PC 上の OpenClaw Control UI へ遷移します。URL は環境変数で指定します。"
			/>

			<section className="panel">
				<h2>未設定です</h2>
				<p style={{ margin: 0, fontSize: "0.9rem" }}>
					<code>OPENCLAW_CONTROL_UI_URL</code> に、OpenClaw PC 側で Cloudflare Tunnel（＋必要なら
					Access）で公開した Control UI の URL を設定してください（例:{" "}
					<code>https://openclaw.example.net</code>）。
				</p>
				<p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
					ローカルだけで試す場合は Mac から <code>ssh -L 18789:127.0.0.1:18789</code>{" "}
					でフォワードし、<code>http://127.0.0.1:18789</code> を指定できます（ai-org
					サーバからは届きません）。
				</p>
			</section>
		</main>
	);
}

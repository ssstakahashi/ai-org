import { AppHeader } from "@/components/AppHeader";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { apiRulesSpecPayload, readApiRulesMarkdown, resolveApiV1BaseUrl } from "@/lib/api-rules-doc";
import { getAppEnv } from "@/lib/app-env";

export const dynamic = "force-dynamic";

export default function ApiRulesPage() {
	const markdown = readApiRulesMarkdown();
	const base = resolveApiV1BaseUrl(getAppEnv().APP_PUBLIC_URL);
	const spec = apiRulesSpecPayload(markdown);

	return (
		<main className="page page-wide">
			<AppHeader
				title="API ルール"
				lede="自動処理ボット向けの HTTP API 仕様。内容は docs/api-rules.md と同期しています。"
			/>

			<section className="panel">
				<h2>ボットから取得する</h2>
				<p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
					<code>X-API-Key</code>（<code>reader</code> 以上）で{" "}
					<code>GET {base}/spec</code>。JSON 既定。Markdown 本文のみは{" "}
					<code>Accept: text/markdown</code>。
				</p>
				<ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
					<li>
						UI パス: <code>{spec.ui_path}</code>
					</li>
					<li>
						正本ファイル: <code>{spec.source}</code>
					</li>
				</ul>
			</section>

			<section className="panel">
				<MarkdownPreview markdown={markdown} />
			</section>
		</main>
	);
}

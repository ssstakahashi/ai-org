/**
 * Cloudflare Workers へのホスティングは本番手順から外した。
 * 定期実行は scripts/run-cron.ts（systemd timer）。
 * D1 / R2 の一回きりの取り出しにだけ Wrangler を使う。
 */
export default {
	async fetch(): Promise<Response> {
		return new Response("ai-org は Ubuntu 上の next start で配信します。", {
			status: 410,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	},
};

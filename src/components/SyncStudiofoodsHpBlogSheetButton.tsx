"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncStudiofoodsHpBlogFromSheet } from "@/app/actions";

/**
 * @automation
 * id: blog-hp-sheet-sync-ui
 * name: スタジオフーズHPブログをスプレッドシートと同期
 * runner: manual
 * status: manual
 * trigger: ブログ下書き画面のボタン
 * summary: スタジオフーズHPの下書きを指定スプレッドシートと双方向同期する。
 * location: SyncStudiofoodsHpBlogSheetButton → syncStudiofoodsHpBlogFromSheet
 * href: /blog-drafts
 */
export function SyncStudiofoodsHpBlogSheetButton() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);

	return (
		<div className="run-due">
			<button
				type="button"
				disabled={pending}
				onClick={() => {
					setMessage(null);
					startTransition(async () => {
						try {
							const result = await syncStudiofoodsHpBlogFromSheet();
							if (result.fatalError) {
								setMessage(result.fatalError);
								return;
							}
							setMessage(
								`同期: シート${result.pulled}件 / 追加${result.createdLocal} / 更新${result.updatedLocal}` +
									(result.deletedLocal > 0 ? ` / 削除${result.deletedLocal}` : "") +
									(result.createdSheet > 0
										? ` / シートへID付与${result.createdSheet}`
										: ""),
							);
							router.refresh();
						} catch (error) {
							setMessage(error instanceof Error ? error.message : String(error));
						}
					});
				}}
			>
				{pending ? "同期中…" : "スプレッドシートと同期"}
			</button>
			{message ? <p className="run-due-message">{message}</p> : null}
		</div>
	);
}

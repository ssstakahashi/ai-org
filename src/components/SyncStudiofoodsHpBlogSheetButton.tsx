"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncBlogDestinationFromSheet } from "@/app/actions";
import type { BlogPostDestination } from "@/lib/types";

function SyncBlogSheetButton({ destination }: { destination: BlogPostDestination }) {
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
							const result = await syncBlogDestinationFromSheet(destination);
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

/**
 * @automation
 * id: blog-hp-sheet-sync-ui
 * name: スタジオフーズHPブログをスプレッドシートと同期
 * runner: manual
 * status: manual
 * trigger: ブログ下書き画面のボタン
 * summary: スタジオフーズHPの下書きを指定スプレッドシートと双方向同期する。
 * location: SyncStudiofoodsHpBlogSheetButton → syncBlogDestinationFromSheet
 * href: /blog-drafts
 */
export function SyncStudiofoodsHpBlogSheetButton() {
	return <SyncBlogSheetButton destination="studiofoods_hp" />;
}

/**
 * @automation
 * id: blog-agri-lp-sheet-sync-ui
 * name: 農業日誌アプリLPブログをスプレッドシートと同期
 * runner: manual
 * status: manual
 * trigger: ブログ下書き画面のボタン
 * summary: 農業日誌アプリLPの下書きを指定スプレッドシートと双方向同期する。
 * location: SyncAgriLpBlogSheetButton → syncBlogDestinationFromSheet
 * href: /blog-drafts
 */
export function SyncAgriLpBlogSheetButton() {
	return <SyncBlogSheetButton destination="agri_lp" />;
}

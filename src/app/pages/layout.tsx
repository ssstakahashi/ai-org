import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { PagesTabs } from "@/components/PagesTabs";

export default function PagesLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<main className="page page-wide">
			<AppHeader
				title="ページ管理"
				lede="アプリ内ページをカテゴリ・タグで分類し、タグ別に一覧できます。カテゴリとタグはマスタとして共通利用されます。"
			/>
			<PagesTabs />
			{children}
		</main>
	);
}

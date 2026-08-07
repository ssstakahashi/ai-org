import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppsTabs } from "@/components/AppsTabs";

export default function AppsLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<main className="page page-wide">
			<AppHeader
				title="App管理"
				lede="アプリケーションの構成・デプロイ先と、グループ・名称・AppType マスタを管理します。"
			/>
			<AppsTabs />
			{children}
		</main>
	);
}

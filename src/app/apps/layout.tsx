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
				lede="リストの構成・デプロイ先と、AppGroup・App・AppType マスタを管理します。"
			/>
			<AppsTabs />
			{children}
		</main>
	);
}

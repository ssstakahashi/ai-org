import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { OrgRulesTabs } from "@/components/OrgRulesTabs";

export default function OrgRulesLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<main className="page page-wide">
			<AppHeader
				title="組織ルール"
				lede="AI組織のルールと職務権限を管理・確認します。"
			/>
			<OrgRulesTabs />
			{children}
		</main>
	);
}

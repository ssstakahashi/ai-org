import { AppHeader } from "@/components/AppHeader";
import { AccountingManualToc } from "@/components/AccountingManualToc";

export const dynamic = "force-dynamic";

export default function AccountingManualPage() {
	return (
		<main className="page page-wide">
			<AppHeader
				title="会計マニュアル"
				lede="法人税の決算・申告業務の手順です。まずは目次から該当項目を確認できます。"
			/>
			<AccountingManualToc />
		</main>
	);
}

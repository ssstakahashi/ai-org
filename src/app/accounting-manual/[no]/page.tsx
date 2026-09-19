import { notFound } from "next/navigation";
import { AccountingManualEntry } from "@/components/AccountingManualEntry";
import {
	getAccountingManualEntry,
	parseAccountingManualNo,
} from "@/lib/accounting-manual";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ no: string }>;
};

export default async function AccountingManualEntryPage({ params }: Props) {
	const { no: raw } = await params;
	const no = parseAccountingManualNo(raw);
	const entry = no === null ? null : getAccountingManualEntry(no);
	if (!entry) {
		notFound();
	}

	return <AccountingManualEntry entry={entry} />;
}

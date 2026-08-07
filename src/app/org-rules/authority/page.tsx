import { getOrgRule } from "@/app/actions";
import {
	AuthorityEmptyPanel,
	AuthorityMatrixPanel,
} from "@/components/AuthorityMatrixPanel";
import { AUTHORITY_ORG_RULE_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrgRulesAuthorityPage() {
	const rule = await getOrgRule(AUTHORITY_ORG_RULE_ID);

	if (!rule || rule.is_active !== 1) {
		return (
			<AuthorityEmptyPanel>
				職務権限表が未登録、または無効です。ルール一覧から追加してください。
			</AuthorityEmptyPanel>
		);
	}

	return <AuthorityMatrixPanel rule={rule} />;
}

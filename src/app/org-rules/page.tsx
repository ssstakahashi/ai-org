import { listOrgRules } from "@/app/actions";
import { OrgRulesManager } from "@/components/OrgRulesManager";
import { AUTHORITY_ORG_RULE_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrgRulesPage() {
	const rules = (await listOrgRules()).filter(
		(rule) => rule.id !== AUTHORITY_ORG_RULE_ID,
	);

	return <OrgRulesManager rules={rules} />;
}

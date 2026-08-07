import { listEmployees } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { EmployeeManager } from "@/components/EmployeeManager";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
	const employees = await listEmployees();

	return (
		<main className="page">
			<AppHeader
				title="従業員"
				lede="AI従業員（エージェント）の追加・編集・削除を行います。"
			/>
			<EmployeeManager employees={employees} />
		</main>
	);
}

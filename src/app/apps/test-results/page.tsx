import {
	listAppNames,
	listAppTestPlans,
	listAppTestResults,
} from "@/app/actions";
import { AppTestResultsManager } from "@/components/AppTestResultsManager";

export const dynamic = "force-dynamic";

export default async function AppTestResultsPage() {
	const [appNames, testPlans, testResults] = await Promise.all([
		listAppNames(),
		listAppTestPlans(),
		listAppTestResults(),
	]);

	return (
		<AppTestResultsManager
			appNames={appNames}
			testPlans={testPlans}
			testResults={testResults}
		/>
	);
}

export type GoogleTasksSyncCounts = {
	skipped?: boolean;
	reason?: string;
	pulled: number;
	createdLocal: number;
	updatedLocal: number;
	deletedLocal: number;
	createdGoogle: number;
	updatedGoogle: number;
	deletedGoogle: number;
	deferredGoogle: number;
	errors: string[];
	fatalError?: string;
};

export type GoogleTasksLastRun = {
	automationId: string;
	ok: boolean;
	finishedAt: string;
	error: string | null;
	counts: Omit<
		GoogleTasksSyncCounts,
		"skipped" | "reason" | "errors" | "fatalError"
	> | null;
};

export function formatGoogleTasksSyncResult(result: GoogleTasksSyncCounts): string {
	if (result.fatalError) return `失敗: ${result.fatalError}`;
	if (result.skipped) return result.reason || "同期をスキップしました";

	const parts = [
		`Googleから${result.pulled}件取得`,
		`台帳へ 新規${result.createdLocal} / 更新${result.updatedLocal} / 削除${result.deletedLocal}`,
		`Googleへ 新規${result.createdGoogle} / 更新${result.updatedGoogle} / 削除${result.deletedGoogle}`,
	];
	if (result.deferredGoogle > 0) {
		parts.push(`残り${result.deferredGoogle}件は次回に送ります`);
	}
	if (result.errors.length > 0) {
		parts.push(`失敗${result.errors.length}件: ${result.errors[0]}`);
	} else if (
		result.createdLocal +
			result.updatedLocal +
			result.deletedLocal +
			result.createdGoogle +
			result.updatedGoogle +
			result.deletedGoogle +
			result.deferredGoogle ===
		0
	) {
		parts.push("差分なし（Google Tasks のリスト「ai-org」を確認）");
	}
	return parts.join("。");
}

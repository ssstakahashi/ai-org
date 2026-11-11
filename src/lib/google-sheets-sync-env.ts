/** ブログ・Spark 等の Google スプレッドシート同期用の環境変数 */
export type SheetsSyncEnv = {
	GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
	GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
	APP_PUBLIC_URL?: string;
};

export function isSheetsSyncConfigured(env: SheetsSyncEnv): boolean {
	return Boolean(
		env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
			env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
	);
}

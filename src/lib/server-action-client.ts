/** デプロイ後にクライアント JS と Worker の Server Action ID がずれたときのエラー */
export function isStaleServerActionError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("Failed to find Server Action") ||
		message.includes("was not found on the server")
	);
}

export const STALE_SERVER_ACTION_MESSAGE =
	"アプリが更新されました。ページを再読み込みしてから、もう一度お試しください。";

/** 古い Server Action ID を検知したら再読み込みして新しい JS を取得する */
export function recoverFromStaleServerAction(error: unknown): boolean {
	if (!isStaleServerActionError(error)) return false;
	window.location.reload();
	return true;
}

const ALLOWED_MEDIA_PREFIXES = ["x-posts/", "tasks/", "blog-posts/"] as const;

function asUploadFile(value: FormDataEntryValue | null): File | null {
	if (!value || typeof value === "string") return null;
	const file = value as File;
	const size = Number(file.size ?? 0);
	if (!Number.isFinite(size) || size <= 0) return null;
	return file;
}

/** FormData からアップロード画像を取り出す */
export function getUploadFile(formData: FormData, key: string): File | null {
	return asUploadFile(formData.get(key));
}

/** FormData から複数のアップロード画像を取り出す */
export function getUploadFiles(formData: FormData, key: string): File[] {
	return formData.getAll(key).flatMap((value) => {
		const file = asUploadFile(value);
		return file ? [file] : [];
	});
}

/** 保存キーがブラウザ配信してよいプレフィックスか */
export function isAllowedMediaKey(key: string): boolean {
	if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
		return false;
	}
	return ALLOWED_MEDIA_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** 保存済みメディアのプレビュー用パス */
export function mediaUrl(key: string): string {
	return `/api/media/${key
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/")}`;
}

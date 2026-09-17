import { getMediaBucket } from "@/lib/db";

const ALLOWED_MEDIA_PREFIXES = ["x-posts/", "tasks/", "blog-posts/"] as const;

function asUploadFile(value: FormDataEntryValue | null): File | null {
	if (!value || typeof value === "string") return null;
	const file = value as File;
	const size = Number(file.size ?? 0);
	if (!Number.isFinite(size) || size <= 0) return null;
	return file;
}

/** FormData からアップロード画像を取り出す（Workers でも File/Blob 両対応） */
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

/** R2 キーがブラウザ配信してよいプレフィックスか */
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type MediaPrefix = "x-posts" | "tasks" | "blog-posts";

function webpObjectKey(prefix: MediaPrefix, file: File): string {
	const raw = String(file.name || "image").replace(/\.[^.]+$/, "");
	const safeName = raw.replace(/[^\w.\-]+/g, "_") || "image";
	return `${prefix}/${crypto.randomUUID()}-${safeName}.webp`;
}

async function putWebpImage(
	prefix: MediaPrefix,
	file: File,
): Promise<{ key: string } | { error: string }> {
	if (file.size > MAX_IMAGE_BYTES) {
		return { error: "画像は 8MB 以下にしてください" };
	}

	try {
		const media = await getMediaBucket();
		const key = webpObjectKey(prefix, file);
		// クライアント側で WebP 化した File をそのまま保存（Workers で arrayBuffer 化しない）
		await media.put(key, file, {
			httpMetadata: { contentType: "image/webp" },
		});
		return { key };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `画像の保存に失敗しました: ${message}` };
	}
}

export async function putXPostImage(file: File): Promise<{ key: string } | { error: string }> {
	return putWebpImage("x-posts", file);
}

export async function putTaskImage(file: File): Promise<{ key: string } | { error: string }> {
	return putWebpImage("tasks", file);
}

export async function putBlogPostImage(file: File): Promise<{ key: string } | { error: string }> {
	return putWebpImage("blog-posts", file);
}

/** 既存タスク画像を複製して新しい R2 キーを返す */
export async function copyTaskImage(
	sourceKey: string,
): Promise<{ key: string } | { error: string }> {
	if (!sourceKey.startsWith("tasks/") || !isAllowedMediaKey(sourceKey)) {
		return { error: "複製元の画像が不正です" };
	}

	try {
		const media = await getMediaBucket();
		const object = await media.get(sourceKey);
		if (!object) {
			return { error: "複製元の画像が見つかりません" };
		}

		const baseName = sourceKey.split("/").pop()?.replace(/\.webp$/i, "") ?? "image";
		const key = `tasks/${crypto.randomUUID()}-${baseName}.webp`;
		await media.put(key, object.body, {
			httpMetadata: object.httpMetadata ?? { contentType: "image/webp" },
		});
		return { key };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `画像の複製に失敗しました: ${message}` };
	}
}

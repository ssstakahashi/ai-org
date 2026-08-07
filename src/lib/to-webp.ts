/** ブラウザ上で画像を WebP に変換する（Workers では Canvas が使えないためクライアント側で実施） */

const WEBP_QUALITY = 0.85;

function baseName(filename: string): string {
	const trimmed = filename.trim() || "image";
	const withoutExt = trimmed.replace(/\.[^.]+$/, "");
	return withoutExt.replace(/[^\w.\-]+/g, "_") || "image";
}

/**
 * File / Blob を WebP の File に変換する。
 * 既に WebP の場合は拡張子・MIME を揃えてそのまま返す。
 */
export async function toWebpFile(file: File, quality = WEBP_QUALITY): Promise<File> {
	const name = `${baseName(file.name)}.webp`;

	if (file.type === "image/webp") {
		return new File([file], name, { type: "image/webp", lastModified: Date.now() });
	}

	const bitmap = await createImageBitmap(file);
	try {
		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Canvas が利用できません");
		}
		ctx.drawImage(bitmap, 0, 0);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/webp", quality);
		});
		if (!blob) {
			throw new Error("WebP への変換に失敗しました");
		}

		return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
	} finally {
		bitmap.close();
	}
}

/** file input の選択を WebP File で差し替える */
export function replaceInputFile(input: HTMLInputElement, file: File) {
	const transfer = new DataTransfer();
	transfer.items.add(file);
	input.files = transfer.files;
}

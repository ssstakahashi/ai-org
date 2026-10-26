import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export function mediaRoot(): string {
	const configured = process.env.MEDIA_ROOT?.trim();
	return path.resolve(configured || path.join(process.cwd(), "data", "media"));
}

function resolveKey(key: string): string {
	if (!key || key.includes("\0")) {
		throw new Error("invalid media key");
	}
	const root = mediaRoot();
	const full = path.resolve(root, key);
	const relative = path.relative(root, full);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new Error("invalid media key");
	}
	return full;
}

function metaPath(key: string): string {
	return path.join(mediaRoot(), ".meta", `${key}.content-type`);
}

function contentTypeFromName(key: string): string {
	if (key.toLowerCase().endsWith(".webp")) return "image/webp";
	return "application/octet-stream";
}

async function readContentType(key: string): Promise<string> {
	try {
		const stored = (await readFile(metaPath(key), "utf8")).trim();
		if (stored) return stored;
	} catch {
		// 未記録なら拡張子から決める
	}
	return contentTypeFromName(key);
}

async function toBuffer(
	value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
): Promise<Buffer> {
	if (typeof value === "string") return Buffer.from(value);
	if (value instanceof ArrayBuffer) return Buffer.from(value);
	if (ArrayBuffer.isView(value)) {
		return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
	}
	if (typeof Blob !== "undefined" && value instanceof Blob) {
		return Buffer.from(await value.arrayBuffer());
	}
	if (typeof (value as ReadableStream).getReader === "function") {
		const reader = (value as ReadableStream<Uint8Array>).getReader();
		const chunks: Buffer[] = [];
		while (true) {
			const { done, value: chunk } = await reader.read();
			if (done) break;
			if (chunk) chunks.push(Buffer.from(chunk));
		}
		return Buffer.concat(chunks);
	}
	throw new Error("対応していない画像データです");
}

class LocalMediaBucket implements R2Bucket {
	async get(key: string): Promise<R2ObjectBody | null> {
		const full = resolveKey(key);
		let size = 0;
		try {
			size = (await stat(full)).size;
		} catch {
			return null;
		}
		const contentType = await readContentType(key);
		const nodeStream = createReadStream(full);
		return {
			body: Readable.toWeb(nodeStream) as ReadableStream,
			size,
			httpMetadata: { contentType },
			async arrayBuffer() {
				const bytes = await readFile(full);
				return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
			},
		};
	}

	async put(
		key: string,
		value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
		options?: R2PutOptions,
	): Promise<void> {
		const full = resolveKey(key);
		const bytes = await toBuffer(value);
		await mkdir(path.dirname(full), { recursive: true });
		await writeFile(full, bytes);
		const contentType = options?.httpMetadata?.contentType?.trim();
		if (contentType) {
			const sidecar = metaPath(key);
			await mkdir(path.dirname(sidecar), { recursive: true });
			await writeFile(sidecar, contentType);
		}
	}

	async delete(key: string): Promise<void> {
		await rm(resolveKey(key), { force: true });
		await rm(metaPath(key), { force: true });
	}
}

let bucket: LocalMediaBucket | null = null;

export function getMediaBucket(): R2Bucket {
	if (!bucket) bucket = new LocalMediaBucket();
	return bucket;
}

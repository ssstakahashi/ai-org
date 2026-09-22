"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
	ideasFromCsv,
	isBlogIdeaMedium,
	setBlogIdeaUse,
	upsertBlogIdeaRows,
} from "@/lib/blog-ideas";
import { isBlogIdeasSheetKey } from "@/lib/bulletin-board";
import { parseBlogPostDestination } from "@/lib/blog-posts";
import { parseXPostDestination } from "@/lib/x-posts";

export type UploadBlogIdeasState = {
	error: string | null;
	ok: boolean;
	inserted: number;
	updated: number;
};

function revalidateIdeas() {
	revalidatePath("/blog-ideas");
}

export async function uploadBlogIdeasAction(
	_prev: UploadBlogIdeasState,
	formData: FormData,
): Promise<UploadBlogIdeasState> {
	const empty = { error: null, ok: false, inserted: 0, updated: 0 };
	const topic = String(formData.get("topic") ?? "");
	if (!isBlogIdeasSheetKey(topic)) {
		return { ...empty, error: "タブが不正です" };
	}
	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0) {
		return { ...empty, error: "CSV ファイルを選んでください" };
	}
	try {
		const csv = await file.text();
		const rows = ideasFromCsv(topic, csv);
		const db = await getDb();
		const result = await upsertBlogIdeaRows(db, topic, rows);
		revalidateIdeas();
		return { error: null, ok: true, ...result };
	} catch (error) {
		return {
			...empty,
			error: error instanceof Error ? error.message : "アップロードに失敗しました",
		};
	}
}

export async function setBlogIdeaUseAction(formData: FormData) {
	const ideaId = String(formData.get("idea_id") ?? "").trim();
	const medium = String(formData.get("medium") ?? "");
	const destination = String(formData.get("destination") ?? "");
	const enabled = String(formData.get("enabled") ?? "") === "1";
	if (!ideaId || !isBlogIdeaMedium(medium)) {
		throw new Error("転用先が不正です");
	}
	const parsed =
		medium === "blog"
			? parseBlogPostDestination(destination)
			: parseXPostDestination(destination);
	const db = await getDb();
	await setBlogIdeaUse(db, ideaId, medium, parsed, enabled);
	revalidateIdeas();
}

"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { markOpsAlertsRead } from "@/lib/ops-alerts";

export async function markBoardAlertsRead(): Promise<void> {
	const db = await getDb();
	await markOpsAlertsRead(db);
	revalidatePath("/board");
}

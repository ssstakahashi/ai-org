import { NextRequest } from "next/server";
import { handleApiV1 } from "@/lib/api-v1/dispatch";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ path?: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
	const { path } = await context.params;
	return handleApiV1(request, path ?? []);
}

export const GET = handle;
export const PUT = handle;
export const PATCH = handle;
export const POST = handle;
export const DELETE = handle;

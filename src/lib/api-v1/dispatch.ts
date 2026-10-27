import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { notifyOps } from "@/lib/ops-alerts";
import {
	ROLE_ADMIN,
	ROLE_PUBLISH,
	ROLE_READ,
	ROLE_REVIEW,
	ROLE_WRITE,
	authenticateApiKey,
	consumeRateLimit,
	roleAllowed,
} from "@/lib/api-v1/auth";
import {
	countBlogPosts,
	createPostComment,
	getBlogPostBySlug,
	listBlogHistory,
	listBlogPosts,
	listPostComments,
	patchBlogPostStatus,
	patchComment,
	putBlogPost,
	reportIngest,
} from "@/lib/api-v1/blog";
import { apiError, apiJson, errorResponse, parsePage, readJson, requestIdFrom } from "@/lib/api-v1/http";
import {
	countIdeas,
	countX,
	exportAll,
	listAppNames,
	listBoardLinks,
	listEmployees,
	listIdeas,
	listRequirements,
	listTasks,
	listTestPlans,
	listTestResults,
	listX,
	putAppNames,
	putBoardLink,
	putEmployees,
	putIdea,
	putRequirements,
	putTask,
	putTestPlans,
	putTestResult,
	deleteTestResult,
	putX,
} from "@/lib/api-v1/rest";
import { apiRulesSpecPayload, readApiRulesMarkdown } from "@/lib/api-rules-doc";
import { BlogRuleError, type ApiRole } from "@/lib/blog-post-rules";

function allow(role: ApiRole, accepted: readonly ApiRole[]) {
	if (!roleAllowed(role, accepted)) {
		throw new BlogRuleError(403, "forbidden", "この操作は許可されていません");
	}
}

export async function handleApiV1(request: NextRequest, path: string[]): Promise<Response> {
	const requestId = requestIdFrom(request.headers.get("x-request-id"));
	const actor = authenticateApiKey(request.headers.get("x-api-key"));
	if (!actor) {
		const db = await getDb().catch(() => null);
		if (db) {
			await notifyOps(db, {
				kind: "auth_error",
				message: "API キーが拒否されました",
				detail: { path: path.join("/") },
			});
		}
		return apiError(401, "unauthorized", "API キーが必要です", requestId);
	}
	if (!consumeRateLimit(actor.name)) {
		return apiError(429, "rate_limited", "しばらくしてから再試行してください", requestId);
	}

	const method = request.method.toUpperCase();
	const url = request.nextUrl;
	const key = `${method} ${path.join("/")}`;

	try {
		const db = await getDb();
		const denied = (accepted: readonly ApiRole[]) => allow(actor.role, accepted);

		if (key === "GET spec") {
			denied(ROLE_READ);
			const markdown = readApiRulesMarkdown();
			const accept = request.headers.get("accept") ?? "";
			if (accept.includes("text/markdown")) {
				return new Response(markdown, {
					status: 200,
					headers: {
						"Content-Type": "text/markdown; charset=utf-8",
						"X-Request-Id": requestId,
					},
				});
			}
			return apiJson(apiRulesSpecPayload(markdown), 200, requestId);
		}
		if (key === "GET blog-posts") {
			denied(ROLE_READ);
			return apiJson(await listBlogPosts(db, url, parsePage(url)), 200, requestId);
		}
		if (key === "GET blog-posts/count") {
			denied(ROLE_READ);
			return apiJson(await countBlogPosts(db), 200, requestId);
		}
		if (method === "GET" && path[0] === "blog-posts" && path[2] === "history") {
			denied(ROLE_READ);
			return apiJson(await listBlogHistory(db, decodeURIComponent(path[1] ?? ""), parsePage(url)), 200, requestId);
		}
		if (method === "GET" && path[0] === "blog-posts" && path[2] === "comments") {
			denied(ROLE_READ);
			return apiJson(await listPostComments(db, decodeURIComponent(path[1] ?? ""), url), 200, requestId);
		}
		if (method === "POST" && path[0] === "blog-posts" && path[2] === "comments") {
			denied(ROLE_REVIEW);
			return apiJson(
				await createPostComment(db, decodeURIComponent(path[1] ?? ""), await readJson(request), actor),
				201,
				requestId,
			);
		}
		if (method === "GET" && path[0] === "blog-posts" && path.length === 2 && path[1] !== "count") {
			denied(ROLE_READ);
			return apiJson(await getBlogPostBySlug(db, decodeURIComponent(path[1] ?? "")), 200, requestId);
		}
		if (method === "PUT" && path[0] === "blog-posts" && path.length === 2) {
			denied(ROLE_WRITE);
			return apiJson(
				await putBlogPost(db, decodeURIComponent(path[1] ?? ""), await readJson(request), actor, requestId),
				200,
				requestId,
			);
		}
		if (method === "PATCH" && path[0] === "blog-posts" && path[2] === "status") {
			denied(ROLE_PUBLISH);
			const force = url.searchParams.get("force") === "true";
			return apiJson(
				await patchBlogPostStatus(
					db,
					decodeURIComponent(path[1] ?? ""),
					await readJson(request),
					actor,
					requestId,
					force,
				),
				200,
				requestId,
			);
		}
		if (method === "PATCH" && path[0] === "comments" && path.length === 2) {
			denied(ROLE_REVIEW);
			return apiJson(await patchComment(db, decodeURIComponent(path[1] ?? ""), await readJson(request), actor), 200, requestId);
		}
		if (key === "GET blog-ideas") {
			denied(ROLE_READ);
			return apiJson(await listIdeas(db, url, parsePage(url)), 200, requestId);
		}
		if (key === "GET blog-ideas/count") {
			denied(ROLE_READ);
			return apiJson(await countIdeas(db), 200, requestId);
		}
		if (method === "PUT" && path[0] === "blog-ideas" && path.length === 2 && path[1] !== "count") {
			denied(ROLE_WRITE);
			return apiJson(await putIdea(db, decodeURIComponent(path[1] ?? ""), await readJson(request)), 200, requestId);
		}
		if (key === "GET x-posts") {
			denied(ROLE_READ);
			return apiJson(await listX(db, url, parsePage(url)), 200, requestId);
		}
		if (key === "GET x-posts/count") {
			denied(ROLE_READ);
			return apiJson(await countX(db), 200, requestId);
		}
		if (method === "PUT" && path[0] === "x-posts" && path.length === 2 && path[1] !== "count") {
			denied(ROLE_WRITE);
			return apiJson(await putX(db, decodeURIComponent(path[1] ?? ""), await readJson(request)), 200, requestId);
		}
		if (key === "GET board/links") {
			denied(ROLE_READ);
			return apiJson(await listBoardLinks(db), 200, requestId);
		}
		if (key === "PUT board/links") {
			denied(ROLE_WRITE);
			return apiJson(await putBoardLink(db, await readJson(request)), 200, requestId);
		}
		if (key === "GET employees") {
			denied(ROLE_READ);
			return apiJson(await listEmployees(db), 200, requestId);
		}
		if (key === "PUT employees") {
			denied(ROLE_ADMIN);
			return apiJson(await putEmployees(db, await readJson(request)), 200, requestId);
		}
		if (key === "GET apps/names") {
			denied(ROLE_READ);
			return apiJson(await listAppNames(db), 200, requestId);
		}
		if (key === "PUT apps/names") {
			denied(ROLE_WRITE);
			return apiJson(await putAppNames(db, await readJson(request)), 200, requestId);
		}
		if (key === "GET apps/requirements") {
			denied(ROLE_READ);
			return apiJson(await listRequirements(db), 200, requestId);
		}
		if (key === "PUT apps/requirements") {
			denied(ROLE_WRITE);
			return apiJson(await putRequirements(db, await readJson(request)), 200, requestId);
		}
		if (key === "GET apps/test-plans") {
			denied(ROLE_READ);
			return apiJson(await listTestPlans(db), 200, requestId);
		}
		if (key === "PUT apps/test-plans") {
			denied(ROLE_WRITE);
			return apiJson(await putTestPlans(db, await readJson(request)), 200, requestId);
		}
		if (key === "GET apps/test-results") {
			denied(ROLE_READ);
			return apiJson(await listTestResults(db, url, parsePage(url)), 200, requestId);
		}
		if (method === "PUT" && path[0] === "apps" && path[1] === "test-results" && path.length === 3) {
			denied(ROLE_WRITE);
			return apiJson(
				await putTestResult(db, decodeURIComponent(path[2] ?? ""), await readJson(request)),
				200,
				requestId,
			);
		}
		if (method === "DELETE" && path[0] === "apps" && path[1] === "test-results" && path.length === 3) {
			denied(ROLE_WRITE);
			return apiJson(
				await deleteTestResult(db, decodeURIComponent(path[2] ?? "")),
				200,
				requestId,
			);
		}
		if (key === "GET ledger/tasks") {
			denied(ROLE_READ);
			return apiJson(await listTasks(db, url, parsePage(url)), 200, requestId);
		}
		if (method === "PUT" && path[0] === "ledger" && path[1] === "tasks" && path.length === 3) {
			denied(ROLE_PUBLISH);
			return apiJson(await putTask(db, decodeURIComponent(path[2] ?? ""), await readJson(request)), 200, requestId);
		}
		if (key === "GET export") {
			denied(ROLE_READ);
			return apiJson(await exportAll(db), 200, requestId);
		}
		if (key === "POST ingest-reports") {
			denied(ROLE_WRITE);
			return apiJson(await reportIngest(db, await readJson(request), actor), 200, requestId);
		}
		return apiError(404, "not_found", "API が見つかりません", requestId);
	} catch (error) {
		const response = errorResponse(error, requestId);
		if (response.status >= 500 || response.status === 401 || response.status === 403 || response.status === 422) {
			const db = await getDb().catch(() => null);
			if (db) {
				await notifyOps(db, {
					kind: "write_failed",
					message: `API が失敗しました (${response.status})`,
					detail: { path: path.join("/"), method },
				});
			}
		}
		return response;
	}
}

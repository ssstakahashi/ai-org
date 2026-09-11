const TASKS_API = "https://tasks.googleapis.com/tasks/v1";

export type GoogleTaskStatus = "needsAction" | "completed";

export type GoogleTask = {
	kind?: string;
	id?: string;
	etag?: string;
	title?: string;
	updated?: string;
	parent?: string;
	notes?: string;
	status?: GoogleTaskStatus | string;
	due?: string;
	completed?: string;
	deleted?: boolean;
	hidden?: boolean;
	assignmentInfo?: unknown;
};

export type GoogleTaskList = {
	kind?: string;
	id?: string;
	etag?: string;
	title?: string;
	updated?: string;
};

type ListResponse<T> = {
	kind?: string;
	etag?: string;
	nextPageToken?: string;
	items?: T[];
};

async function tasksFetch<T>(
	token: string,
	path: string,
	init?: RequestInit & { query?: Record<string, string | undefined> },
): Promise<T> {
	const url = new URL(`${TASKS_API}${path}`);
	const { query, ...requestInit } = init ?? {};
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value) url.searchParams.set(key, value);
	}
	const response = await fetch(url.toString(), {
		...requestInit,
		headers: {
			Authorization: `Bearer ${token}`,
			...(requestInit.body ? { "Content-Type": "application/json" } : {}),
			...requestInit.headers,
		},
	});

	if (response.status === 204) {
		return undefined as T;
	}

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`Google Tasks API ${response.status} ${path}: ${text.slice(0, 500)}`);
	}
	if (!text) return undefined as T;
	return JSON.parse(text) as T;
}

export async function listGoogleTasklists(token: string): Promise<GoogleTaskList[]> {
	const items: GoogleTaskList[] = [];
	let pageToken: string | undefined;
	do {
		const page = await tasksFetch<ListResponse<GoogleTaskList>>(token, "/users/@me/lists", {
			query: { maxResults: "100", pageToken },
		});
		if (page.items) items.push(...page.items);
		pageToken = page.nextPageToken;
	} while (pageToken);
	return items;
}

export async function insertGoogleTasklist(token: string, title: string): Promise<GoogleTaskList> {
	return tasksFetch<GoogleTaskList>(token, "/users/@me/lists", {
		method: "POST",
		body: JSON.stringify({ title }),
	});
}

export async function listGoogleTasks(
	token: string,
	tasklistId: string,
	options?: { updatedMin?: string },
): Promise<GoogleTask[]> {
	const items: GoogleTask[] = [];
	let pageToken: string | undefined;
	do {
		const page = await tasksFetch<ListResponse<GoogleTask>>(
			token,
			`/lists/${encodeURIComponent(tasklistId)}/tasks`,
			{
				query: {
					maxResults: "100",
					pageToken,
					showCompleted: "true",
					showHidden: "true",
					showDeleted: "true",
					updatedMin: options?.updatedMin,
				},
			},
		);
		if (page.items) items.push(...page.items);
		pageToken = page.nextPageToken;
	} while (pageToken);
	return items;
}

export async function insertGoogleTask(
	token: string,
	tasklistId: string,
	body: Pick<GoogleTask, "title" | "notes" | "status" | "due">,
): Promise<GoogleTask> {
	return tasksFetch<GoogleTask>(token, `/lists/${encodeURIComponent(tasklistId)}/tasks`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export async function patchGoogleTask(
	token: string,
	tasklistId: string,
	taskId: string,
	body: Pick<GoogleTask, "title" | "notes" | "status" | "due" | "etag">,
): Promise<GoogleTask> {
	return tasksFetch<GoogleTask>(
		token,
		`/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
		{
			method: "PATCH",
			body: JSON.stringify(body),
		},
	);
}

export async function deleteGoogleTask(
	token: string,
	tasklistId: string,
	taskId: string,
): Promise<void> {
	try {
		await tasksFetch<void>(
			token,
			`/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
			{ method: "DELETE" },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Google Tasks API 404")) return;
		throw error;
	}
}

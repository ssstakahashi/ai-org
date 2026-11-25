import { appRequirementCommentAuthorLabel } from "@/lib/app-requirement-comments";
import { formatInAppTz } from "@/lib/timezone";
import {
	APP_REQUIREMENT_COMMENT_STATUS_LABEL,
	APP_REQUIREMENT_STATUS_LABEL,
	APP_TEST_RESULT_OUTCOME_LABEL,
	type AppRequirementComment,
	type AppRequirementWithApp,
	type AppTestResultWithApp,
} from "@/lib/types";

const STORED_UTC_RE =
	/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

export type RequirementClipboardInput = {
	appName: string;
	requirement: AppRequirementWithApp;
	comments: AppRequirementComment[];
	testResults: AppTestResultWithApp[];
};

function parseStoredUtc(value: string): Date | null {
	const trimmed = value.trim();
	const match = STORED_UTC_RE.exec(trimmed);
	if (match) {
		const [, year, month, day, hour, minute, second = "00"] = match;
		const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
		return Number.isNaN(date.getTime()) ? null : date;
	}
	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatWhen(value: string | null): string {
	if (!value) return "";
	const date = parseStoredUtc(value);
	if (!date) return value;
	return formatInAppTz(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function pushBlock(lines: string[], heading: string, body: string) {
	lines.push(`- ${heading}`);
	const trimmed = body.trim();
	if (trimmed) {
		lines.push("", trimmed, "");
	} else {
		lines.push("");
	}
}

/** 要件 1 件の内容を、省略せず貼り付け用 Markdown にする */
export function formatRequirementClipboard(input: RequirementClipboardInput): string {
	const { requirement } = input;
	const lines: string[] = [`# ${requirement.title}`, ""];

	if (input.appName.trim()) {
		lines.push(`- App: ${input.appName.trim()}`);
	}
	lines.push(`- ステータス: ${APP_REQUIREMENT_STATUS_LABEL[requirement.status]}`);
	if (requirement.tags.length > 0) {
		lines.push(`- タグ: ${requirement.tags.map((tag) => tag.name).join("、")}`);
	}
	const recorded = formatWhen(requirement.created_at);
	if (recorded) lines.push(`- 記録: ${recorded}`);
	const completed = formatWhen(requirement.completed_at);
	if (completed) lines.push(`- 完了: ${completed}`);
	lines.push("", requirement.body.trim() || "（本文なし）", "");

	if (input.comments.length > 0) {
		lines.push("### コメント", "");
		for (const comment of input.comments) {
			const when = formatWhen(comment.created_at);
			const heading = [
				appRequirementCommentAuthorLabel(comment),
				APP_REQUIREMENT_COMMENT_STATUS_LABEL[comment.status],
				when,
			]
				.filter(Boolean)
				.join(" / ");
			pushBlock(lines, heading, comment.body);
		}
	}

	if (input.testResults.length > 0) {
		lines.push("### テスト結果", "");
		for (const result of input.testResults) {
			const when = formatWhen(result.recorded_at);
			const heading = [APP_TEST_RESULT_OUTCOME_LABEL[result.outcome], when]
				.filter(Boolean)
				.join(" ");
			pushBlock(lines, heading, result.body);
		}
	}

	return `${lines.join("\n").trim()}\n`;
}

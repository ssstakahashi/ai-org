import type { BlogPostDestination } from "@/lib/types";

export interface BulletinSheet {
	title: string;
	url: string;
}

export const STUDIOFOODS_HP_BLOG_SHEET_ID = "1Kt3Wf3FsOnDye2uYSiQJzMqDdazA3GK95tnZ1b9yxlg";
export const STUDIOFOODS_HP_BLOG_SHEET_GID = 0;
export const STUDIOFOODS_HP_BLOG_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1Kt3Wf3FsOnDye2uYSiQJzMqDdazA3GK95tnZ1b9yxlg/edit?gid=0#gid=0";

export const AGRI_LP_BLOG_SHEET_ID = "1ldiQSqDbmASnr_k7bCScXwe4ITZSIb4wQ8bP39Wnysc";
export const AGRI_LP_BLOG_SHEET_GID = 0;
export const AGRI_LP_BLOG_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1ldiQSqDbmASnr_k7bCScXwe4ITZSIb4wQ8bP39Wnysc/edit?gid=0#gid=0";

export const BLOG_DESTINATION_SHEET: Record<
	BlogPostDestination,
	{ title: string; url: string }
> = {
	studiofoods_hp: {
		title: "ブログ記事_投稿管理",
		url: STUDIOFOODS_HP_BLOG_SHEET_URL,
	},
	agri_lp: {
		title: "農業_ブログ記事_投稿管理",
		url: AGRI_LP_BLOG_SHEET_URL,
	},
};

export const BLOG_IDEAS_SHEET_ID = "1ifDEbo3E8tuDW1CvcZEoHxkfVM9faS8qc4D1hi6pLkM";
export const BLOG_IDEAS_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1ifDEbo3E8tuDW1CvcZEoHxkfVM9faS8qc4D1hi6pLkM/edit?gid=0#gid=0";

export const BLOG_IDEAS_SHEET_KEYS = ["sidebusiness", "agri"] as const;
export type BlogIdeasSheetKey = (typeof BLOG_IDEAS_SHEET_KEYS)[number];

export const BLOG_IDEAS_SHEET_TITLE: Record<BlogIdeasSheetKey, string> = {
	sidebusiness: "SideBusiness",
	agri: "Agri",
};

export const BLOG_IDEAS_SHEET_LABEL: Record<BlogIdeasSheetKey, string> = {
	sidebusiness: "SideBusiness",
	agri: "Agri",
};

export function isBlogIdeasSheetKey(value: string): value is BlogIdeasSheetKey {
	return (BLOG_IDEAS_SHEET_KEYS as readonly string[]).includes(value);
}

export const BULLETIN_SHEETS: BulletinSheet[] = [
	{
		title: "ブログ記事_投稿管理",
		url: STUDIOFOODS_HP_BLOG_SHEET_URL,
	},
	{
		title: "ブログネタ",
		url: BLOG_IDEAS_SHEET_URL,
	},
];

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

export const BULLETIN_SHEETS: BulletinSheet[] = [
	{
		title: "ブログ記事_投稿管理",
		url: STUDIOFOODS_HP_BLOG_SHEET_URL,
	},
	{
		title: "ブログネタ",
		url: "https://docs.google.com/spreadsheets/d/1ifDEbo3E8tuDW1CvcZEoHxkfVM9faS8qc4D1hi6pLkM/edit?gid=0#gid=0",
	},
	{
		title: "法人税申告書と決算書の作成手順_令和2年版_内容",
		url: "https://docs.google.com/spreadsheets/d/1Uzo5_AJ7hrpGbHvpNeuEI068vGCxm8hRm9MXqdXBmdU/edit?gid=1097702778#gid=1097702778",
	},
	{
		title: "農業_ブログ記事_投稿管理",
		url: AGRI_LP_BLOG_SHEET_URL,
	},
];

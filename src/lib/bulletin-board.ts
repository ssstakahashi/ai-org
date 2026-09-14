export interface BulletinSheet {
	title: string;
	url: string;
}

export const STUDIOFOODS_HP_BLOG_SHEET_ID = "1Kt3Wf3FsOnDye2uYSiQJzMqDdazA3GK95tnZ1b9yxlg";
export const STUDIOFOODS_HP_BLOG_SHEET_GID = 0;
export const STUDIOFOODS_HP_BLOG_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1Kt3Wf3FsOnDye2uYSiQJzMqDdazA3GK95tnZ1b9yxlg/edit?gid=0#gid=0";

export const BULLETIN_SHEETS: BulletinSheet[] = [
	{
		title: "ブログ記事_投稿管理",
		url: STUDIOFOODS_HP_BLOG_SHEET_URL,
	},
	{
		title: "ブログネタ",
		url: "https://docs.google.com/spreadsheets/d/1ifDEbo3E8tuDW1CvcZEoHxkfVM9faS8qc4D1hi6pLkM/edit?gid=0#gid=0",
	},
];

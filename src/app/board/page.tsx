import { AppHeader } from "@/components/AppHeader";
import { BulletinBoard } from "@/components/BulletinBoard";

export const dynamic = "force-dynamic";

export default function BoardPage() {
	return (
		<main className="page">
			<AppHeader
				title="掲示板"
				lede="社内向けの掲示板です。元ファイルは Google スプレッドシートで管理します。"
			/>
			<BulletinBoard />
		</main>
	);
}

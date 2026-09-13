import { BULLETIN_SHEET_TITLE, BULLETIN_SHEET_URL } from "@/lib/bulletin-board";

export function BulletinBoard() {
	return (
		<section className="panel">
			<p>
				<a
					href={BULLETIN_SHEET_URL}
					className="automation-link"
					target="_blank"
					rel="noreferrer"
				>
					{BULLETIN_SHEET_TITLE}
				</a>
			</p>
		</section>
	);
}

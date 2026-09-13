import { BULLETIN_SHEETS } from "@/lib/bulletin-board";

export function BulletinBoard() {
	return (
		<section className="panel">
			{BULLETIN_SHEETS.map((sheet) => (
				<p key={sheet.url}>
					<a
						href={sheet.url}
						className="automation-link"
						target="_blank"
						rel="noreferrer"
					>
						{sheet.title}
					</a>
				</p>
			))}
		</section>
	);
}

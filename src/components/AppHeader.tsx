type Props = {
	title: string;
	lede: string;
};

export function AppHeader({ title, lede }: Props) {
	return (
		<header className="hero">
			<h1>{title}</h1>
			<p className="lede">{lede}</p>
		</header>
	);
}

type Props = {
	href: string;
};

export function LogoutButton({ href }: Props) {
	return (
		<a href={href} className="logout-button">
			ログアウト
		</a>
	);
}

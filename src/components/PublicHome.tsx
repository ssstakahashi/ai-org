export function PublicHome() {
	return (
		<main className="page public-home">
			<header className="hero">
				<h1>ai-org は、業務タスクを管理するためのアプリです</h1>
				<p className="lede">
					運営者の高橋昌兵が、自分と AI 従業員の仕事を記録し、進捗を確認するための社内の業務台帳です。このページはログインなしで読めます。
				</p>
				<p className="lede">
					<a href="https://ai-org.studiofoods.net/privacy">プライバシーポリシー</a>
					{" · "}
					<a href="https://ai-org.studiofoods.net/terms">利用規約</a>
				</p>
			</header>

			<article className="panel public-home-body">
				<h2>このアプリの目的</h2>
				<p>
					ai-org（https://ai-org.studiofoods.net）は、運営者の高橋昌兵が、自分の業務と AI
					従業員の作業を記録し、進捗を確認するためのアプリです。タスクの登録、担当、期限、完了をこのアプリで扱い、人が内容を見てから作業を進めます。
				</p>
				<p>
					一般の人が会員登録して使うサービスではありません。タスクの中身、投稿文、下書きなどの業務データは、運営者がパスワードを渡した人だけが見られます。ログインしなくても、このページでアプリの目的と、扱うデータの種類を確認できます。
				</p>

				<h2>このページで読めること</h2>
				<ul>
					<li>アプリの目的と主な機能</li>
					<li>
						<a href="https://ai-org.studiofoods.net/privacy">プライバシーポリシー</a>
						（取得するデータの種類、利用目的、保存、第三者への提供）
					</li>
					<li>
						<a href="https://ai-org.studiofoods.net/terms">利用規約</a>
					</li>
				</ul>
				<p>タスクの中身などの業務データは、パスワードを持つ人の画面だけで表示します。</p>

				<h2>主な機能</h2>
				<ul>
					<li>業務タスクを一覧し、担当、期限、進捗を記録する</li>
					<li>今日やるタスクを確認し、完了を記録する</li>
					<li>
						利用者が Google の同意画面で許可した場合に限り、Google Tasks
						と業務タスクを同期する
					</li>
					<li>ブログの下書きや X の投稿予定を、ログインした人が確認する</li>
				</ul>

				<h2>Google アカウントで扱うデータ</h2>
				<p>
					Google との接続は任意です。同意を求める範囲は Google Tasks（
					<code>https://www.googleapis.com/auth/tasks</code>
					）だけです。同期に使うのは、タスクリストの名前、タスクのタイトル、メモ、期限、完了状態、更新日時です。
				</p>
				<p>
					Gmail、Google ドライブ、Google カレンダー、連絡先の中身、Google
					アカウントのメールアドレスや氏名は取得しません。保存場所、保持期間、削除の依頼先は、
					<a href="https://ai-org.studiofoods.net/privacy">プライバシーポリシー</a>
					に書いています。
				</p>
				<p>
					ai-org is an internal task ledger. It lets the operator record business tasks and track progress with authorized users. If a user connects Google, the app uses only Google Tasks data (task list names, titles, notes, due dates, and completion status) to keep those tasks in sync. It does not read Gmail, Google Drive, Calendar, or Contacts. The privacy policy linked above describes what the app collects and how that data is used.
				</p>

				<h2>利用できる人</h2>
				<p>
					運営者と、運営者が認めた人です。パスワードは運営者が管理し、不特定の人に配るものではありません。
				</p>
				<p>
					<a href="https://ai-org.studiofoods.net/privacy">プライバシーポリシー</a>
					{" · "}
					<a href="https://ai-org.studiofoods.net/terms">利用規約</a>
					{" · "}
					<a href="/login">利用者向けの入口</a>
				</p>
			</article>
		</main>
	);
}

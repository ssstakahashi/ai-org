import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "プライバシーポリシー | ai-org",
	description:
		"ai-org が Google アカウントから取得するデータの種類、利用目的、保存、第三者提供についての説明です。",
};

export default function PrivacyPage() {
	return (
		<main className="page privacy-page">
			<header className="hero">
				<h1>プライバシーポリシー</h1>
				<p className="lede">ai-org（https://ai-org.studiofoods.net）の個人情報と Google ユーザーデータの取り扱いです。</p>
			</header>

			<article className="panel privacy-body">
				<p>運営者は高橋昌兵です。制定日は 2026年11月8日です。</p>
				<p>
					ai-org は社内の業務台帳です。このページは、Google Cloud の OAuth
					同意画面から誰でも読めるように、ログインなしで公開しています。
				</p>

				<h2>このページで収集するもの</h2>
				<p>
					プライバシーポリシーの閲覧自体に、アカウント登録やフォームの送信はありません。ページを開いたときの通信元 IP
					アドレスやブラウザの種類は、サイトを配信するサーバーと Cloudflare
					の通常のアクセスログに残ることがあります。広告用の Cookie やアクセス解析の Cookie は使いません。
				</p>

				<h2>Google アカウントから取得するデータ</h2>
				<p>
					OAuth で利用者に同意を求めるスコープは、Google Tasks（
					<code>https://www.googleapis.com/auth/tasks</code>
					）だけです。取得して業務台帳と同期するのは、次の情報です。
				</p>
				<ul>
					<li>タスクリストの名前</li>
					<li>タスクのタイトル、メモ、期限、完了状態、更新日時</li>
					<li>同期を続けるためのリフレッシュトークン</li>
				</ul>
				<p>
					Gmail、Google ドライブ、Google カレンダー、連絡先の中身は、この OAuth
					では取得しません。Google アカウントのプロフィールを広告や販売には使いません。
				</p>
				<p>
					Google スプレッドシートの読み書きは、利用者の OAuth
					同意ではなく、運営者が管理するサービスアカウントで行います。対象は運営者の業務用シート（投稿文や下書きの同期）です。
				</p>

				<h2>利用目的</h2>
				<ul>
					<li>業務台帳と Google Tasks を双方向に同期し、タスクの作成、更新、完了、削除を反映する</li>
					<li>同意された同期を続けるため、リフレッシュトークンを保存する</li>
					<li>同期の失敗を運用記録として残し、障害対応に使う</li>
				</ul>
				<p>
					Google ユーザーデータの利用は、
					<a href="https://developers.google.com/terms/api-services-user-data-policy">
						Google API Services User Data Policy
					</a>
					（Limited Use 要件を含む）に従います。同意画面で示している機能、つまり業務台帳と Google Tasks
					の同期を提供し、その不具合を直す範囲に限って使います。広告配信、販売、信用判定、第三者へのデータ提供、同意のない人による閲覧には使いません。
				</p>

				<h2>保存場所と期間</h2>
				<p>
					同期したタスクとリフレッシュトークンは、運営者のサーバーにあるデータベースに保存します。短時間のアクセストークンは、サーバーのメモリ上のキャッシュにとどめ、データベースには書きません。
				</p>
				<p>
					データは、同期機能を使っている間保持します。業務台帳または Google Tasks
					でタスクを削除すると、同期により相手側からも削除します。
				</p>

				<h2>閲覧できる人</h2>
				<p>
					同期したタスクは、業務台帳にログインした利用者が、タスク管理のために画面で見ます。Google
					のユーザーデータを、広告事業者やデータブローカーに渡しません。法令に基づく開示を求められた場合を除き、同期に必要な
					Google への送信以外の第三者提供はしません。
				</p>

				<h2>接続の解除</h2>
				<p>
					Google タスクへの接続は、Google アカウントの
					<a href="https://myaccount.google.com/permissions">第三者アプリのアクセス設定</a>
					から ai-org を削除すると止まります。サーバーに残ったリフレッシュトークンの削除が必要なときは、運営者に連絡してください。
				</p>

				<h2>安全管理</h2>
				<p>
					業務台帳の画面はパスワードで保護しています。公開しているのはこのプライバシーポリシーと
					<a href="/terms">利用規約</a>
					です。外部との通信は HTTPS です。
				</p>

				<h2>改定</h2>
				<p>取り扱いを変えるときは、このページの記載を更新します。改定後の内容は、掲載した日から適用します。</p>

				<h2>問い合わせ</h2>
				<p>運営者: 高橋昌兵</p>
				<p>本ポリシーと Google ユーザーデータの取り扱いに関する連絡は、運営者までお願いします。</p>
				<p>
					<a href="/terms">利用規約</a>
					{" · "}
					<a href="/login">ログイン</a>
				</p>
			</article>
		</main>
	);
}

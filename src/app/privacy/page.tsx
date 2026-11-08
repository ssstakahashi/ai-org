import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "プライバシーポリシー | ai-org",
	description:
		"ai-org が取得する情報の種類、利用目的、保存場所、保存期間、第三者提供、Google ユーザーデータの取り扱いです。",
};

export default function PrivacyPage() {
	return (
		<main className="page privacy-page">
			<header className="hero">
				<h1>プライバシーポリシー</h1>
				<p className="lede">
					ai-org（https://ai-org.studiofoods.net）が、どの情報を、どの目的で、どこに保存し、誰に渡すかを説明します。
				</p>
			</header>

			<article className="panel privacy-body">
				<p>運営者は高橋昌兵です。制定日、最終更新日はいずれも 2026年11月8日です。</p>
				<p>
					ai-org は、運営者と運営者が認めた人が、業務タスクを記録し確認するための社内の業務台帳です。一般向けの会員登録はありません。このページはログインなしで読めます。アプリの目的は
					<a href="https://ai-org.studiofoods.net/">ホームページ</a>
					にも書いています。
				</p>

				<h2>What this app collects and how it is used</h2>
				<p>
					ai-org collects a shared sign-in password check, business records typed by signed-in users, Google Tasks data after consent, and ordinary server logs. The password is not stored as a user profile. Google data is limited to the scope https://www.googleapis.com/auth/tasks: task list names, task titles, notes, due dates, completion status, updated time, and a refresh token used only to keep syncing. The app does not collect Gmail, Google Drive, Calendar, Contacts, or the Google account name and email through that consent.
				</p>
				<p>
					Those records are used to run the task ledger and to sync tasks with Google Tasks. They are stored on the operator&apos;s server until deleted. They are not sold, not used for advertising, and not used to train general AI models. Synced task text is sent back to Google only to perform the sync. Access, correction, or deletion requests go to info@st-go.work. The same practices are written in detail in Japanese below and in the English summary further down.
				</p>

				<h2>取得する情報</h2>
				<p>ai-org が取得するのは、次の情報です。目的と対応させて書きます。</p>

				<h2>1. ログインとセッション</h2>
				<p>取得するもの:</p>
				<ul>
					<li>ログイン画面に入力されたパスワード</li>
					<li>
						ログイン後に発行する Cookie <code>ai-org-session</code>
						（httpOnly、SameSite=Lax、最長 30 日）。中身は署名付きのセッション情報で、氏名やメールアドレスは含みません
					</li>
				</ul>
				<p>
					パスワードは、サーバーに設定された合言葉と一致するかを確認するためだけに使います。利用者ごとのアカウント一覧は作りません。確認が終わった入力値は、データベースに保存しません。Cookie
					は、業務画面を開いてよい人かどうかを次のアクセスでも判断するために使います。広告の識別や、サイトをまたいだ追跡には使いません。
				</p>

				<h2>2. アプリに入力する業務データ</h2>
				<p>ログインした利用者が画面または API から保存する情報です。</p>
				<ul>
					<li>タスクのタイトル、本文、状態（未着手、進行中、完了など）、開始日時、終了日時、担当、分類、タグ、繰り返し</li>
					<li>タスクに添付した画像やファイル</li>
					<li>ブログ下書きのタイトル、本文、画像、公開先</li>
					<li>X（旧 Twitter）の投稿文、画像、投稿先、予約日時</li>
					<li>従業員マスタに登録した名称と役割</li>
				</ul>
				<p>
					利用目的は、業務の記録、一覧、進捗確認、人が内容を確認してから作業を進めることです。販売、広告配信、信用判定には使いません。
				</p>
				<p>
					ログインした利用者が、投稿用の画像から下書き文を作る操作をしたときは、その画像と、文体の参考にする過去の投稿文を Google
					の生成 AI（Gemini）へ送ります。これは下書きを作るためだけで、できた文は ai-org
					に保存します。Google Tasks から取得したデータは、この生成 AI には送りません。
				</p>
				<p>
					ログインした利用者が音声入力を使ったときは、その音声を文字にするために Cloudflare Workers
					AI へ送ります。音声ファイル自体は保存せず、文字にした結果を画面に返します。
				</p>

				<h2>3. Google アカウントから取得するデータ</h2>
				<p>
					利用者の Google アカウントに OAuth で同意を求める範囲は、Google Tasks（
					<code>https://www.googleapis.com/auth/tasks</code>
					）だけです。同意したあと、手動の同期と、おおよそ 10 分ごとの自動同期で、次を読み書きします。
				</p>
				<ul>
					<li>タスクリストの名前と ID</li>
					<li>タスクの ID、タイトル、メモ、期限、完了状態、更新日時</li>
					<li>同期を続けるためのリフレッシュトークン</li>
				</ul>
				<p>この OAuth では、次は取得しません。</p>
				<ul>
					<li>Google アカウントのメールアドレス、氏名、プロフィール写真</li>
					<li>Gmail のメール</li>
					<li>Google ドライブのファイル</li>
					<li>Google カレンダーの予定</li>
					<li>連絡先</li>
				</ul>
				<p>利用目的は、次に限るものです。</p>
				<ul>
					<li>業務台帳のタスクと Google Tasks を揃えること。作成、文言の更新、完了、削除を、双方に反映します</li>
					<li>同意された同期を続けるため、リフレッシュトークンを保存すること</li>
					<li>同期が失敗したときの記録を残し、障害を直すこと</li>
				</ul>
				<p>
					短時間だけ有効なアクセストークンは、サーバーのメモリ上のキャッシュにとどめ、データベースには書きません。
				</p>
				<p>
					Google スプレッドシートの読み書きは、利用者の Google アカウントへの OAuth
					ではありません。運営者が管理するサービスアカウントで、運営者の業務用シート（投稿文や下書きの同期）だけを対象にします。利用者の
					Google ドライブ全体は読みません。
				</p>

				<h2>Google ユーザーデータの制限</h2>
				<p>
					Google API から受け取った情報の利用と転送は、
					<a href="https://developers.google.com/terms/api-services-user-data-policy">
						Google API Services User Data Policy
					</a>
					（Limited Use 要件を含む）に従います。
				</p>
				<ul>
					<li>
						使う範囲は、同意画面で示している機能、つまり業務台帳と Google Tasks
						の同期を提供し、その不具合を直すことに限る
					</li>
					<li>人が中身を見るのは、業務台帳にログインした利用者がタスクを管理するときだけ</li>
					<li>広告の配信、広告の効果測定、販売、信用判定、融資の審査には使わない</li>
					<li>データブローカーや広告事業者に渡さない。販売しない</li>
					<li>汎用の AI モデルを学習させるための素材にしない</li>
					<li>
						転送は、同期のために Google へ返す場合、このアプリを配信するサーバーと Cloudflare
						（通信の中継）に限る。法令に基づく開示を求められた場合を除く
					</li>
				</ul>

				<h2>4. 通信の記録</h2>
				<p>
					ページを開いたとき、ログインしたとき、API を呼んだときに、接続元の IP アドレス、日時、ブラウザの種類（User-Agent）が、配信するサーバーと
					Cloudflare の通常のアクセスログに残ることがあります。サイトを守るためと、障害の調査のために使います。広告用の
					Cookie、アクセス解析の Cookie、第三者のトラッキングは置きません。
				</p>

				<h2>保存する場所と期間</h2>
				<ul>
					<li>
						タスク、下書き、投稿文、リフレッシュトークンは、運営者が管理するサーバーのデータベースに保存します。添付ファイルは、同じサーバーのディスクに保存します
					</li>
					<li>
						業務データは、利用者が削除するまで、または同期機能を使っている間、保持します。業務台帳または Google
						Tasks でタスクを削除すると、同期により相手側からも削除します
					</li>
					<li>
						Google の接続を切ったあとも、サーバーにリフレッシュトークンや同期済みのタスクが残ることがあります。削除が必要なときは、下記の連絡先に依頼できます
					</li>
					<li>アクセスログは、サーバーと Cloudflare の通常の保持期間に従います</li>
				</ul>

				<h2>第三者への提供</h2>
				<p>業務データと Google ユーザーデータを、広告目的で第三者に売ることはありません。渡す相手は次だけです。</p>
				<ul>
					<li>
						Google。同意された Google Tasks
						の同期のため、タスクのタイトル、メモ、期限、完了状態を Google の API に送ります。投稿画像から下書きを作る操作をしたときは、その画像を
						Gemini に送ります
					</li>
					<li>
						Cloudflare。https://ai-org.studiofoods.net への通信を中継します。音声入力のときだけ、その音声を文字起こしのために
						Workers AI へ送ります
					</li>
					<li>法令に基づき開示を求められた相手</li>
				</ul>
				<p>
					業務台帳にログインした利用者は、同期したタスクを画面で見ます。パスワードを持たない人には、業務データを見せません。
				</p>

				<h2>接続の解除と削除の依頼</h2>
				<p>
					Google タスクへの接続は、Google アカウントの
					<a href="https://myaccount.google.com/permissions">第三者アプリのアクセス設定</a>
					から ai-org を削除すると止まります。以後の同期は行いません。
				</p>
				<p>
					サーバーに残ったリフレッシュトークン、同期したタスク、その他の業務データの開示、訂正、削除を求めるときは、運営者まで連絡してください。本人からの依頼であることを確認したうえで対応します。
				</p>

				<h2>安全管理</h2>
				<p>
					業務画面はパスワードがないと開けません。セッション Cookie は httpOnly
					です。外部との通信は HTTPS です。Google のリフレッシュトークンは、運営者のサーバーのデータベースに置きます。公開しているページは、ホームページ、このプライバシーポリシー、
					<a href="/terms">利用規約</a>
					です。
				</p>

				<h2>子ども</h2>
				<p>
					ai-org は子どもを対象にしたサービスではありません。13
					歳未満の子どもから、意図して個人情報を集めることはありません。
				</p>

				<h2>改定</h2>
				<p>
					取り扱いを変えるときは、このページの記載を更新します。改定後の内容は、このページに掲載した日から適用します。
				</p>

				<h2>English summary</h2>
				<p>
					This section states, in English, what ai-org collects and how that information is used. The operator is Shohei Takahashi. The app is the internal task ledger at https://ai-org.studiofoods.net. It is not a public membership service. The same practices are described in Japanese above.
				</p>
				<p>ai-org collects the following information.</p>
				<ul>
					<li>
						Sign-in: the shared password typed on the login form, used only to check that it matches the password configured on the server. It is not stored as a user profile. After a successful check, the app sets an httpOnly cookie named ai-org-session (SameSite=Lax, up to 30 days). The cookie holds a signed session and does not contain a name or email address. Purpose: to keep the business screens available only to someone who knows the password.
					</li>
					<li>
						Business records entered by a signed-in user: task title, notes, status, start and end times, assignee, category, tags, and recurrence; files attached to a task; blog draft title, body, and images; X post text, images, destination, and scheduled time; employee names and roles. Purpose: to record work, show progress, and let a person review the work before it proceeds. This information is not sold and is not used for advertising or credit decisions.
					</li>
					<li>
						Google user data, only after the user consents on Google&apos;s screen. The only OAuth scope is https://www.googleapis.com/auth/tasks. The app reads and writes task list names and IDs, task IDs, titles, notes, due dates, completion status, and updated time, and it stores a refresh token so sync can continue. Sync runs when a user starts it and about every 10 minutes. Short-lived access tokens stay in server memory and are not written to the database. The app does not collect the Google account email, name, profile photo, Gmail messages, Drive files, Calendar events, or contacts through this consent.
					</li>
					<li>
						Technical logs: IP address, date and time, and browser type may remain in the hosting server and Cloudflare access logs. Purpose: to operate the site and investigate failures. The app does not set advertising cookies or third-party tracking cookies.
					</li>
				</ul>
				<p>How Google user data is used and shared:</p>
				<ul>
					<li>Use is limited to keeping the task ledger and Google Tasks in sync, including create, update, complete, and delete, and to fixing sync failures.</li>
					<li>
						Use and transfer of information received from Google APIs adhere to the Google API Services User Data Policy, including the Limited Use requirements. The data is used only to provide and maintain the user-facing sync feature shown on the consent screen.
					</li>
					<li>People can read the synced tasks only after signing in to ai-org. The app does not sell the data, does not share it with advertisers or data brokers, and does not use it to train general AI models.</li>
					<li>
						The app sends task titles, notes, due dates, and completion status back to Google in order to sync. Separately, if a signed-in user asks the app to draft an X post from an image, that image and a sample of past post text are sent to Google Gemini to create the draft. Google Tasks data is not included in that request. If a signed-in user uses voice input, that audio is sent to Cloudflare Workers AI for transcription and the audio file is not stored.
					</li>
					<li>
						Google Sheets access uses the operator&apos;s service account for the operator&apos;s own business spreadsheets. It is not the end user&apos;s OAuth consent and does not read the user&apos;s Drive.
					</li>
				</ul>
				<p>
					Storage: tasks, drafts, posts, and the refresh token are stored in a database on the operator&apos;s server. Attachments are stored on disk on that server. Records are kept until a user deletes them or while sync is in use. Deleting a task in the ledger or in Google Tasks deletes it on the other side through sync. A user can revoke ai-org from Google Account permissions at https://myaccount.google.com/permissions. To request access, correction, or deletion of the refresh token or synced tasks, email info@st-go.work.
				</p>

				<h2>問い合わせ</h2>
				<p>運営者: 高橋昌兵</p>
				<p>
					本ポリシー、Google ユーザーデータの開示・削除、アプリの利用に関する連絡先:{" "}
					<a href="mailto:info@st-go.work">info@st-go.work</a>
				</p>
				<p>
					<a href="/">アプリの説明</a>
					{" · "}
					<a href="/terms">利用規約</a>
					{" · "}
					<a href="/login">ログイン</a>
				</p>
			</article>
		</main>
	);
}

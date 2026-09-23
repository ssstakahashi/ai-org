# 電子帳簿保存法で詰まらない。スキャナ保存と電子取引の「最小運用」を現場で揃える

<!-- id=blog_b1ed9305-e947-4a61-98b3-9e897bc68651 dest=studiofoods_hp -->

## Excerpt
紙のスキャンと、もともと電子で来た取引データを混ぜると現場が崩れます。スキャナ保存と電子取引の切り分け、入力期限、検索3項目、ダウンロードの求めによる緩和を、中小バックオフィス向けの最小運用として整理します。

## Body
## 紙とPDFが混ざると、まず「置き場所」が崩れる

前回の [インボイス登録のあとでつまずくポイント。請求・仕入・保管を現場で回すコツ](https://www.studiofoods.net/blog/invoice-backoffice-pitfalls-after-registration) では、登録後に起きやすい請求・仕入・保管のズレを整理しました。次に現場で詰まりやすいのが、**電子帳簿保存法まわりの「スキャナ保存」と「電子取引データ保存」の切り分け**です。

中小のバックオフィスでは、だいたい次の状態が同時に起きます。

- 紙の領収書は封筒やクリアファイル、PDF請求書はメールの添付とデスクトップに散在
- 「スキャンすれば紙は捨ててよいのか」「電子で来たものは印刷してファイリングでよいのか」が人によって違う
- 月末にまとめてスキャンしようとして、入力期限の話で止まる
- 検索できるようにしたいが、専用ソフトを入れる前提の説明ばかりで手が止まる

国税庁の特設サイトでも、電子帳簿保存法は「税務関係帳簿書類のデータ保存を可能とする法律」であり、とくに**電子取引**については保存義務者全員が確認対象、と整理されています。制度の全体像は [電子帳簿等保存制度特設サイト（国税庁）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm) を起点に追うのが安全です。

本稿は、個別の税務判断の断定ではなく、**現場で揃える最小運用**の話です。スキャナ保存（紙をデータ化して保存する任意の仕組み）と、電子取引データ保存（もともと電子で受け取った取引情報の保存）を混ぜないこと、入力期限と検索3項目、ダウンロードの求めによる緩和の「枠」を、中小の実務語で整理します。

## この記事の全体像

- スキャナ保存と電子取引は「紙か／もともと電子か」で先に分ける
- スキャナ側の入力は、おおむね7営業日／業務処理サイクル（最長2か月＋おおむね7営業日・規程が必要）
- 検索の基本は取引年月日・取引金額・取引先。範囲指定・組合せは、税務職員のダウンロード求めに応じられるならスキャナ側で緩和あり
- 電子取引側は、基準期間売上高5,000万円以下＋ダウンロード求めなどで検索要件の扱いが変わりうる（制度の枠として理解する）
- 現場の最小ルールは「命名規則・置き場所1つ・締め日・紙原本方針」の4点で足りることが多い

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="400" viewBox="0 0 700 400" role="img" aria-label="スキャナ保存と電子取引データ保存の切り分け Before After">
  <rect width="700" height="400" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After：紙と電子を混ぜない</text>
  <rect x="20" y="48" width="320" height="310" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="180" y="76" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before：置き場所が混線</text>
  <text x="40" y="108" font-family="sans-serif" font-size="12" fill="#7f1d1d">・紙領収書とPDF請求が同じ箱</text>
  <text x="40" y="130" font-family="sans-serif" font-size="12" fill="#7f1d1d">・メール添付のまま・印刷してファイリング</text>
  <text x="40" y="152" font-family="sans-serif" font-size="12" fill="#7f1d1d">・「スキャンしたら捨ててよい？」が曖昧</text>
  <text x="40" y="174" font-family="sans-serif" font-size="12" fill="#7f1d1d">・月末まとめ入力で期限の話で止まる</text>
  <text x="40" y="206" font-family="sans-serif" font-size="12" fill="#7f1d1d">結果：探す時間が長く、担当が替わると崩れる</text>
  <text x="40" y="238" font-family="sans-serif" font-size="11" fill="#991b1b">※専用ソフト未導入でも混線は起きる</text>
  <rect x="360" y="48" width="320" height="310" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="520" y="76" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After：2レーン運用</text>
  <text x="380" y="108" font-family="sans-serif" font-size="12" fill="#064e3b">・紙→スキャナ保存レーン（任意）</text>
  <text x="380" y="130" font-family="sans-serif" font-size="12" fill="#064e3b">・もともと電子→電子取引レーン（義務側）</text>
  <text x="380" y="152" font-family="sans-serif" font-size="12" fill="#064e3b">・命名：日付_金額_取引先 で揃える</text>
  <text x="380" y="174" font-family="sans-serif" font-size="12" fill="#064e3b">・置き場所はレーンごとに1つ</text>
  <text x="380" y="206" font-family="sans-serif" font-size="12" fill="#064e3b">結果：探す・渡す・引き継ぐが短くなる</text>
  <text x="380" y="238" font-family="sans-serif" font-size="11" fill="#065f46">※制度の枠を知ったうえで最小ルールを固定</text>
  <text x="350" y="380" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図は一般的な運用イメージ。個別の税務判断・適用可否の断定は対象外</text>
</svg>
<figcaption>図1. 紙と電子を同じ箱に入れると崩れる／スキャナ保存と電子取引を2レーンに分ける</figcaption>
</figure>

## 1. スキャナ保存と電子取引データ保存は別物

ここが最初の分岐です。国税庁のパンフレット「はじめませんか、書類のスキャナ保存」では、**紙の領収書・請求書などをデータで保存する代わりにスキャナ保存できる**、という整理がされています（任意の制度として導入するイメージ）。一方、メールやクラウド経由などで受け取った電子の取引情報は、**電子取引データとして保存する側**の話になります。

| 区分 | もともとの形 | 現場での意味合い（ざっくり） |
| --- | --- | --- |
| **スキャナ保存** | 紙の書類をスキャンしてデータ保存 | 紙原本の扱い・入力期限・解像度などが論点になりやすい（任意の仕組み） |
| **電子取引データ保存** | もともと電子（PDF・データ連携など） | 紙に印刷してファイリング、だけでは足りない、という整理になりやすい（保存義務者にとって要確認） |

出典の入口:

- [はじめませんか、書類のスキャナ保存（国税庁PDF）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/pdf/0023006-085_03.pdf)
- [電子帳簿保存法の改正概要（国税庁PDF）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/pdf/0023003-082.pdf)
- [電子帳簿等保存制度特設サイト（国税庁）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

現場の最小ルールは単純です。**受領時点で「紙か／電子か」をラベルし、置き場所を分ける**。同じ「請求書」でもレーンが違えば、入力期限も検索の緩和も違って見えます。混ぜたまま「とりあえずスキャン」「とりあえず印刷」を続けると、後から直すコストが大きくなります。

## 2. スキャナ保存の入力期間：7営業日と業務処理サイクル

スキャナ保存（とくに重要書類の話）で現場が止まりやすいのが入力期間です。国税庁のスキャナ保存パンフレットでは、次のどちらか、と整理されています。

1. **早期入力方式**：書類を作成または受領してから、速やか（おおむね7営業日以内）にスキャナ保存する
2. **業務処理サイクル方式**：社内で採用している業務処理サイクルの期間（最長2か月以内）を経過した後、速やか（おおむね7営業日以内）にスキャナ保存する  
   ※こちらは、作成・受領からスキャナ保存までの各事務の**処理規程を定めている場合のみ**採用できる、と書かれています

出典: [はじめませんか、書類のスキャナ保存（国税庁）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/pdf/0023006-085_03.pdf)  
詳細の一問一答: [電子帳簿保存法一問一答（スキャナ保存関係・国税庁PDF）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/pdf/0024005-113_r602.pdf)

中小現場向けの読み方（断定ではなく運用の型）:

- まず「うちは早期入力か／サイクル方式か」を決める。決めないまま月末まとめにすると、期限の話で毎回止まる
- サイクル方式にするなら、**規程がないと選べない**、という前提を先に共有する
- 一般書類については入力期間の制限が異なる整理もあるため、「全部同じ締め」にしすぎない（書類区分の確認は専門家・公式資料へ）

実務では、「受領日をファイル名の先頭に入れる」「週1のスキャン日を固定する」だけでも、早期入力側の運用はかなり安定します。

## 3. 検索3項目と、ダウンロードの求めによる緩和

スキャナ保存のデータについて、国税庁パンフレットでは検索機能として次が挙げられています。

1. **取引年月日その他の日付・取引金額・取引先**での検索
2. 日付または金額の**範囲指定**検索
3. **2以上の記録項目の組合せ**検索

そして注記として、**税務職員による質問検査権に基づくスキャナデータのダウンロードの求めに応じられるようにしている場合には、②および③は不要**、と整理されています。

出典: [はじめませんか、書類のスキャナ保存（国税庁）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/pdf/0023006-085_03.pdf)

現場への翻訳:

- 最低ラインとして意識しやすいのは、**日付・金額・取引先の3項目が追えること**
- 範囲指定や組合せまで専用システムで揃える前に、「ダウンロードの求めに応じられる状態か」を確認する（スキャナ側の緩和の枠）
- フォルダ検索＋規則的なファイル名でも、3項目を追える設計にはできる（後述の命名規則）

「検索できないと違法」と短絡せず、**何が必須で、何が緩和されうるか**を公式資料の枠で押さえるのが安全です。

## 4. 電子取引側：検索要件の扱いが変わりうる「枠」

電子取引データ保存は、スキャナ保存とは別レーンです。令和5年度税制改正の概要では、令和6年1月1日以後の電子取引データについて、検索機能の全てを不要とする措置の対象が見直された、と説明されています。ポイントの一例（制度の枠）:

- 税務調査等の際に電子取引データの**ダウンロードの求めに応じられる**ようにしている場合
- 基準期間（通常は2年／2期前）の売上高が**5,000万円以下**の保存義務者などについて、検索機能を不要とする措置の対象が見直された
- 電子取引データをプリントアウトした書面を、取引年月日その他の日付および取引先ごとに整理した状態で提示・提出できるようにしている保存義務者、も対象に加わった、という整理

出典: [電子帳簿保存法の改正概要（国税庁PDF）](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/pdf/0023003-082.pdf)

ここは**断定しすぎない**のが重要です。自社がどの措置・猶予の枠に入るか、基準期間売上高の判定、ダウンロード求めへの対応可否は、個別事情で変わります。現場が先にやるべきなのは次です。

- 電子で来た請求・領収データを、印刷ファイリングだけにしない（データの置き場所を決める）
- ファイル名に日付・金額・取引先を入れる習慣を先に付ける（検索要件の要否にかかわらず探す時間が減る）
- 「うちは検索フル要件か／緩和・不要の枠を検討できるか」は、税理士等と公式資料で確認する

電子取引の一問一答でも、規則的なファイル名（例: 日付_取引先_金額）とフォルダ格納、規程の備付け、ダウンロード求めへの対応、といった例が示されています。専用ソフトが無い中小でも、**命名と置き場所**から始めるのは合理的です。

## 5. 現場の最小ルール例（命名・置き場所・締め・紙原本）

制度の枠を読んだあとに、現場で固定するのは次の4点で十分なことが多いです。

### (1) 命名規則：日付_金額_取引先

例: `20260915_11000_株式会社サンプル商事.pdf`

- 先頭を取引年月日（YYYYMMDD）にすると、OSの並び替えだけで月次確認がしやすい
- 金額は税込／税抜のどちらで書くかを社内で1つに決める（混ぜない）
- 取引先は略称表を1枚だけ持つ（表記ゆれを減らす）

### (2) 置き場所はレーンごとに1つ

- スキャナ保存レーン: 例）共有ドライブ `/証憑/スキャナ/YYYY/MM/`
- 電子取引レーン: 例）共有ドライブ `/証憑/電子取引/YYYY/MM/`
- メール受信箱・デスクトップ・個人フォルダは「一時置き」と宣言し、締め日までにレーンへ移す

### (3) 締め日（入力・格納の儀式）

- 早期入力寄りなら、**毎週決まった曜日にスキャン／格納を閉じる**
- サイクル方式を検討するなら、規程とサイクル長を先に決めてから締めを設計する（最長2か月＋おおむね7営業日、の枠）
- 「月末にまとめて全部」は、担当が1人のときほど破綻しやすい

### (4) 紙原本の扱い方針

- スキャナ保存を採る場合でも、紙の破棄可否・保管期間は書類区分と要件次第
- 「スキャンしたからすぐ捨てる」を全員の裁量にしない。破棄してよい条件を1枚の方針に書く
- 破棄しない期間を決めるなら、置き場所（倉庫／キャビネット）も同時に決める

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="320" viewBox="0 0 700 320" role="img" aria-label="受領から格納・検索までの最小プロセス">
  <rect width="700" height="320" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">受領 → レーン分け → 命名格納 → 締め → 検索できる状態</text>
  <rect x="16" y="55" width="110" height="90" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="71" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">①受領</text>
  <text x="71" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">紙／電子</text>
  <text x="135" y="100" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="155" y="55" width="110" height="90" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="210" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">②レーン</text>
  <text x="210" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">スキャナ／電子</text>
  <text x="274" y="100" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="294" y="55" width="110" height="90" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="349" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">③命名</text>
  <text x="349" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">日付_金額_取引先</text>
  <text x="413" y="100" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="433" y="55" width="110" height="90" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="488" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">④締め</text>
  <text x="488" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">週次／規程</text>
  <text x="552" y="100" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="572" y="55" width="110" height="90" rx="6" fill="#fff" stroke="#059669" stroke-width="2"/>
  <text x="627" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">⑤検索</text>
  <text x="627" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">3項目＋緩和</text>
  <rect x="40" y="175" width="620" height="110" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="350" y="205" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e3a8a">チェックリスト（毎週閉じるとき）</text>
  <text x="60" y="232" font-family="sans-serif" font-size="12" fill="#1e40af">□ 一時置き（メール／デスクトップ）が空か　□ レーン違いの混入がないか</text>
  <text x="60" y="255" font-family="sans-serif" font-size="12" fill="#1e40af">□ ファイル名が日付_金額_取引先か　□ 紙原本方針どおりに仕分けたか</text>
  <text x="350" y="300" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図は一般的な運用イメージ。入力期限・検索緩和の適用は公式資料と専門家確認</text>
</svg>
<figcaption>図2. 受領からレーン分け・命名格納・締めまでの最小プロセスと週次チェック</figcaption>
</figure>

## 6. よくある詰まりと、戻し方

| 詰まり | 起きやすい理由 | 戻し方の例 |
| --- | --- | --- |
| メール添付のまま月末に残る | 置き場所が「受信箱」になっている | 電子取引レーンへ移す締めを週1固定 |
| スキャン画像が探せない | ファイル名が `IMG_1234` のまま | 日付_金額_取引先にリネームする儀式を追加 |
| 「印刷してファイリング」で安心してしまう | 電子取引とスキャナを混同 | 受領時点でレーンラベルを付ける |
| 専用ソフト導入の前に止まる | 検索フル要件から入ってしまう | 3項目＋ダウンロード求めの枠を先に読む |
| 担当交代で崩れる | 規程・方針が口頭だけ | 命名・置き場所・締め・紙原本の4点を1枚に残す |

請求から消込までの流れをシステム側で揃えたい場合は、[請求から消込までを一本にする。MIERU債権管理で月末の突合を手放す](https://www.studiofoods.net/blog/mieru-invoice-to-reconciliation) もあわせてどうぞ。証憑の置き場所が安定すると、債権側の突合も軽くなります。

## 7. 最小運用を回すときの注意（やりすぎない）

- **全部を一度に完璧にしない**。まずレーン分けと命名、次に締め日、そのあと紙原本方針、の順が壊れにくい
- 解像度・カラー・タイムスタンプなどスキャナ保存の技術要件は、導入する書類区分に応じて公式資料で確認する（本稿では深追いしない）
- 「うちは売上高○円だから検索不要」と社内だけで断定しない。基準期間の取り方や措置の要件は個別確認が必要
- ダウンロードの求めに応じる、と決めるなら、**どのフォルダを渡せる状態にするか**を先に決める（探せないデータでは応じられない）

## まとめ：先に揃えるのは「切り分け」と「探す型」

電子帳簿保存法で現場が詰まるとき、原因の多くは条文の細部より、**紙と電子を同じ箱に入れていること**と、**日付・金額・取引先で追えないこと**です。スキャナ保存（任意の紙データ化）と電子取引データ保存（もともと電子）を2レーンに分け、命名規則・置き場所1つ・締め日・紙原本方針を固定する。検索の範囲指定・組合せや、電子取引側の検索要件の扱いについては、国税庁のパンフレット・一問一答・改正概要の枠で押さえ、自社への当てはめは専門家と確認する——これが中小バックオフィスの最小運用です。

経理・バックオフィスの運用設計や、請求〜保管の仕組みづくりについては、[サービス一覧](https://www.studiofoods.net/services) と [お問い合わせ](https://www.studiofoods.net/contact) からご相談ください。

## 参照元

1. 国税庁「電子帳簿等保存制度特設サイト」  
   https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm
2. 国税庁「はじめませんか、書類のスキャナ保存」（PDF）  
   https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/pdf/0023006-085_03.pdf
3. 国税庁「電子帳簿保存法一問一答【スキャナ保存関係】」（PDF）  
   https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/pdf/0024005-113_r602.pdf
4. 国税庁「電子帳簿保存法の改正概要」（PDF）  
   https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/pdf/0023003-082.pdf

## 免責

本稿は一般的な制度・運用の解説であり、個別の税務判断・適用可否・申告内容を断定するものではありません。スキャナ保存・電子取引データ保存の要件、検索要件の緩和・不要措置、紙原本の取扱いなどは、国税庁の最新資料および税理士等の専門家にご確認ください。法令・通達・取扱いは改正されることがあります。


## Notes
毎日下書き 2026-09-21。柱⑤バックオフィス・電子帳簿保存法の最小運用。task=task_blog_2026-09-21_backoffice。本番へは出さない。destination=studiofoods_hp。図表SVG2枚。

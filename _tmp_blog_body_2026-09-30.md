## 2割特例が終わるタイミングで、消費税の計算方式を見直す

インボイス制度をきっかけに課税事業者になった小規模事業者向けの「2割特例」は、**令和5年10月1日から令和8年9月30日までの日の属する各課税期間**までが適用可能期間です。本日（2026-09-30）はその区切りの日に当たります。法人はこれ以降、原則として**本則課税**か**簡易課税**のどちらかで納付税額を計算する必要があります。個人事業者には、令和9年分・令和10年分に限り納付税額を売上税額の3割とする「3割特例」が用意されていますが、法人は対象外です。

出典:

- [国税庁 インボイス制度特設サイト（2割特例の概要・適用期間）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm)
- [国税庁QA 問114 2割特例の概要（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/114.pdf)
- [国税庁 令和8年度改正リーフレット（3割特例・簡易課税届出の緩和）（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026002-095.pdf)

本稿は、食品卸・小売・受託サービスが混ざる中小が、**簡易課税と本則課税のどちらを翌課税期間から使うか**を、現場の試算手順として整理します。個別の税額計算・届出可否・還付可否の断定は対象外です。顧問税理士・税務署への確認を前提にしてください。賃上げ促進税制や少額減価償却の改正は扱いません（別稿）。

関連:

- [中小の賃上げ促進税制。増加率1.5%・上乗せ・5年繰越を決算前に揃える](https://ai-org.s-takahashi-241.workers.dev/blog-drafts)（税制・別軸）
- [令和8年4月から変わる中小の設備投資。少額減価償却は40万円未満へ](https://www.studiofoods.net/blog/depreciation-40man-defense-surtax-2026)
- [インボイス登録のあとでつまずくポイント](https://www.studiofoods.net/blog/invoice-backoffice-pitfalls-after-registration)（請求・仕入の運用）

## この記事の全体像

1. 2割特例終了後の選択肢（本則・簡易・個人の3割）
2. 簡易課税のみなし仕入率と、食品卸・サービス混在での見え方
3. 本則側で同時に効く経過措置（80%→70%）の影響
4. 試算の最小手順と届出カレンダー
5. 現場チェックリストと、やりすぎない境界
6. 出典・免責

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-label="2割特例終了後の納付イメージ比較（売上税額100とした相対）">
  <rect width="720" height="420" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">納付税額の相対イメージ（売上に係る消費税額＝100とした場合）</text>
  <text x="360" y="48" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">数値は制度の構造を示す相対値。実際の有利不利は仕入率・業種区分・設備投資で変わる</text>
  <!-- axes -->
  <line x1="80" y1="360" x2="680" y2="360" stroke="#94a3b8" stroke-width="2"/>
  <line x1="80" y1="80" x2="80" y2="360" stroke="#94a3b8" stroke-width="2"/>
  <text x="70" y="100" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">100</text>
  <text x="70" y="200" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">50</text>
  <text x="70" y="360" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">0</text>
  <!-- bars: height = value*2.6 (100→260px from y=360) -->
  <!-- 2割特例: 20 → h=52 -->
  <rect x="110" y="308" width="70" height="52" fill="#94a3b8"/>
  <text x="145" y="300" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">20</text>
  <text x="145" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#334155">2割特例</text>
  <text x="145" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#94a3b8">〜R8.9.30</text>
  <!-- 3割特例: 30 → h=78 -->
  <rect x="210" y="282" width="70" height="78" fill="#cbd5e1"/>
  <text x="245" y="274" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#475569">30</text>
  <text x="245" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#334155">3割特例</text>
  <text x="245" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#94a3b8">個人R9-10</text>
  <!-- 簡易 第1種卸 10% → h=26 -->
  <rect x="310" y="334" width="70" height="26" fill="#059669"/>
  <text x="345" y="326" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">10</text>
  <text x="345" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#065f46">簡易・卸</text>
  <text x="345" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">みなし90%</text>
  <!-- 簡易 第5種サービス 50 → h=130 -->
  <rect x="410" y="230" width="70" height="130" fill="#2563eb"/>
  <text x="445" y="222" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">50</text>
  <text x="445" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e40af">簡易・役務</text>
  <text x="445" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">みなし50%</text>
  <!-- 本則例 仕入率65% → 納付35 → h=91 -->
  <rect x="510" y="269" width="70" height="91" fill="#d97706"/>
  <text x="545" y="261" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">35</text>
  <text x="545" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#92400e">本則例</text>
  <text x="545" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">実仕入率65%</text>
  <!-- 本則例 仕入率40% → 納付60 → h=156 -->
  <rect x="610" y="204" width="70" height="156" fill="#dc2626"/>
  <text x="645" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#991b1b">60</text>
  <text x="645" y="380" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#991b1b">本則例</text>
  <text x="645" y="396" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">実仕入率40%</text>
  <text x="360" y="414" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図1. 特例終了後は「みなし仕入率」と「実仕入率」の差が納付差になる（例示）</text>
</svg>
<figcaption>図1. 売上税額を100としたときの納付イメージ。卸（みなし90%）と役務（みなし50%）では簡易課税でも水準が大きく違う</figcaption>
</figure>

## 終了後の3つのレーン

| レーン | 誰が使えるか | 届出 | ざっくり計算 | 拘束 |
| --- | --- | --- | --- | --- |
| **本則課税** | 全課税事業者 | 原則不要 | 売上税額 − 実仕入税額（インボイス要件あり） | なし（通常） |
| **簡易課税** | 基準期間の課税売上高5,000万円以下 | **課税期間開始の前日まで**に選択届出 | 売上税額 ×（1−みなし仕入率） | 原則2年継続 |
| **3割特例** | **個人事業者のみ**（R9・R10年分） | 事前届出不要・申告書に付記 | 売上税額の概ね3割を納付 | 特例期間限定 |

出典: [国税庁 No.6505 簡易課税制度](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6505.htm) / [改正リーフレット（3割特例）（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026002-095.pdf)

### 食品卸・サービス混在で起きやすい誤解

1. **「卸だから簡易が絶対有利」** — 第1種（みなし90%）なら納付は売上税額の約1割になりやすい一方、同じ法人内に受託サービス（第5種・みなし50%）が多いと、事業区分の切り分けと75%特例の有無で結果が変わります。
2. **「本則＝事務が重いだけ」** — 設備投資や在庫仕入が大きく、還付や実仕入率が高い期は本則が有利になりやすいです。簡易は還付の設計と相性が悪い場面があります。
3. **「2割特例の延長が法人にもある」** — 3割特例は個人事業者向けです。法人は本則か簡易の選択が本線です。

## 簡易課税のみなし仕入率（現場で見る表）

国税庁の整理どおり、事業区分ごとのみなし仕入率は次のとおりです。

| 区分 | みなし仕入率 | 中小でよく触る例 |
| --- | --- | --- |
| 第1種 | 90% | 卸売（性質・形状を変更せず他の事業者へ販売） |
| 第2種 | 80% | 小売、飲食料品の譲渡に係る農林漁業 |
| 第3種 | 70% | 製造・建設・農林漁業（飲食料品譲渡以外）など |
| 第4種 | 60% | 飲食店業など（上記以外） |
| 第5種 | 50% | サービス業（飲食店を除く）、運輸通信、金融保険 |
| 第6種 | 40% | 不動産業 |

出典: [国税庁 No.6505 簡易課税制度](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6505.htm) / [No.6509 事業区分](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6509.htm)

複数事業がある場合は、原則として課税売上を事業ごとに区分し、それぞれのみなし仕入率を当てます。1種類が全体の75%以上を占めるなどの特例計算もあります。**区分していない部分には、区分していない事業のうち最も低いみなし仕入率が当たる**点は、食品卸＋役務の混在法人で見落としやすいです。

## 本則側で同時に効く「経過措置の縮み」

本則課税を選ぶ（または既に本則の）事業者は、インボイス未登録の相手からの仕入について、仕入税額相当額の一定割合を控除できる経過措置が段階的に縮小します。国税庁の改正資料では、**令和8年9月30日まで80% → その後70%（さらに50%・30%と段階的）**という流れが示されています。

出典: [国税庁 改正資料（経過措置の段階）（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026004-099-01-2.pdf)

ポイントは次の2つです。

- 簡易課税や2割・3割特例を使う場合、納付税額の計算上はインボイスの保存が必須ではありません（ただし所得税・法人税の証憑保存は別問題）。
- 本則で実仕入率を積む場合、未登録取引先の比率が高いほど、経過措置の縮みが試算結果を動かします。

「以前試算したときは簡易が有利だった」が、取引先の登録状況と経過措置の変化で逆転する——というのが、2026年秋以降に再計算が必要な理由です。

## 試算の最小手順（中小の1週間版）

顧問に丸投げする前に、社内で次の材料だけ揃えると会話が早くなります。

1. **直近1〜2課税期間の課税売上**（税率別・できれば事業区分別）
2. **課税仕入・経費に係る消費税額の実績**（本則試算用）
3. **未登録取引先からの仕入比率の概算**（経過措置の感度）
4. **翌期の設備投資・在庫計画の有無**（還付・本則有利のサイン）
5. **基準期間の課税売上高が5,000万円以下か**（簡易の入口）

試算の型はシンプルです。

- 簡易: 売上税額 ×（1−みなし仕入率）※複数事業は区分後
- 本則: 売上税額 − 実仕入税額（経過措置適用後）
- （個人のみ）3割特例: 売上税額のおおよそ3割

差額が年数十万円を超えるなら、届出期限までに方針を決める価値があります。差額が小さいなら、**事務負荷（区分経理・インボイス突合）**を優先して選ぶ、という判断もあります。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="380" viewBox="0 0 720 380" role="img" aria-label="簡易課税と本則の見直しプロセスと届出カレンダー">
  <rect width="720" height="380" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">見直しプロセス：材料集め → 試算 → 届出期限</text>
  <!-- step boxes -->
  <rect x="24" y="52" width="150" height="100" rx="8" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="99" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">①材料</text>
  <text x="99" y="112" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">売上区分</text>
  <text x="99" y="130" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">実仕入・未登録比</text>
  <text x="184" y="105" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="206" y="52" width="150" height="100" rx="8" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="281" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">②試算</text>
  <text x="281" y="112" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">簡易 vs 本則</text>
  <text x="281" y="130" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">（個人は3割も）</text>
  <text x="366" y="105" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="388" y="52" width="150" height="100" rx="8" fill="#fff" stroke="#059669" stroke-width="2"/>
  <text x="463" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">③方針</text>
  <text x="463" y="112" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">有利＋事務負荷</text>
  <text x="463" y="130" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">2年拘束を確認</text>
  <text x="548" y="105" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="570" y="52" width="130" height="100" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="635" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">④届出</text>
  <text x="635" y="112" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">開始前日まで</text>
  <text x="635" y="130" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">e-Tax可</text>
  <!-- calendar strip -->
  <rect x="24" y="180" width="672" height="150" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="360" y="208" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#0f172a">届出・特例のカレンダー（イメージ）</text>
  <rect x="40" y="228" width="200" height="72" rx="6" fill="#fef3c7" stroke="#d97706"/>
  <text x="140" y="258" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">〜2026-09-30</text>
  <text x="140" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#78350f">2割特例の区切り</text>
  <rect x="260" y="228" width="200" height="72" rx="6" fill="#dbeafe" stroke="#2563eb"/>
  <text x="360" y="258" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">課税期間開始の前日</text>
  <text x="360" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">簡易の選択届出期限</text>
  <rect x="480" y="228" width="196" height="72" rx="6" fill="#e0e7ff" stroke="#4f46e5"/>
  <text x="578" y="258" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#3730a3">個人: R9・R10</text>
  <text x="578" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#312e81">3割特例（申告付記）</text>
  <text x="360" y="348" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図2. 特例終了→試算→届出。簡易は原則2年継続。2割特例適用後の翌期は届出期限の緩和あり</text>
</svg>
<figcaption>図2. 材料→試算→方針→届出の最小ループ。簡易課税の選択は課税期間開始の前日が原則期限</figcaption>
</figure>

## 届出で押さえる実務ポイント

### 簡易課税を選ぶ場合

- 原則: **適用を受けようとする課税期間の初日の前日まで**に「消費税簡易課税制度選択届出書」を提出（e-Tax可）。
- 提出後は、原則として**2年間は本則へ戻せません**（不適用届出の提出時期に制限あり）。
- 2割特例や3割特例を受けた適格請求書発行事業者が、その翌課税期間から簡易を使う場合、**翌課税期間の確定申告期限まで**に届出を出せば、その翌期から適用できる緩和があります（翌期が令和8年9月30日以前終了ならその期末まで、等。詳細は国税庁QA・改正リーフを確認）。

出典: [No.6505 簡易課税制度（手続き）](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6505.htm) / [改正リーフレット（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026002-095.pdf)

### 簡易をやめて本則に戻す場合

- 「消費税簡易課税制度選択不適用届出書」を、やめようとする課税期間の初日の前日までに提出。
- 大きな設備投資の前に戻したい、という相談は現場でよく出ます。**2年拘束の残り期間**を先にカレンダーへ書いてから投資判断と並べます。

### 個人事業者の3割特例

- 事前届出は不要。確定申告書への付記で適用。
- 法人は使えない、を社内説明の冒頭に置くと誤解が減ります。

## 現場チェックリスト（週次で閉じる）

| # | チェック | 完了の定義 |
| --- | --- | --- |
| 1 | 基準期間の課税売上高を確認した | 5,000万円以下／超がメモにある |
| 2 | 売上を事業区分（第1〜6種）で概算した | 卸・小売・役務の比率が表にある |
| 3 | 実仕入率（本則）を直近実績で出した | 税率別の概算でよい |
| 4 | 未登録取引先比率を見た | 経過措置70%への感度が分かる |
| 5 | 翌期の設備投資・在庫の山を聞いた | 「還付・本則寄り」サインの有無 |
| 6 | 簡易 vs 本則（個人は3割も）を並べた | 差額と事務負荷のメモがある |
| 7 | 届出期限をカレンダーに入れた | 開始前日／緩和期限のどちらか明記 |
| 8 | 顧問・担当者に方針案を渡した | 「選択／現状維持」が1行で残る |

この8項目が埋まれば、あとは専門家確認です。会計ソフトのシミュレーション機能がある場合も、**事業区分の入力が雑だと簡易側が楽観に振れる**ので、区分の根拠メモを添付してください。

## 向く条件・やりすぎない境界

**向く**

- インボイス登録後に2割特例を使ってきた法人・個人で、終了後の方式が未決定
- 食品卸が主だが受託・配送・コンサルが混ざり、みなし仕入率の「感覚」が古い
- 本則のインボイス突合に工数が取られ、簡易への切替を検討している

**やりすぎない**

- 還付が見込める期に、2年拘束を無視して簡易へ固定する
- 事業区分を付けず「全部第1種」で試算して意思決定する
- 本稿や一般ブログの数値だけで届出を出す（必ず一次情報と専門家）

## よくあるつまずき

### 「2割特例の最後の期」と「翌期の届出」が混ざる

2割特例は、令和8年9月30日の属する課税期間までが対象です。法人の事業年度によっては、その期の申告はまだ先でも、**翌課税期間の簡易選択届出は開始前日**が原則、というズレが起きます。カレンダーに「特例の区切り」と「届出期限」を別行で書いてください。

### 混在業種で75%特例を過信する

特定事業が75%以上なら計算が簡便になる場合がありますが、**食品卸80%＋役務20%**のように境目にあると、年によって比率が揺れます。試算は「主業だけ」と「区分あり」の2パターンを出すのが安全です。

### 経過措置の帳簿記載を忘れる（本則）

本則で経過措置控除を使う場合、請求書等の保存に加え、経過措置の適用を受ける旨の帳簿記載が必要です。簡易へ移る／本則に残る、どちらでも「証憑オペ」は別問題として残ります。

## 出典（一次情報）

- [国税庁 No.6505 簡易課税制度](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6505.htm)
- [国税庁 No.6509 簡易課税制度の事業区分](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6509.htm)
- [国税庁 インボイス制度について](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm)
- [国税庁QA 問114 2割特例の概要（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/114.pdf)
- [国税庁QA 問115 2割特例の適用ができない課税期間（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/115.pdf)
- [国税庁 改正リーフレット（3割特例・簡易課税届出）（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026002-095.pdf)
- [国税庁 改正資料（経過措置の段階等）（PDF）](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/pdf/0026004-099-01-2.pdf)

## 免責と次の一歩

本稿は一般的な制度の整理と、中小現場向けの試算・届出の進め方の提案です。納税額の保証、届出の成否、還付の可否、事業区分の最終判定は行いません。適用関係は課税期間・基準期間・登録経緯で変わるため、必ず国税庁の一次情報と顧問税理士・所轄税務署で確認してください。

次の一歩は次の3つだけです。

1. 売上の事業区分比率と実仕入率を1枚に書く
2. 簡易・本則（個人は3割）の差額と届出期限をカレンダーに入れる
3. 方針案を1行にして専門家へ渡す

合同会社スタジオフーズでは、経理の請求〜消込や現場オペの整理も扱っています。消費税の計算方式そのものの申告代行はしませんが、数字の置き場とチェックリストの運用で詰まる場合はお問い合わせください。

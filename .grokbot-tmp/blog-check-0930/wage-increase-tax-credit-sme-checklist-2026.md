# 中小の賃上げ促進税制。増加率1.5%・上乗せ・5年繰越を決算前に揃える

<!-- id=blog_29a9efa8-49ab-45ef-875c-62b6d81e1229 dest=studiofoods_hp -->

## excerpt
中小企業向け賃上げ促進税制は、給与等の増加額の一部を法人税から控除できる仕組みです。基本15%（最大45%）、増加率1.5%/2.5%、教育訓練・くるみん等の上乗せ、控除しきれない場合の5年繰越を、現場チェックリストとして整理します。

## notes
毎日下書き 2026-09-22。柱⑥税制・賃上げ促進税制の現場チェック。task=task_blog_2026-09-22_tax。本番へは出さない。destination=studiofoods_hp。図表SVG2枚。

## body
## 賃上げは「最低賃金対応」と「税制」が別レーン

最低賃金の改定で給与表を直す話と、法人税から控除できる「賃上げ促進税制」の話は、現場では同じ「賃上げ」に見えますが、**確認する資料も判定の単位も別**です。労働側の整理は [最低賃金1177円時代の中小チェックリスト](https://www.studiofoods.net/blog/minimum-wage-1177yen-raise-2026-sme-checklist) に寄せ、本稿は**中小企業者等向けの賃上げ促進税制**（国税庁 No.5927-2）を、決算前に揃えるチェックの形でまとめます。

設備投資まわりの税制は前回の [少額減価償却40万円と防衛特別法人税](https://www.studiofoods.net/blog/depreciation-40man-defense-surtax-2026) で触れました。今日の柱は「給与が増えた年に、控除の入口を逃していないか」です。

本稿は個別の適用可否の断定ではありません。数値・要件は国税庁タックスアンサー（令和7年4月1日現在法令等）と中小企業庁・経済産業省の案内を入口に整理したものです。最新の適用は必ず公式資料と税理士等で確認してください。

## この記事の全体像

- 対象のイメージ: 青色申告の中小企業者等（資本金1億円以下など。適用除外事業者あり）
- 適用期間の枠: 平成30年4月1日〜令和9年3月31日までの間に開始する各事業年度
- 基本の入口: 雇用者給与等支給額の増加率が比較雇用者給与等支給額に対して **1.5%以上**
- 税額控除: 控除対象雇用者給与等支給増加額 × **15%**（上乗せで最大45%）
- 上乗せの主な柱: 増加率2.5%以上 / 教育訓練費の要件 / くるみん・えるぼし等
- 上限: 調整前法人税額の **20%**
- 控除しきれない分は **5年繰越**（繰越する年でも給与等が前年度を超える必要・明細書の継続添付）
- 全企業向け（No.5927）は「継続雇用者」ベース・要件3%など別制度。中小現場はまず No.5927-2 の「雇用者給与等」ベースを押さえる

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-label="中小向け賃上げ促進税制の控除率の階段 15パーセントから最大45パーセント">
  <rect width="720" height="420" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">控除率の階段（中小企業者等向け・イメージ）</text>
  <text x="360" y="50" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">基本15% ＋ 上乗せで最大45%（調整前法人税額の20%が上限）</text>
  <!-- base -->
  <rect x="40" y="300" width="140" height="60" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="110" y="328" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#1e40af">15%</text>
  <text x="110" y="348" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">基本（増加率1.5%以上）</text>
  <!-- +15 -->
  <rect x="200" y="240" width="140" height="120" rx="6" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <text x="270" y="290" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#1e40af">+15pt</text>
  <text x="270" y="312" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">増加率 2.5%以上</text>
  <text x="270" y="332" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">→ ここまでで30%</text>
  <!-- +10 -->
  <rect x="360" y="180" width="140" height="180" rx="6" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>
  <text x="430" y="250" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#1e3a8a">+10pt</text>
  <text x="430" y="272" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">教育訓練費の要件</text>
  <text x="430" y="292" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#334155">増加≥5% かつ</text>
  <text x="430" y="308" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#334155">教育訓練／給与≥0.05%</text>
  <!-- +5 -->
  <rect x="520" y="120" width="160" height="240" rx="6" fill="#60a5fa" stroke="#1e40af" stroke-width="2"/>
  <text x="600" y="220" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#172554">+5pt</text>
  <text x="600" y="242" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#172554">くるみん／えるぼし等</text>
  <text x="600" y="262" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e293b">認定の要件を満たす場合</text>
  <text x="600" y="290" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#0f172a">最大 45%</text>
  <text x="360" y="390" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">出典枠: 国税庁 No.5927-2（令和7年4月1日現在）。図はイメージ。個別適用の断定は対象外</text>
</svg>
<figcaption>図1. 中小向け賃上げ促進税制の控除率イメージ（基本15%＋上乗せで最大45%、法人税額の20%上限）</figcaption>
</figure>

## 1. 誰が・いつ・どのレーンか（断定しすぎない枠）

国税庁 No.5927-2 では、適用対象は**中小企業者または農業協同組合等で、青色申告書を提出するもの**とされています。中小企業者のイメージは次のとおりです（詳細・除外は公式へ）。

- 資本金の額または出資金の額が1億円以下の法人（大規模法人による株式保有などの除外あり）
- 資本または出資を有しない法人で、常時使用する従業員の数が1,000人以下のもの
- **適用除外事業者**（所得の年平均額が15億円を超えるなど）に該当する場合は対象外

適用期間の枠は、**平成30年4月1日から令和9年3月31日までの間に開始する各事業年度**です。一方で、設立の日を含む事業年度、全企業向け・中堅向けの同趣旨の制度を同じ事業年度で使う場合、解散・清算中などは適用できない、と整理されています。

出典:

- [No.5927-2 中小企業者等における賃上げ促進税制（国税庁）](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5927-2.htm)
- [中小企業向け「賃上げ促進税制」（中小企業庁）](https://www.chusho.meti.go.jp/zaimu/zeisei/syotokukakudai.html)
- [賃上げ促進税制（経済産業省）](https://www.meti.go.jp/policy/economy/jinzai/syotokukakudaisokushin/syotokukakudai.html)

### 全企業向けとの違い（現場向けのポイント）

| 観点 | 中小企業者等向け（5927-2） | 全企業向け（5927） |
| --- | --- | --- |
| 判定の軸 | **雇用者給与等**（国内雇用者の給与等） | **継続雇用者**給与等 |
| 基本の増加率 | **1.5%以上** | **3%以上** |
| 基本の控除率 | **15%**（上乗せで最大45%） | **10%**（上乗せで最大35%） |

中小の現場では、まず「雇用者給与等の増加率1.5%」レーンを追う方が、賃金台帳ベースで話がつながりやすい、というのが実務上の読み方です。どちらを使うか・使えるかは個別確認が必要です。

## 2. 基本要件1.5%と「何の給与を見るか」

適用要件の骨格は次の2点です（No.5927-2）。

1. 国内雇用者に対して給与等を支給すること
2. （雇用者給与等支給額 − 比較雇用者給与等支給額）／比較雇用者給与等支給額 **≧ 1.5%**

※比較雇用者給与等支給額が0の場合は、上記2を満たさないものとされます。

用語の現場訳（公式の枠）:

- **国内雇用者**: 役員と特殊の関係のある者等を除く使用人のうち、国内事業所の賃金台帳に記載された者
- **雇用者給与等支給額**: その事業年度の損金に算入される国内雇用者への給与等。他者からの補填額がある場合は原則控除（雇用安定助成金等の扱いは注記どおり）
- **比較雇用者給与等支給額**: 前事業年度の雇用者給与等支給額

税額控除の計算の入口は、**控除対象雇用者給与等支給増加額 × 15%**（上乗せ加算あり）です。増加額側にも、雇用安定助成金額の扱い・地方活力向上地域等の雇用促進税制との調整など、明細で押さえる論点があります。ここは「給与総額が増えた＝そのまま控除額」ではない、とだけ覚えておくと安全です。

## 3. 上乗せの読み方（2.5%／教育訓練／認定）

上乗せは「どれか1つで一気に45%」ではなく、満たした要件に応じてポイントが加算されます。No.5927-2 の整理:

| 上乗せ | 加算 | 要件の要点（要約） |
| --- | --- | --- |
| 賃上げペース | **+15pt** | 増加率 **≧ 2.5%** |
| 教育訓練 | **+10pt** | 教育訓練費の増加率 **≧ 5%**、かつ 教育訓練費／雇用者給与等 **≧ 0.05%** |
| 子育て・女性活躍等 | **+5pt** | くるみん認定／プラチナくるみん／えるぼし（2段階目以上）／プラチナえるぼし のいずれか |

すべて満たすと加算は最大30ポイント（15+10+5）となり、基本15%と合わせて**最大45%**になります。教育訓練側を狙う場合は、実施時期・内容・対象者氏名、費用の年月日・相手先などを記載した書類の**保存**が求められます。認定側は、事業年度中の認定取得や期末時点の特例認定該当など、タイミングの読み方が条文どおり細かいので、認定の有無だけで短絡しない方がよいです。

## 4. 法人税20%上限と5年繰越

税額控除限度額が、その事業年度の**調整前法人税額の20%**を超える場合、その事業年度で控除できるのは20%相当額が上限です。

控除しきれなかった金額（繰越税額控除限度超過額）は、**5年間の繰越し**が認められます。ただし、繰越控除する事業年度では、**雇用者給与等支給額がその比較雇用者給与等支給額を超えること**が必要です。また、繰越しが生じた年度以降、繰越控除を使わない年も含めて、確定申告書への**明細書の継続添付**が求められます。

実務語での意味:

- 利益が薄い年・設備投資で法人税が小さい年でも、「増えた給与分の控除チャンス」を翌年以降に持ち越せる枠がある
- その代わり、繰越年でも給与等が前年度を下回ると使えない、という制約がある
- 明細書を途中で落とすと、繰越の土台が崩れるリスクがある（手続きは税理士等とセットで）

赤字や利益薄の年ほど「今年は関係ない」と放置しがちですが、**繰越の入口を作るかどうか**は決算前の確認事項です。

## 5. 決算前チェックリスト

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480" role="img" aria-label="賃上げ促進税制の決算前チェックプロセス">
  <rect width="720" height="480" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">決算前チェック：増加率・上乗せ・繰越を揃える</text>
  <!-- step boxes -->
  <rect x="30" y="55" width="200" height="90" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="130" y="85" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">① 対象・期間</text>
  <text x="40" y="110" font-family="sans-serif" font-size="11" fill="#064e3b">青色・中小の枠か</text>
  <text x="40" y="128" font-family="sans-serif" font-size="11" fill="#064e3b">設立事業年度でないか</text>
  <path d="M240 100 L270 100" stroke="#64748b" stroke-width="2" marker-end="url(#a)"/>
  <rect x="280" y="55" width="200" height="90" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="380" y="85" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">② 給与データの突合</text>
  <text x="290" y="110" font-family="sans-serif" font-size="11" fill="#1e3a8a">賃金台帳＝国内雇用者</text>
  <text x="290" y="128" font-family="sans-serif" font-size="11" fill="#1e3a8a">今期／前期・補填額</text>
  <path d="M490 100 L520 100" stroke="#64748b" stroke-width="2"/>
  <rect x="530" y="55" width="160" height="90" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="610" y="85" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">③ 増加率</text>
  <text x="540" y="110" font-family="sans-serif" font-size="11" fill="#1e3a8a">1.5% / 2.5%</text>
  <text x="540" y="128" font-family="sans-serif" font-size="11" fill="#1e3a8a">を仮計算</text>
  <!-- row 2 -->
  <rect x="30" y="180" width="200" height="90" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="130" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#92400e">④ 上乗せ候補</text>
  <text x="40" y="235" font-family="sans-serif" font-size="11" fill="#78350f">教育訓練の証憑</text>
  <text x="40" y="253" font-family="sans-serif" font-size="11" fill="#78350f">くるみん／えるぼし</text>
  <path d="M240 225 L270 225" stroke="#64748b" stroke-width="2"/>
  <rect x="280" y="180" width="200" height="90" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="380" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#92400e">⑤ 上限・繰越</text>
  <text x="290" y="235" font-family="sans-serif" font-size="11" fill="#78350f">法人税20%上限</text>
  <text x="290" y="253" font-family="sans-serif" font-size="11" fill="#78350f">超過→5年繰越の入口</text>
  <path d="M490 225 L520 225" stroke="#64748b" stroke-width="2"/>
  <rect x="530" y="180" width="160" height="90" rx="8" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="610" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#5b21b6">⑥ 申告添付</text>
  <text x="540" y="235" font-family="sans-serif" font-size="11" fill="#4c1d95">明細の記載</text>
  <text x="540" y="253" font-family="sans-serif" font-size="11" fill="#4c1d95">繰越の継続添付</text>
  <!-- checklist bottom -->
  <rect x="30" y="300" width="660" height="140" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="50" y="328" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">現場チェック（Yes/Noで埋める）</text>
  <text x="50" y="352" font-family="sans-serif" font-size="12" fill="#334155">□ 今期・前期の雇用者給与等を賃金台帳から突合できる</text>
  <text x="50" y="374" font-family="sans-serif" font-size="12" fill="#334155">□ 増加率1.5%／2.5%の仮計算をした（補填額の扱いは公式注記どおり）</text>
  <text x="50" y="396" font-family="sans-serif" font-size="12" fill="#334155">□ 教育訓練・認定の上乗せを狙うなら証憑・タイミングを確認した</text>
  <text x="50" y="418" font-family="sans-serif" font-size="12" fill="#334155">□ 20%上限超過時の繰越・明細書継続を税理士等と共有した</text>
  <text x="360" y="462" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図は運用イメージ。適用可否・計算の断定は対象外（国税庁 No.5927-2 の枠）</text>
</svg>
<figcaption>図2. 決算前に揃えるプロセス：対象確認→給与突合→増加率→上乗せ→上限・繰越→申告添付</figcaption>
</figure>

チェックを文章でも残します。

1. **対象・期間**: 青色の中小企業者等の枠か、設立事業年度でないか、他制度との併用不可の年でないか
2. **データ**: 国内雇用者＝賃金台帳の範囲、今期と前期の雇用者給与等、補填額の有無
3. **増加率**: 1.5%（基本）と2.5%（上乗せ）を仮計算
4. **上乗せ**: 教育訓練費の増加・対給与比率、くるみん／えるぼし等の認定タイミング
5. **上限・繰越**: 調整前法人税額の20%を超える見込みか、繰越明細書を今後も添付できる体制か
6. **申告**: 控除対象額・控除額・計算明細の添付（繰越を使う年は別途明細）

## 6. よくある詰まり

- **最低賃金対応だけで終わらせる**: 労働側の改定と税制の増加率判定は別レーン。給与表改定後に「雇用者給与等」の集計をしないと、入口を逃す
- **役員報酬や対象外者を混ぜる**: 国内雇用者の定義から外れる者が混ざると、増加率が歪む
- **比較が0の年**: 比較雇用者給与等が0だと基本要件を満たさない、と明示されている
- **教育訓練の証憑不足**: 上乗せを狙うなら実施内容・費用・相手先の保存が前提
- **繰越の明細書を落とす**: 使わない年も含めて継続添付が必要、という整理
- **全企業向けの「継続雇用者3%」と混同する**: 中小向けは雇用者給与等1.5%が基本の入口

## まとめ

中小企業者等向けの賃上げ促進税制は、**増加率1.5%を入口に、控除率15%（上乗せで最大45%）、法人税額の20%上限、5年繰越**という骨格です。決算前にやることは派手ではなく、賃金台帳ベースの給与突合・増加率の仮計算・上乗せ証憑・繰越明細書の継続、の四点セットです。

設備投資側の税制は [少額減価償却40万円と防衛特別法人税](https://www.studiofoods.net/blog/depreciation-40man-defense-surtax-2026) 、労働コスト側は [最低賃金1177円時代の中小チェックリスト](https://www.studiofoods.net/blog/minimum-wage-1177yen-raise-2026-sme-checklist) と合わせて読むと、同じ「コスト増の年」でもレーンが分かれます。

バックオフィスや税務まわりの運用設計、給与・証憑の置き方の相談は [サービス一覧](https://www.studiofoods.net/services) から、個別のご相談は [お問い合わせ](https://www.studiofoods.net/contact) へどうぞ。

## 参照元

1. [No.5927-2 給与等の支給額が増加した場合の法人税額の特別控除（中小企業者等における賃上げ促進税制）｜国税庁](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5927-2.htm)（令和7年4月1日現在法令等）
2. [No.5927 給与等の支給額が増加した場合の法人税額の特別控除（全企業向け賃上げ促進税制）｜国税庁](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5927.htm)
3. [中小企業向け「賃上げ促進税制」｜中小企業庁](https://www.chusho.meti.go.jp/zaimu/zeisei/syotokukakudai.html)
4. [賃上げ促進税制｜経済産業省](https://www.meti.go.jp/policy/economy/jinzai/syotokukakudaisokushin/syotokukakudai.html)

## 免責

本記事は一般的な情報提供を目的とした解説であり、特定の法人・個人の税務判断、適用可否、控除額の計算を断定するものではありません。制度は改正・運用の細部があり、事業年度の開始時期によって適用要件が異なる場合があります。最新の内容は国税庁・中小企業庁・経済産業省の公式資料および所轄税務署・税理士等の専門家にご確認ください。


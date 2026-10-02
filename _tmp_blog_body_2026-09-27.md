## 「画面はできた」のに、現場が使わない月

[「全部ほしい」から始めない。SODATEで最初の要件を小さく切る方法](https://www.studiofoods.net/blog/sodate-carve-first-requirement) では、最初の2〜4週間で動かす「毎週の流れ」の切り方を整理しました。小さく切れたあとに、定額枠でよく起きる次の詰まりがあります。

- 開発側は「今月の項目は完了」と言っている
- 現場は「まだ紙とExcelの方が早い」と言っている
- 経営は「システム入れたのに効いていない」と感じる
- 月末に何を閉じたか、誰も同じ言葉で説明できない

原因は能力不足より、**「完了」の物差しが揃っていないこと**が多いです。機能が動いたことと、現場が使える状態は別物です。本稿は [SODATE](https://www.studiofoods.net/services/sodate)（定額で育てる開発）の現場向けに、**毎月の受け入れ基準＝完成の定義（Definition of Done）の書き方**を実務目線で整理します。見積の攻防や個別契約の法解釈は扱いません。

スクラム公式ガイド（2020年版・日本語訳）では、完成の定義を「プロダクトの品質基準を満たすインクリメントの状態を示した正式な記述」と定義し、満たさない項目はリリースもスプリントレビューでの提示もできない、と述べています。定額開発でも同じ考え方が使えます。完成の定義が曖昧だと、「できたつもり」が積み上がり、枠だけが消費されます。

出典: [スクラムガイド 2020（日本語版・scrumguides.org）](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf)

## この記事の全体像

1. 「機能完了」と「現場で使える」のズレが起きる理由
2. 完成の定義と受け入れ基準の役割分担（毎月の書き分け）
3. SODATE定額で毎月書く、短い受け入れテンプレ
4. 月末デモで閉じる／持ち越す運用
5. 一括受託に切り替えた方がよいサイン
6. 出典・免責・次の一歩

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="380" viewBox="0 0 720 380" role="img" aria-label="機能完了と現場で使える状態のBefore After">
  <rect width="720" height="380" fill="#f8fafc" rx="8"/>
  <text x="360" y="30" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After：毎月の「完了」の物差し</text>
  <rect x="24" y="52" width="330" height="280" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="189" y="82" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before：機能完了だけで閉じる</text>
  <text x="44" y="118" font-family="sans-serif" font-size="12" fill="#7f1d1d">・画面が開けば「完了」</text>
  <text x="44" y="142" font-family="sans-serif" font-size="12" fill="#7f1d1d">・誰がいつ使うか書いていない</text>
  <text x="44" y="166" font-family="sans-serif" font-size="12" fill="#7f1d1d">・権限・帳票・例外が後回し</text>
  <text x="44" y="190" font-family="sans-serif" font-size="12" fill="#7f1d1d">・月末に「あと少し」が残る</text>
  <text x="44" y="230" font-family="sans-serif" font-size="12" fill="#7f1d1d">結果：定額なのに現場は紙に戻る</text>
  <text x="44" y="262" font-family="sans-serif" font-size="11" fill="#991b1b">※作り込みは続くが、効き目が見えない</text>
  <rect x="366" y="52" width="330" height="280" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="531" y="82" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After：現場が使える状態で閉じる</text>
  <text x="386" y="118" font-family="sans-serif" font-size="12" fill="#064e3b">・誰が・どの流れで使うかを一文</text>
  <text x="386" y="142" font-family="sans-serif" font-size="12" fill="#064e3b">・受け入れ条件を月初めに書く</text>
  <text x="386" y="166" font-family="sans-serif" font-size="12" fill="#064e3b">・共通の完成の定義（品質の床）</text>
  <text x="386" y="190" font-family="sans-serif" font-size="12" fill="#064e3b">・デモで閉じ／持ち越しを記録</text>
  <text x="386" y="230" font-family="sans-serif" font-size="12" fill="#064e3b">結果：枠の使い道が説明できる</text>
  <text x="386" y="262" font-family="sans-serif" font-size="11" fill="#065f46">※機能名より「使える状態」を先に決める</text>
  <text x="360" y="358" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図は一般的な運用イメージ。個別契約・見積条件の判断は対象外</text>
</svg>
<figcaption>図1. 「画面ができた」だけで閉じると現場が戻る／「使える状態」の物差しを毎月そろえる</figcaption>
</figure>

## 「機能完了」と「現場で使える」がズレる理由

中小の社内ツールでは、次のズレが同時に起きやすいです。

### 1. 開発の完了と現場の開始が別物

開発側の完了は「コードが動き、テストを通った」に寄りがちです。現場の開始は「毎週の手順が紙やExcelから移せる」「例外時の逃げ道がある」「権限が正しい人に付いている」まで含みます。片方だけ満たしても、月末の実感は合いません。

### 2. 受け入れ条件を後から決める

「とりあえず作って、見てから直す」は探索には有効です。一方で、定額枠の**閉じる判断**まで後回しにすると、毎月「あと少し」が積み上がります。スクラムガイドでも、完成の定義を満たさない項目は提示できない、と透明性の側から述べています。後決めの受け入れは、透明性が落ちやすいです。

出典: [スクラムガイド 2020（完成の定義）](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf)

### 3. 項目ごとの条件と、全体の品質床が混ざる

Atlassian の解説でも、完了の定義（DoD）はインクリメント全体に共通する品質基準、承認基準（受け入れ基準）は個々のユーザーストーリー向けの条件、と役割を分けて説明しています。混ざると、「この画面だけ動けばOK」と「全項目で権限・ログ・帳票まで必須」が会話のたびに揺れます。

出典: [アジャイルにおける DoD（完了の定義）とは（Atlassian）](https://www.atlassian.com/ja/agile/project-management/definition-of-done)

### 4. 契約・進め方の前提が共有されていない

IPA（独立行政法人情報処理推進機構）のアジャイル開発版モデル契約では、契約前チェックリストに「完了基準、品質基準が明確になっているか」が含まれます。準委任を前提にした協働開発でも、**何をもってその周期の作業を閉じるか**を先に揃えないと、期待と実態がずれやすい、という整理です。SODATEのような定額の育てる開発でも、毎月の完了基準を短く書き直す運用は同じ問題に効きます。

出典: [情報システム・モデル取引・契約書（アジャイル開発版）（IPA）](https://www.ipa.go.jp/digital/model/agile20200331.html)

## 完成の定義と受け入れ基準：毎月こう書き分ける

用語は厳密なスクラム運用を強制するものではありません。中小の定額開発では、次の二層で足りることが多いです。

| 層 | 役割 | 変える頻度 | 例 |
| --- | --- | --- | --- |
| **完成の定義（共通の床）** | どの項目でも満たす品質・運用の最低線 | 四半期〜半年で見直し | 本番相当環境で動く／権限が正しい／手順が1枚ある／致命バグがない |
| **受け入れ基準（項目ごと）** | その項目が「現場のどの流れで使えるか」 | **毎月・項目ごとに書く** | 「週次発注一覧を画面で出し、印刷できる。担当Aが火曜に使える」 |

ポイントは次の二つです。

- **完成の定義は長くしない**（5〜8行のチェックリストで十分）
- **受け入れ基準は機能名で書かない**（「誰が・いつ・どの成果物で困らなくなるか」を一文＋条件）

前回の切り方（毎週の流れ）と合わせると、受け入れ基準は「流れの一文」の検証条件になります。優先順位のボード（今月やる／来月／保留）は順番の話、本稿の物差しは**閉じ方の話**です。順番だけ決めても、閉じ方が曖昧だとまた「できたつもり」に戻ります。

## SODATE定額で毎月書く、短いテンプレ

月初（または枠の計画会）で、今月やる各項目に次を埋めます。紙でもスプレッドシートでも構いません。

### A. 項目カード（1枚＝1本の流れ）

1. **誰の・どの毎週（または毎日）の流れか**（一文）
2. **いまのやり方**（紙／Excel／チャットのどれが主か）
3. **受け入れ基準**（3つ以内。Yes/Noで判定できる文）
4. **使わない例外**（今回やらないこと。欲張り防止）
5. **デモ日と確認者**（現場1名・窓口1名）

### B. 受け入れ基準の書き方（使える文／弱い文）

| 弱い文（避ける） | 使える文（例） |
| --- | --- |
| 発注画面を作る | 担当Aが火曜午前に、今週分の発注一覧を画面で出し印刷できる |
| 在庫が見える | 倉庫担当が端末から商品コードで在庫数を30秒以内に確認できる |
| 権限を付ける | 現場リーダーのみ編集可、一般は閲覧のみ。退職者アカウントは無効 |
| 帳票を出す | 月次の納品一覧CSVを、経理が翌営業日10時までに出力できる |
| 使いやすくする | 初回ログイン後、紙の手順書なしで一覧→詳細→印刷まで辿れる |

判定はデモの場で **満たした／未達／持ち越し** の三択にします。「だいたいOK」は未達か持ち越しへ寄せます。曖昧な合格は翌月の枠を静かに侵食します。

### C. 共通の完成の定義（チームで壁に貼る例）

- 対象環境（ステージングまたは本番相当）で、確認者が自分の権限で操作できる
- 受け入れ基準の各項目がデモで再現できる
- 致命的な不具合（データ消失・権限越え・印刷不能など）がない
- 現場向けの手順が1枚ある（チャットログの断片だけにしない）
- 持ち越しがある場合、理由と次の箱（来月／保留）が書いてある

Atlassian の実践メモでも、DoDはチームで合意し、見える化し、学びにつれて更新する、とされています。中小では四半期に一度、「この床は重すぎないか／足りないか」を見直す程度で十分です。

出典: [DoD とは（Atlassian）](https://www.atlassian.com/ja/agile/project-management/definition-of-done)

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-label="月初に受け入れを書き月末デモで閉じるプロセス">
  <rect width="720" height="420" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">月初：物差しを書く → 開発 → 月末デモ：閉じる／持ち越し</text>
  <rect x="18" y="55" width="125" height="78" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="80" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">①月初計画</text>
  <text x="80" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">項目＋受け入れ</text>
  <text x="150" y="95" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="168" y="55" width="125" height="78" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="230" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">②完成の定義</text>
  <text x="230" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#047857">共通の品質床</text>
  <text x="300" y="95" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="318" y="55" width="125" height="78" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="380" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">③枠内開発</text>
  <text x="380" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">条件を動かさない</text>
  <text x="450" y="95" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="468" y="55" width="110" height="78" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="523" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">④月末デモ</text>
  <text x="523" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#78350f">Yes/No判定</text>
  <text x="585" y="95" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="602" y="55" width="100" height="78" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="652" y="88" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#5b21b6">⑤記録</text>
  <text x="652" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4c1d95">閉じ／持ち越し</text>
  <rect x="18" y="160" width="684" height="230" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="360" y="188" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">月末デモの最小チェック（15〜30分）</text>
  <text x="48" y="222" font-family="sans-serif" font-size="12" fill="#1e3a8a">1. 月初に書いた受け入れ基準を読み上げる（後から条件を増やさない）</text>
  <text x="48" y="248" font-family="sans-serif" font-size="12" fill="#1e3a8a">2. 確認者が自分の権限で操作する（開発者が代わりに操作しない）</text>
  <text x="48" y="274" font-family="sans-serif" font-size="12" fill="#1e3a8a">3. 完成の定義（共通床）を満たすか確認する</text>
  <text x="48" y="300" font-family="sans-serif" font-size="12" fill="#1e3a8a">4. 満たした→閉じる／未達→持ち越し理由と次の箱を書く</text>
  <text x="48" y="326" font-family="sans-serif" font-size="12" fill="#1e3a8a">5. 新要望は「ついで」に合格条件へ足さない。入口（バックログ）へ戻す</text>
  <text x="48" y="358" font-family="sans-serif" font-size="12" fill="#1e3a8a">6. 翌月の受け入れ草案を1行だけ仮置きして解散する</text>
</svg>
<figcaption>図2. 月初に受け入れ基準と完成の定義を書き、月末デモで閉じ／持ち越しを記録する流れ</figcaption>
</figure>

## 月末デモで「閉じる」運用

デモはプレゼン大会にしません。目的は、**月初に書いた物差しで合格判定すること**です。

### 進め方の型（例）

1. 司会（窓口）が今月やるカードを上から読む
2. 現場確認者が操作する（開発は横でメモ）
3. 受け入れ基準ごとに Yes / No
4. 完成の定義の床を一括確認
5. 閉じたカードと持ち越しカードを記録し、翌月枠の仮置きをして終了

所要は1項目あたり数分が目安です。議論が仕様会議に膨らんだら、「新条件は来月カードへ」と切ります。スクラムガイドのスプリントレビューも、成果の検査と次の適応を目的とし、単なる発表会に限定しない、と述べています。定額の月末デモも同じで、**合格判定と次月の調整**が本体です。

出典: [スクラムガイド 2020（スプリントレビュー）](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf)

### 持ち越しの書き方

持ち越しは失敗ではありません。ただし、理由のない持ち越しは枠の穴になります。最低限、次を残します。

- **未達の受け入れ条件**（どれが No だったか）
- **原因の区分**（要件不足／データ準備／権限／バグ／優先変更）
- **次の箱**（来月やる／保留／調査タスクとして小さく切る）
- **やめ判断**（価値が薄いなら「やらない」へ移す）

「全部あと少し」で翌月へ送ると、定額枠は常に満杯に見えて、現場の効き目は増えません。

## よくあるつまずきと対処

### 「条件を厚く書きすぎて動けない」

受け入れは3つ以内にします。権限・帳票・例外を全部1枚に詰め込むと、小さかった切り方がまた「全部」に戻ります。厚い条件は、共通の完成の定義へ移すか、別カードに割ります。

### 「デモで新要望が出て合格条件が増える」

出ることは正常です。合格条件への即時追加だけ避けます。新要望は入口（バックログ／優先ボード）へ戻し、今月の合格は月初の文面で判定します。後付け条件は、どちらも得をしません。

### 「確認者が現場ではなく開発だけ」

開発だけのデモは、機能完了の確認にはなっても、現場で使える確認にはなりません。忙しくて同席できない月は、短い録画＋確認者の Yes/No 返信でも構いません。ただし「開発者が操作した画面を見るだけ」は避けます。

### 「完成の定義が理想論で重い」

床は達成可能なものにします。自動化テスト100%や完璧なマニュアルは、最初から求めない方がよいことが多いです。まずは「確認者が自分で操作できる」「手順が1枚ある」「致命バグがない」から始め、四半期で足します。

### 「準委任／定額だから成果物責任がない、と誤解する」

IPAのアジャイル版モデル契約は準委任を前提としつつ、進め方や完了・品質基準の共有を契約前チェックに含めています。契約形態の話と、毎月の物差しを書く運用は別レイヤーです。定額でも、閉じ方を言語化しないと協働は続きにくい、というのが実務上の帰結です。個別契約の条項解釈は専門家へ確認してください。

出典: [IPA アジャイル開発版モデル契約](https://www.ipa.go.jp/digital/model/agile20200331.html)

## 一括受託に切り替えた方がよいサイン

SODATEのような定額の育てる開発が向くのは、業務が変わり続け、毎月小さく閉じて学びたい場合です。次が続くなら、一括（または明確な成果物型）の方が向くことがあります。

- 法令対応や外部監査で、**完成物の範囲と合格条件が最初から固定**されている
- 関係者が多く、毎月の受け入れ確認者が決まらない
- 「全部そろってから使う」が前提で、途中リリースが許されない
- 受け入れ基準を書こうとすると、毎回「全部」に戻る（切り方がまだ早い）

最初の切り方がまだ大きい場合は、先に [要件を小さく切る方法](https://www.studiofoods.net/blog/sodate-carve-first-requirement) に戻った方が、受け入れ基準も書きやすくなります。アジャイル一般の背景は [中小企業にアジャイルが合う理由](https://www.studiofoods.net/blog/software-development-agile)、開発環境の変化は [AIで開発が早く・安くなった背景](https://www.studiofoods.net/blog/ai-faster-cheaper-dev) も参照してください。

## 月初30分でできるチェックリスト

- 今月やる項目は件数上限内か
- 各項目に「誰の・どの流れか」一文があるか
- 受け入れ基準が3つ以内で Yes/No 判定できるか
- 「今回やらないこと」が書いてあるか
- 共通の完成の定義（5〜8行）が壁または共有ドキュメントにあるか
- デモ日と現場確認者が決まっているか
- 先月の持ち越し理由が、今月の条件に紛れ込んでいないか

## まとめ

- 定額開発で効き目が見えないとき、足りないのは機能数より **完了の物差し** であることが多い
- **完成の定義**は全項目共通の品質床、**受け入れ基準**は項目ごとの「現場で使える条件」
- 受け入れは機能名ではなく、誰が・いつ・何ができればよいかを Yes/No で書く
- 月末デモは発表会ではなく、月初の文面での合格判定の場
- 持ち越しは理由と次の箱を残す。条件の後付け追加は入口へ戻す
- 切り方が大きすぎる、完成物が固定、確認者がいない、なら一括側の検討も視野に入れる

## 次の一歩

社内ツールを定額で育てる前提で、毎月の受け入れの書き方を整えたい場合は、[SODATE（定額で育てる開発）](https://www.studiofoods.net/services/sodate) のサービス案内をご覧ください。現状の業務の切り方や、月末デモの回し方の相談は [お問い合わせ](https://www.studiofoods.net/contact) からどうぞ。

## 出典

1. Ken Schwaber & Jeff Sutherland, [スクラムガイド 2020（日本語版）](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf) — 完成の定義、スプリントレビュー
2. Atlassian, [アジャイルにおける DoD（完了の定義）とは](https://www.atlassian.com/ja/agile/project-management/definition-of-done) — DoD と承認基準の役割分担、合意・可視化・更新
3. 独立行政法人情報処理推進機構（IPA）, [情報システム・モデル取引・契約書（アジャイル開発版）](https://www.ipa.go.jp/digital/model/agile20200331.html) — 契約前チェックにおける完了基準・品質基準の共有、準委任前提の協働
4. 合同会社スタジオフーズ, [「全部ほしい」から始めない。SODATEで最初の要件を小さく切る方法](https://www.studiofoods.net/blog/sodate-carve-first-requirement)
5. 合同会社スタジオフーズ, [ソフトウェア開発をアジャイルで進める理由](https://www.studiofoods.net/blog/software-development-agile)
6. 合同会社スタジオフーズ, [AIで開発は早く・安くなったのか](https://www.studiofoods.net/blog/ai-faster-cheaper-dev)

## 免責

本稿は、中小企業の現場向けに開発運用の一般的な考え方を整理した解説です。個別の契約形態・成果責任・準委任／請負の当てはめ、労務・取引上の判断は、状況により異なります。導入や契約の判断は、必要に応じて弁護士・IT導入の専門家などへご確認ください。記載の外部資料の内容は、各公開時点の情報に基づく一般紹介であり、最新版は各公式ページでご確認ください。

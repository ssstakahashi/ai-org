## 消込の次に残る「順番」の問題

前回の [請求から消込までを一本にする。MIERU債権管理で月末の突合を手放す](https://www.studiofoods.net/blog/mieru-invoice-to-reconciliation) では、発行→消込→督促→会計を分断しない流れを整理しました。消込が揃うと、「未回収一覧は出せる」状態には近づきます。

それでも現場で残りやすいのが、次の問いです。

- 同じ未回収でも、**どれから連絡するか**が担当者の感覚に依存する
- 「大きな取引先から」「付き合いの長い先から」など、ルールが口頭のまま
- 督促した事実が個人メモに散らばり、引き継げない
- 経営側が「いま資金繰りに効く未回収はどこか」をすぐ答えられない

日本政策金融公庫の信用保証利用企業動向調査（第228回、調査時点2026年3月中旬）では、2026年1〜3月期の資金繰りD.I.が ▲7.8 となおマイナス圏にあります（好転企業割合−悪化企業割合）。借入難易感D.I.も ▲7.2 です。売上が立っていても、回収が遅れると運転資金の余力は削られます。これは「回収を早めに見える化する動機」の一般背景であり、**年齢表という手段の有効性を証明するデータではありません。**

出典: [第228回 信用保証利用企業動向調査結果の概要（日本政策金融公庫）](https://www.jfc.go.jp/n/findings/pdf/hosyouyouyaku228.pdf)

本稿は機能カタログではなく、「未回収の優先順位を年齢表（エイジング）で揃える」という運用の話です。法的な督促手段の手順や、個別債権の回収可否診断は扱いません。**年齢表導入による回収日数短縮・貸倒減少の自社実証は未掲載**です。また [MIERU 債権管理](https://www.studiofoods.net/services/mieru/receivables) は現在アルファ版であり、必須条件ではありません。Excelでも同じ物差しは再現できます。

## この記事の全体像

- 未回収一覧があっても、優先順位が属人だと月末が再び詰まる
- 年齢表は「期日超過日数」で帯を切る単純な道具だが、**日数単一軸だけでは誤優先になりうる**
- 帯に加え、残高・取引先セグメント・紛争の有無を見て順番を調整する
- 帯ごとにやることを決めると、督促が再現可能になる（関係を壊す督促は禁止）
- 督促ログを残し、会計連動まで戻すと二重入力が減る
- 導入前チェックは最小4項目＋優先の複合ルール

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" role="img" aria-label="属人の順番決めと年齢表による優先順位のBefore After">
  <rect width="700" height="340" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After：未回収の「順番」を揃える</text>
  <rect x="20" y="50" width="320" height="250" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="180" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before：属人の順番</text>
  <text x="40" y="110" font-family="sans-serif" font-size="12" fill="#7f1d1d">・Excelの未回収一覧はある</text>
  <text x="40" y="132" font-family="sans-serif" font-size="12" fill="#7f1d1d">・誰から連絡するかは担当の感覚</text>
  <text x="40" y="154" font-family="sans-serif" font-size="12" fill="#7f1d1d">・督促記録が個人メモに散在</text>
  <text x="40" y="176" font-family="sans-serif" font-size="12" fill="#7f1d1d">・経営が「今効く未回収」を即答できない</text>
  <text x="40" y="210" font-family="sans-serif" font-size="12" fill="#7f1d1d">結果：月末に同じ突合と迷いが再現</text>
  <text x="40" y="240" font-family="sans-serif" font-size="11" fill="#991b1b">※消込できても「次に誰へ」が残る</text>
  <rect x="360" y="50" width="320" height="250" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="520" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After：年齢表で優先順位</text>
  <text x="380" y="110" font-family="sans-serif" font-size="12" fill="#064e3b">・期日超過日数で帯を切る</text>
  <text x="380" y="132" font-family="sans-serif" font-size="12" fill="#064e3b">・帯ごとに「今日やること」が決まっている</text>
  <text x="380" y="154" font-family="sans-serif" font-size="12" fill="#064e3b">・督促ログが案件に残る</text>
  <text x="380" y="176" font-family="sans-serif" font-size="12" fill="#064e3b">・資金繰りに効く帯を経営と共有できる</text>
  <text x="380" y="210" font-family="sans-serif" font-size="12" fill="#064e3b">結果：担当が替わっても同じ順番で動ける</text>
  <text x="380" y="240" font-family="sans-serif" font-size="11" fill="#065f46">※一覧→帯→行動の最小セット</text>
  <text x="350" y="320" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">図は一般的な運用イメージ。個別債権の回収可否や法的手続は対象外</text>
</svg>
<figcaption>図1. 未回収一覧があっても優先順位が属人だと月末が詰まる／年齢表で順番を揃える</figcaption>
</figure>

## 年齢表（エイジング）とは何か

年齢表は難しい分析ではありません。**請求の支払期日（または約定の回収日）から何日過ぎているか**で、未回収を帯に分ける表です。よく使われる切り方の例は次のとおりです。

| 年齢帯 | 目安（例） | 現場で起きやすいこと |
| --- | --- | --- |
| 期内〜直後 | 期日前〜超過0〜7日 | 請求漏れ・振込日のズレ・手数料差額 |
| 短期滞留 | 超過8〜30日 | 確認漏れ、担当者不在、請求書再送が必要 |
| 中期滞留 | 超過31〜60日 | 支払い優先順位の問題、条件の食い違い |
| 長期滞留 | 超過61日以上 | 交渉・条件見直し・専門家確認が必要な層 |

※長期の未回収は民法上の消滅時効の進行リスクを伴うため、督促履歴の厳格な保全や、必要に応じた法的措置・税務上の貸倒検討について顧問弁護士・税理士へ早めに相談することが重要です（個別案件の可否判断は本稿の対象外です）。

帯の境界日数は業界慣行で調整して構いません。大事なのは「毎回同じ物差しで切る」ことです。中小企業基盤整備機構のJ-Net21も、回収状況の把握には売上債権回転日数などが参考になると説明しています（業界平均との比較が前提）。年齢表は、その「いま滞っている塊」を日次・週次で見るための現場版です。

出典: [資金繰り改善法（基礎編）｜J-Net21](https://j-net21.smrj.go.jp/startup/manual/list8/8-3-8.html)

## 日数以外も見る：優先の複合ルール（限界の明示）

超過日数だけで並べると、次を見落としやすいです。

- **残高が大きい期内〜短期**を後回しにし、少額の長期だけを追う
- **継続取引・関係悪化リスク**が高い先への強い督促が先に走る
- **紛争・相殺・検収争い**がある案件を、通常の督促フローに乗せてしまう

現場では「大きい金額から」「関係が悪化しやすい先から」「キャッシュ影響の大きい先から」が合理的なことも多いです。年齢帯は**共通の物差し**であり、絶対主義ではありません。

簡易な複合の例（重みは自社で仮置き）:

| 観点 | 例 | 使い方 |
| --- | --- | --- |
| 超過日数 | 帯（7/30/60日など） | ベースの順番 |
| 残高 | 円額またはランク | 同帯内の並べ替え |
| 顧客セグメント | 重要／一般／スポット | 連絡チャネルとトーンの上限 |
| 紛争フラグ | あり／なし | ありは通常督促から外し、責任者・専門家へ |

部分入金・手数料差額・複数請求の紐付けは、帯分けの前に「いまの未消込残高」を一意に決めるルールが必要です。ここが未定義のまま「4点で足りる」と読まないでください。

## 帯ごとに「今日やること」を決める

年齢表の価値は、色分けそのものより、**帯→行動**の対応表にあります。自社の取引形態や回収サイクルに合わせて調整できるよう、一般的な対応表の例を以下に整理します。

| 年齢帯 | 今日の最小アクション | 止めたいこと |
| --- | --- | --- |
| 期内〜直後 | 入金予定の確認、手数料差額の突合 | 「たぶん入る」で放置 |
| 短期滞留 | 請求再送・入金予定日の確認連絡 | 担当者だけが知っている状態 |
| 中期滞留 | 条件確認（金額・期日・検収）の論点メモ | 感情だけの督促 |
| 長期滞留 | 社内エスカレーション、必要なら専門家確認 | 現場だけで抱え込む |

ポイントは、長期帯ほど「強い言い方」を増やすことではなく、**確認の粒度と責任者を上げる**ことです。税務・法務・個別の回収可否判断は、最初から専門家・担当責任者の領域に置きます。

**やってはいけない督促（帯を問わず）**: 威圧・脅迫めいた表現、個人携帯への連投、事実と異なる延滞理由の断定、年齢表だけで法的督促や貸倒判断に踏み込むこと。長期帯の「専門家確認」は、読者が年齢表だけで法的手続までできるという意味ではありません。

## MIERU債権管理での位置づけ

年齢表そのものはExcelと共有ルールでも回せます。スタジオフーズの [MIERU 債権管理](https://www.studiofoods.net/services/mieru/receivables) は、請求発行から消込・督促履歴・会計連動までを一本にする前提で設計しています（**現在はアルファ版。未実装・対象業種の制約あり**）。製品は後段の選択肢であり、本稿の必須条件ではありません。年齢表は、「未回収を組織で同じ順番に並べる」ための見方です。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300" viewBox="0 0 700 300" role="img" aria-label="請求発行から入金確認・年齢表・消込・会計連動までのプロセス図">
  <rect width="700" height="300" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">請求発行 → 入金確認 →（未入金は年齢表）→ 消込 → 会計連動</text>
  <rect x="20" y="55" width="110" height="70" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="75" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">①請求発行</text>
  <text x="75" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">請求・期日</text>
  <text x="140" y="90" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="160" y="55" width="110" height="70" rx="6" fill="#fff" stroke="#2563eb" stroke-width="2"/>
  <text x="215" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">②入金確認</text>
  <text x="215" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">入金の有無</text>
  <text x="280" y="90" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="300" y="55" width="120" height="70" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="360" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">③年齢表</text>
  <text x="360" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#047857">未入金の優先順位</text>
  <text x="430" y="90" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="450" y="55" width="110" height="70" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="505" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">④消込</text>
  <text x="505" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#78350f">入金後の突合</text>
  <text x="570" y="90" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="590" y="55" width="90" height="70" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="635" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#5b21b6">⑤会計</text>
  <text x="635" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4c1d95">連動</text>
  <rect x="20" y="150" width="660" height="120" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="350" y="178" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">年齢帯の例（境界日数は自社で調整）</text>
  <rect x="40" y="195" width="140" height="55" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="110" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#334155">期内〜7日</text>
  <text x="110" y="236" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">差額・予定確認</text>
  <rect x="200" y="195" width="140" height="55" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="270" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#1e40af">8〜30日</text>
  <text x="270" y="236" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e3a8a">再送・予定日確認</text>
  <rect x="360" y="195" width="140" height="55" rx="6" fill="#fff" stroke="#d97706"/>
  <text x="430" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#92400e">31〜60日</text>
  <text x="430" y="236" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#78350f">条件の論点整理</text>
  <rect x="520" y="195" width="140" height="55" rx="6" fill="#fff" stroke="#dc2626"/>
  <text x="590" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#991b1b">61日〜</text>
  <text x="590" y="236" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#7f1d1d">エスカレーション</text>
</svg>
<figcaption>図2. 請求発行→入金確認（未入金は年齢表で優先順位付け・督促）→入金後に消込→会計連動の流れ</figcaption>
</figure>

ポイントは、**消込は入金確認のあと**に置くことです。未入金のうちに年齢表で優先順位を付け、督促の記録を残し、入金が確認できてから消込・会計連動へ戻します。

運用上の最小セットは次のとおりです（製品名に依存しない形）。

1. **期日と残高が同じデータにある**（別Excelに転記しない）
2. **超過日数で自動または定型に帯分けできる**（必要なら残高・セグメント・紛争フラグで同帯内を並べ替え）
3. **督促したら「日付・相手・内容・次の予定」を案件に残す**
4. **消込確定や手数料相殺を会計側へ戻せる**（二重入力を増やさない。会計連動の一例として [MIERU会計](https://www.studiofoods.net/services/mieru/accounting) がある）

前回記事の「一本化」が土台で、年齢表はその上の見方です。土台が無いと、年齢表だけがまた別ファイルになります。

## 導入前に揃えておきたい4つの確認点

1. **支払期日の定義は何か**（請求書記載日／検収後○日／締め後○日）
2. **部分入金・手数料差額をどう扱うか**（全額未消込のままにしないルール）
3. **帯の境界日数**（まずは業界慣行＋自社の締めサイクルで仮置き）
4. **長期帯のエスカレーション先**（現場だけで抱え込まない）

ここが曖昧なままツールを入れると、「色分けされた一覧」だけが増えます。順番を揃えるのが目的なので、ルールは短くて構いません。

## まとめ

- 消込の次に詰まりやすいのは、「誰から先に回収するか」の属人化
- 年齢表は期日超過日数で帯を切る単純な道具だが、残高・セグメント・紛争も見て誤優先を防ぐ
- 帯ごとに今日のアクションを決め、禁止事項を守り、督促ログを案件に残す
- 会計連動まで戻し、二重入力を増やさない
- マクロの資金繰り指標は動機付けであり、年齢表の回収効果の証明ではない（効果は自社で測る）

次に試すなら、いまの未回収一覧に「超過日数」列を1本足し、4帯に色分けし、同帯内を残高順で並べてみてください。それだけで、「感覚の順番」から「共有できる順番」へ寄せられます。一本化や督促ログまで含めて仕組み化する場合の一例として、[MIERU債権管理](https://www.studiofoods.net/services/mieru/receivables) および [MIERUシリーズ](https://www.studiofoods.net/services/mieru) も参照できます（アルファ版）。

### 出典

- 日本政策金融公庫「第228回 信用保証利用企業動向調査結果の概要」（2026年1〜3月期実績）: https://www.jfc.go.jp/n/findings/pdf/hosyouyouyaku228.pdf
- 中小企業基盤整備機構 J-Net21「資金繰り改善法（基礎編）」: https://j-net21.smrj.go.jp/startup/manual/list8/8-3-8.html
- 関連記事: https://www.studiofoods.net/blog/mieru-invoice-to-reconciliation

※本稿は一般的な業務整理です。個別の債権回収、法的手続、税務・会計処理の判断は専門家にご確認ください。

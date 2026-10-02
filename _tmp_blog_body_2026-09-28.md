## 「何回までなら通すか」を先に決める

これまでのシリーズでは、リクエストの中身（WAF）、機械アクセスのコスト（Bot Fight Mode）、入口の身元（Access）、届け方（Tunnel）、経路の暗号化（SSL/TLS Full strict）、オリジン側での Cloudflare 検証（Authenticated Origin Pulls）を順に整理してきました。

本記事の主題は、その外側でも内側でも効く **回数の上限** です。公式名は **Rate limiting rules（レート制限ルール）**。マッチするリクエストについて、一定時間あたりの回数を数え、上限を超えたときに Block などのアクションを取る仕組みです。ログインや問い合わせフォーム、API のように「短時間に何度も叩かれると困る」場所に、まず1本置く、という最小導入を目指します。

公式（Rate limiting rules 概要）: https://developers.cloudflare.com/waf/rate-limiting-rules/

公式（ダッシュボードでの作成）: https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/

※本記事は防御設計の一般解説です。攻撃手順や回避方法は扱いません。プラン上限やダッシュボードUI、手順は変更されうるため、導入時は公式ドキュメントに従ってください。

## WAF・Bot Fight Mode との役割の違い

WAF や Bot Fight Mode は「危ない形」「機械っぽさ」を見ます。Rate limiting は **形が正しくても、回数が多い** ときに上限をかけます。ログイン試行やフォーム連投のように、1回ずつは正常に見える通信の積み重ねを抑える層、と考えると整理しやすいです。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420" role="img" aria-label="WAF Bot Fight Mode Rate limitingの役割分担">
  <rect width="700" height="420" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">何を見るか（WAF / Bot Fight Mode / Rate limiting）</text>
  <!-- WAF -->
  <rect x="20" y="50" width="210" height="200" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="125" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">WAF（別記事）</text>
  <text x="40" y="115" font-family="sans-serif" font-size="12" fill="#065f46">見るもの:</text>
  <text x="40" y="140" font-family="sans-serif" font-size="12" fill="#047857">リクエストの中身・</text>
  <text x="40" y="160" font-family="sans-serif" font-size="12" fill="#047857">既知の危ないパターン</text>
  <text x="40" y="195" font-family="sans-serif" font-size="12" fill="#065f46">向く場面:</text>
  <text x="40" y="220" font-family="sans-serif" font-size="12" fill="#047857">公開サイト全体の</text>
  <text x="40" y="240" font-family="sans-serif" font-size="12" fill="#047857">最低限の防護</text>
  <!-- Bot -->
  <rect x="245" y="50" width="210" height="200" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="350" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">Bot Fight Mode（別記事）</text>
  <text x="265" y="115" font-family="sans-serif" font-size="12" fill="#1e40af">見るもの:</text>
  <text x="265" y="140" font-family="sans-serif" font-size="12" fill="#1d4ed8">機械アクセスの兆候</text>
  <text x="265" y="160" font-family="sans-serif" font-size="12" fill="#1d4ed8">（コストを上げる）</text>
  <text x="265" y="195" font-family="sans-serif" font-size="12" fill="#1e40af">向く場面:</text>
  <text x="265" y="220" font-family="sans-serif" font-size="12" fill="#1d4ed8">スクレイピング等の</text>
  <text x="265" y="240" font-family="sans-serif" font-size="12" fill="#1d4ed8">自動アクセス抑制</text>
  <!-- Rate -->
  <rect x="470" y="50" width="210" height="200" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="3"/>
  <text x="575" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">Rate limiting（本記事）</text>
  <text x="490" y="115" font-family="sans-serif" font-size="12" fill="#9a3412">見るもの:</text>
  <text x="490" y="140" font-family="sans-serif" font-size="12" fill="#c2410c">単位時間あたりの</text>
  <text x="490" y="160" font-family="sans-serif" font-size="12" fill="#c2410c">リクエスト回数</text>
  <text x="490" y="195" font-family="sans-serif" font-size="12" fill="#9a3412">向く場面:</text>
  <text x="490" y="220" font-family="sans-serif" font-size="12" fill="#c2410c">ログイン・フォーム・</text>
  <text x="490" y="240" font-family="sans-serif" font-size="12" fill="#c2410c">API の連投抑制</text>
  <!-- bottom note -->
  <rect x="20" y="270" width="660" height="120" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1"/>
  <text x="350" y="300" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#334155">重ね方のイメージ（公式の相互運用案内に沿った一般化）</text>
  <text x="40" y="335" font-family="sans-serif" font-size="12" fill="#475569">入口の質（WAF / Bot）と、回数の上限（Rate limiting）は別レイヤです。</text>
  <text x="40" y="360" font-family="sans-serif" font-size="12" fill="#475569">Free では Rate limiting ルールは 1 本のため、いちばん痛いパス（例: ログイン POST）に寄せるのが現実的です。</text>
</svg>
<figcaption>図1. WAF・Bot Fight Mode は「質」、Rate limiting は「量」。Free ではルール1本を痛いパスに寄せる</figcaption>
</figure>

要約すると次のとおりです。

| 層 | 主に見るもの | シリーズでの位置 |
| --- | --- | --- |
| WAF | リクエストの中身・既知パターン | 別記事 |
| Bot Fight Mode | 機械アクセスのコスト | 別記事 |
| Rate limiting（本記事） | 単位時間あたりの回数 | ログイン／フォーム／API の連投 |

公式は、Rate limiting を Managed Rules や Bot 関連機能と併用するときは、評価順とアクションの止まり方を把握するよう案内しています（Security features interoperability）。本記事ではその詳細設計には踏み込まず、「回数上限を1本置く」ところまでを扱います。

## これまでのシリーズとの位置づけ

- **Access / Zero Trust**: 誰が入口を通れるか（別記事）
- **WAF / Bot Fight Mode**: リクエストの質と自動アクセスのコスト（別記事）
- **Tunnel**: オリジンへどう届けるか（別記事）
- **SSL/TLS Full (strict) / Authenticated Origin Pulls**: 経路の暗号化とオリジン側の検証（別記事）
- **Rate limiting rules（本記事）**: マッチした通信の「何回まで通すか」

管理画面の「誰が入れるか」は Access、公開サイト全体の最低限は WAF / Bot、**特定パスの連投**は Rate limiting、という切り分けが扱いやすいです。

## Free プランで押さえる上限（ルール数・期間・特性）

公式の Availability 表（2026年8月時点の公開ドキュメント）では、Free プランのおおまかな上限は次のとおりです。導入直前に公式表を再確認してください。

| 項目 | Free の目安（公式表） |
| --- | --- |
| ルール数 | 1 |
| カウント特性 | IP |
| カウント期間 | 10 秒 |
| 緩和（mitigation）の長さ | 10 秒 |
| 式で使える主なフィールド | Path、Verified Bot など（プランにより拡張） |

Pro 以上ではルール数・期間・アクション（Managed Challenge 等）が広がります。中小企業で「まず最小」なら、**Free の1本をログインや問い合わせ POST に当てる**ところから始めるのが現実的です。

公式（Availability）: https://developers.cloudflare.com/waf/rate-limiting-rules/#availability

公式（パラメータ）: https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/

## 中小企業向け最小導入の順序（Before / After）

いきなりサイト全体を厳しくすると、正規の連続操作まで止めやすいです。公式のダッシュボード手順も「マッチ条件 → 特性 → 回数と期間 → アクション → 緩和の長さ → Deploy」の順です。中小企業向けには、**いちばん痛い1パス**に絞るのが先です。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="440" viewBox="0 0 700 440" role="img" aria-label="Rate limiting導入のBefore Afterと推奨順序">
  <rect width="700" height="440" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After と導入順序（Rate limiting 最小）</text>
  <!-- Before -->
  <rect x="20" y="50" width="320" height="140" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="180" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before（よくある公開サイト）</text>
  <text x="40" y="110" font-family="sans-serif" font-size="12" fill="#7f1d1d">• WAF / Bot は入っている（または検討中）</text>
  <text x="40" y="134" font-family="sans-serif" font-size="12" fill="#7f1d1d">• ログインやフォームに回数上限が無い</text>
  <text x="40" y="158" font-family="sans-serif" font-size="12" fill="#7f1d1d">• 短時間の連投がオリジンまで届きうる</text>
  <!-- After -->
  <rect x="360" y="50" width="320" height="140" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="520" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After（Rate limiting 1本）</text>
  <text x="380" y="110" font-family="sans-serif" font-size="12" fill="#065f46">• 対象パス＋メソッドだけをマッチ</text>
  <text x="380" y="134" font-family="sans-serif" font-size="12" fill="#065f46">• 同一 IP の回数を期間内でカウント</text>
  <text x="380" y="158" font-family="sans-serif" font-size="12" fill="#065f46">• 上限超過時はアクション（Free は Block）</text>
  <!-- Steps -->
  <rect x="20" y="210" width="660" height="200" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="350" y="240" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">推奨順序（公式ダッシュボード手順の一般化）</text>
  <text x="40" y="272" font-family="sans-serif" font-size="12" fill="#7c2d12">① 守るパスを1つ決める（例: ログイン POST、問い合わせ POST）</text>
  <text x="40" y="298" font-family="sans-serif" font-size="12" fill="#7c2d12">② Security rules → Create rule → Rate limiting rules</text>
  <text x="40" y="324" font-family="sans-serif" font-size="12" fill="#7c2d12">③ マッチ式（Path 等）・特性（Free は IP）・回数と期間を入れる</text>
  <text x="40" y="350" font-family="sans-serif" font-size="12" fill="#7c2d12">④ アクション（Free は Block）と緩和の長さ（Free は 10 秒）を選ぶ</text>
  <text x="40" y="376" font-family="sans-serif" font-size="12" fill="#7c2d12">⑤ Deploy 後、正規操作が止まらないか自社で確認してから閾値を見直す</text>
</svg>
<figcaption>図2. 連投が届きうる Before と、対象パスへ1本の回数上限を置いた After。導入は痛いパスから</figcaption>
</figure>

### 前提チェック

1. **ゾーンが Cloudflare プロキシ（オレンジ雲）になっている**  
   Rate limiting はエッジで評価されます。DNS だけ Cloudflare でプロキシがオフのホストには効きません。
2. **守るパスがはっきりしている**  
   Free はルール1本です。ログイン、問い合わせ、パスワードリセットなど、いちばん痛い場所を先に選びます。
3. **正規ユーザーの連打を想定する**  
   閾値が厳しすぎると、入力ミスの連続や業務端末の共有IPで誤検知しやすくなります。まず緩めに置き、ログや実態を見て締める方が手戻りが少ないです。

### ダッシュボードでの最小ステップ（概要）

公式の作成手順を、中小企業向けに噛み砕くと次の順です。画面文言は変わりうるため、作業直前に公式を開き直してください。

1. Cloudflare ダッシュボードで対象ゾーンを開き、**Security rules** へ進む。  
2. **Create rule → Rate limiting rules** を選ぶ。  
3. ルール名を付ける（例: ログイン POST の回数上限）。  
4. **When incoming requests match** で対象を絞る。公式のログイン保護例では、ホスト・パス・メソッド（POST）を組み合わせます。Free で使えるフィールドは Path などプラン依存のため、公式の Availability を確認してください。  
5. **With the same characteristics** でカウント単位を確認する。Free では **IP** が前提です。  
6. **When rate exceeds** で「何回／何秒」を入れる。公式のアカウント保護ユースケース例では、例として 5 リクエスト／10 秒が示されています（あくまで例。自社の正規操作に合わせて調整してください）。  
7. **Then take action** でアクションを選ぶ。Free では **Block** が中心です。Pro 以上では Managed Challenge などが選べます。  
8. **For duration（緩和の長さ）** を選ぶ。Free では **10 秒** が目安です。  
9. **Deploy** する（まだなら Save as Draft）。

公式（ダッシュボード作成）: https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/

公式（アカウント保護のユースケース例）: https://developers.cloudflare.com/use-cases/solutions/stop-account-takeover-attacks/

マッチ式の具体値（パス名やホスト名）はサイトごとに異なります。本記事では攻撃検証用の連打手順は示しません。閾値の確認は、自社の検証環境と公式手順に従ってください。

### ログイン以外に置きやすい例（一般）

- **問い合わせ・資料請求フォームの POST**  
  連投で通知や業務メールが溢れるのを抑える。
- **パスワードリセットや会員登録のエンドポイント**  
  短時間の繰り返しを抑える（パスとメソッドを公式どおり明示）。
- **自社 API の特定パス**  
  1クライアントあたりの呼び出し上限の「最初の1本」として。

サイト全体に広くかけすぎると、画像や静的ファイルの連続取得まで数えやすいです。公式も「キャッシュ済みアセットにも適用するか」を選べると案内しています。最初は **動的で痛いパスだけ** に絞る方が運用しやすいです。

## 向いている場面・向いていない場面

**向きやすい例**

- ログインや管理ログインが公開されている（Access で閉じられない、または閉じる前の暫定）
- 問い合わせフォームの連投が業務負荷になっている
- WAF / Bot Fight Mode は入れたが、正常に見える連投まで止めきれていない
- Free プランで「まず1本」に投資対効果を出したい

**最初から Rate limiting だけに頼らない方がよい例**

- 管理画面の「誰が入れるか」が未整理（先に Access を検討）
- 攻撃っぽいペイロード自体をまだ見ていない（WAF の最小セットが未導入）
- 共有回線・NAT 配下で多数ユーザーが同一 IP になるのに、閾値を極端に低くしている
- SEO 用の検証済みボットまで広く止めてしまう設計（公式は verified bots への適用と SEO への影響に注意を促しています）

## 運用上の注意（一般解説）

- **ルールは順序評価**: 公式どおり、Block などは後続ルールの評価を止めることがあります。他のセキュリティルールとの並びを意識してください。
- **厳密な「ちょうどN回までオリジンに届く」保証ではない**: 公式は、検知とカウンタ更新に数秒の遅れがあり、緩和が効く前に余剰リクエストがオリジンへ届きうると説明しています。設計の前提として把握しておきます。
- **カウンタのスコープ**: リクエストレートの計算方法・データセンター単位の扱いも公式に解説があります。詳細は Request rate のページを参照してください。
- **誤検知時の切り分け**: 正規ユーザーが止まったら、まず閾値とマッチ式（パスが広すぎないか）を見直します。Pro 以上なら Challenge 系アクションへの変更も選択肢です。
- **プラン・UI**: Free でも1本使えますが、画面の置き場（Security rules）や文言は変わり得ます。作業直前に公式を確認してください。

公式（リクエストレートの考え方）: https://developers.cloudflare.com/waf/rate-limiting-rules/request-rate/

公式（他機能との相互運用）: https://developers.cloudflare.com/waf/security-features-interoperability/

## まとめ

Rate limiting rules は、WAF や Bot Fight Mode が担う「質」の層の隣に置く、**回数の上限** の最小追加層です。中小企業向けの実務的な順序は次のとおりです。

1. 守るパスを1つ決める（ログイン POST、問い合わせ POST など）  
2. Security rules から Rate limiting rule を作成する  
3. マッチ式・特性（Free は IP）・回数と期間を入れる  
4. アクション（Free は Block）と緩和の長さ（Free は 10 秒）を選ぶ  
5. Deploy し、正規操作が止まらないか確認してから閾値を調整する  
6. 管理画面の身元は Access、中身は WAF、機械は Bot、回数は Rate limiting、と役割を分けて積み上げる  

シリーズの積み上げイメージは次のとおりです。

1. 公開サイトの入口を薄くする（Bot Fight Mode / WAF）  
2. 管理画面の「誰が入れるか」を決める（Access）  
3. オリジンの「どう届けるか」をポート開放から外す（Tunnel）  
4. 訪問者↔オリジンの経路を暗号化する（SSL/TLS Full strict）  
5. オリジンが「接続元が Cloudflare か」を確かめる（Authenticated Origin Pulls）  
6. 痛いパスの「何回まで通すか」を決める（本記事の Rate limiting）  

出典（いずれも Cloudflare 公式ドキュメント）:

- https://developers.cloudflare.com/waf/rate-limiting-rules/
- https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/
- https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
- https://developers.cloudflare.com/waf/rate-limiting-rules/#availability
- https://developers.cloudflare.com/waf/rate-limiting-rules/request-rate/
- https://developers.cloudflare.com/use-cases/solutions/stop-account-takeover-attacks/

合同会社スタジオフーズでは、Cloudflare を含むネットワーク・アクセス設計や、業務システムの DX 支援も扱っています。ログインやフォームへの回数上限の入れ方を整えたい場合は、ご相談ください。

※本稿は2026年9月時点の公開ドキュメントにもとづく一般的な解説です。プラン上限や手順は変更されうるため、導入時は公式を確認してください。攻撃・回避手順は扱いません。

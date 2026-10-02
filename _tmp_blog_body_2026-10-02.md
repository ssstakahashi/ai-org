## ブラウザに渡す「最小セキュリティヘッダ」

これまでのシリーズでは、誰が入口を通れるか（Access）、リクエストの中身（WAF）、機械アクセスのコスト（Bot Fight Mode）、届け方（Tunnel）、経路の暗号化（SSL/TLS Full strict）、オリジン側での Cloudflare 検証（Authenticated Origin Pulls）、痛いパスの回数上限（Rate Limiting）、フォーム送信直前の人間っぽさ確認（Turnstile）を順に整理してきました。

本記事の主題は、その隣に置く **ブラウザへ返す HTTP 応答ヘッダの最小セット** です。Cloudflare では、よく使う組み合わせをワンクリックで入れる **Managed Transforms（Add security headers）** と、ヘッダを個別に足し引きする **Response Header Transform Rules** が用意されています。あわせて、HTTPS 強制をブラウザに覚えてもらう **HSTS（HTTP Strict Transport Security）** は Edge Certificates 側の設定として補完します。

公式（Transform Rules 概要）: https://developers.cloudflare.com/rules/transform/

公式（Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/

公式（Response Header Transform Rules）: https://developers.cloudflare.com/rules/transform/response-header-modification/

※本記事は防御設計の一般解説です。攻撃手順や回避方法は扱いません。プラン上限やダッシュボードUI、手順は変更されうるため、導入時は公式ドキュメントに従ってください。

## 何を守るか——応答ヘッダが担う「ブラウザ側の約束」

WAF や Rate Limiting は「リクエストがオリジンへ届く前」の層です。一方、セキュリティヘッダは **すでに応答が返ったあと、ブラウザがどう振る舞うか** を指示する層です。典型的な役割は次のとおりです（名称と意味は MDN / Cloudflare 公式の一般解説に沿います）。

| ヘッダ（例） | ざっくりの役割 |
| --- | --- |
| `X-Content-Type-Options: nosniff` | 宣言した Content-Type 以外への勝手な解釈を抑える |
| `X-Frame-Options: SAMEORIGIN` | 他サイトの iframe 埋め込みを制限（クリックジャッキング対策の古典的手段） |
| `Referrer-Policy: same-origin` | 遷移時に渡す参照元情報の量を抑える |
| `X-XSS-Protection` | 古いブラウザ向けのレガシー設定（Managed Transforms の Add security headers に含まれる） |
| `Expect-CT` | Certificate Transparency 関連（同上。現行の意味合いは変化しうる） |
| `Strict-Transport-Security`（HSTS） | 一定期間、HTTPS のみで接続するようブラウザに指示 |

ポイントは、「ヘッダを足せばサイトが絶対安全になる」わけではないことです。オリジン側の設計・入力検証・権限管理・WAF などと **重ねて使う基礎レイヤ** として捉えるのが扱いやすいです。

## WAF・SSL・Access との役割分担

シリーズ内での切り分けは次のイメージです。

- **WAF / Bot Fight Mode / Rate Limiting / Turnstile**: 怪しい・痛いリクエストを途中で止める／コストを上げる／回数を抑える／フォーム直前で確認する
- **Access**: 管理画面など「誰が入れるか」を決める
- **SSL/TLS Full (strict) / Authenticated Origin Pulls**: 経路の暗号化とオリジン側での Cloudflare 検証
- **本記事（Managed Transforms / Response Header Transform Rules + HSTS）**: **ブラウザへ返す約束事**（埋め込み制限・MIME スニッフィング抑制・参照元制御・HTTPS 継続など）

どれか1つで全部を賄う、というより、守る場所が違うので重ねます。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460" role="img" aria-label="WAF SSL Access とセキュリティヘッダの役割分担">
  <rect width="720" height="460" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">何を見るか（リクエスト層 / 経路層 / 応答ヘッダ層）</text>
  <!-- Request layer -->
  <rect x="20" y="48" width="220" height="200" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="130" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">リクエスト層（別記事）</text>
  <text x="40" y="110" font-family="sans-serif" font-size="12" fill="#1d4ed8">WAF / Bot Fight Mode</text>
  <text x="40" y="132" font-family="sans-serif" font-size="12" fill="#1d4ed8">Rate Limiting / Turnstile</text>
  <text x="40" y="164" font-family="sans-serif" font-size="12" fill="#1e40af">見るもの:</text>
  <text x="40" y="186" font-family="sans-serif" font-size="12" fill="#1d4ed8">届く前の質・回数・</text>
  <text x="40" y="208" font-family="sans-serif" font-size="12" fill="#1d4ed8">人間っぽさ確認</text>
  <!-- Path layer -->
  <rect x="250" y="48" width="220" height="200" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="360" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">経路・入口層（別記事）</text>
  <text x="270" y="110" font-family="sans-serif" font-size="12" fill="#c2410c">SSL Full strict / AOP</text>
  <text x="270" y="132" font-family="sans-serif" font-size="12" fill="#c2410c">Access / Tunnel</text>
  <text x="270" y="164" font-family="sans-serif" font-size="12" fill="#9a3412">見るもの:</text>
  <text x="270" y="186" font-family="sans-serif" font-size="12" fill="#c2410c">暗号化・オリジン検証</text>
  <text x="270" y="208" font-family="sans-serif" font-size="12" fill="#c2410c">誰が管理入口を通るか</text>
  <!-- Response headers -->
  <rect x="480" y="48" width="220" height="200" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="590" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">応答ヘッダ層（本記事）</text>
  <text x="500" y="110" font-family="sans-serif" font-size="12" fill="#047857">Managed Transforms</text>
  <text x="500" y="132" font-family="sans-serif" font-size="12" fill="#047857">Response Header Rules</text>
  <text x="500" y="154" font-family="sans-serif" font-size="12" fill="#047857">＋ HSTS（Edge Cert）</text>
  <text x="500" y="186" font-family="sans-serif" font-size="12" fill="#065f46">見るもの:</text>
  <text x="500" y="208" font-family="sans-serif" font-size="12" fill="#047857">ブラウザへの約束事</text>
  <!-- bottom -->
  <rect x="20" y="268" width="680" height="160" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1"/>
  <text x="360" y="298" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#334155">重ね方のイメージ</text>
  <text x="40" y="330" font-family="sans-serif" font-size="12" fill="#475569">リクエスト層＝届く前に止める／減らす。経路層＝暗号化と入口の身元。応答ヘッダ層＝返したあとのブラウザ挙動。</text>
  <text x="40" y="358" font-family="sans-serif" font-size="12" fill="#475569">Managed Transforms の Add security headers はゾーン全体へ一括。細かい例外は Response Header Transform Rules。</text>
  <text x="40" y="386" font-family="sans-serif" font-size="12" fill="#475569">HSTS は Managed Transforms には含まれない。Edge Certificates の HSTS（または独自 Transform Rule）で補う。</text>
  <text x="40" y="414" font-family="sans-serif" font-size="12" fill="#475569">ヘッダだけでは足りない。WAF・Access・入力検証とセットで見る（公式も影響・検証を注意喚起）。</text>
</svg>
<figcaption>図1. リクエスト層・経路層と、本記事の応答ヘッダ層の役割分担</figcaption>
</figure>

## Managed Transforms とは（Free でも使える「プリセット」）

公式の説明では、Managed Transforms は **よくある HTTP リクエスト／レスポンスヘッダの調整を、あらかじめ用意されたワンステップ設定で行う** 仕組みです。有効にすると、Cloudflare 内部で Transform Rules 相当がデプロイされます。これらの内部ルールは、プランごとの Transform Rules 本数上限にはカウントされない、と公式は説明しています。また、有効化した Managed Transforms は **そのゾーンへのインバウンドリクエスト全体** に適用されます。

公式（Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/

応答側で中小向けに最初に検討しやすいのは次の2つです（Available Managed Transforms のレスポンス項目）。

1. **Add security headers**（`add_security_headers`）
2. **Remove "X-Powered-By" headers**（`remove_x-powered-by_header`）

Add security headers が追加する値は、公式リファレンス時点で次のとおりです。

- `x-content-type-options: nosniff`
- `x-xss-protection: 1; mode=block`
- `x-frame-options: SAMEORIGIN`
- `referrer-policy: same-origin`
- `expect-ct: max-age=86400, enforce`

公式は「サイトへの影響（リソースのブロックや証明書エラーなど）がありうる」「問題があれば Managed Transform を無効にして原因切り分けを」と注意しています。また、保護を強めるなら **HSTS を別途有効にする** よう案内しています（HSTS 自体は Add security headers のセットには含まれません）。

公式（Available Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/reference/

### Transform Rules の本数上限（Free 目安）

独自の Response Header Transform Rules を足す場合は、プラン上限を意識します。公式の Transform Rules Availability 表（公開ドキュメント）では、Free は **Active Transform Rules 10**、Pro は 25、といった目安です。正規表現サポートは Free/Pro では不可、Business 以上で可、とされています。Managed Transforms 由来の内部ルールは、この本数カウント外、という公式の説明です。

導入直前に公式表を再確認してください。

公式（Transform Rules Availability）: https://developers.cloudflare.com/rules/transform/

## 中小企業向け最小導入の順序（Before / After）

食品卸・バックオフィス受託・小規模のコーポレートサイトでは、「全部を一度に厳密化」より、**まずプリセットを入れ、表示崩れがないか確認し、必要なら例外だけ Transform Rule で調整** する順が現実的です。SSL/TLS の Full (strict) と Always Use HTTPS が先に整っていると、HSTS の議論も進めやすくなります（別記事の前提）。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="500" viewBox="0 0 720 500" role="img" aria-label="セキュリティヘッダ導入のBefore Afterと推奨順序">
  <rect width="720" height="500" fill="#f8fafc" rx="8"/>
  <text x="360" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After と導入順序（セキュリティヘッダ最小）</text>
  <!-- Before -->
  <rect x="20" y="48" width="330" height="150" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="185" y="76" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before（よくある公開サイト）</text>
  <text x="40" y="108" font-family="sans-serif" font-size="12" fill="#7f1d1d">• SSL は有効でも応答ヘッダは未整備</text>
  <text x="40" y="132" font-family="sans-serif" font-size="12" fill="#7f1d1d">• X-Powered-By が残っていることがある</text>
  <text x="40" y="156" font-family="sans-serif" font-size="12" fill="#7f1d1d">• iframe / MIME / Referrer の方針が曖昧</text>
  <text x="40" y="180" font-family="sans-serif" font-size="12" fill="#7f1d1d">• HSTS 未設定、または max-age 未検討</text>
  <!-- After -->
  <rect x="370" y="48" width="330" height="150" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="535" y="76" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After（最小セット）</text>
  <text x="390" y="108" font-family="sans-serif" font-size="12" fill="#065f46">• Add security headers を有効化</text>
  <text x="390" y="132" font-family="sans-serif" font-size="12" fill="#065f46">• Remove X-Powered-By を検討</text>
  <text x="390" y="156" font-family="sans-serif" font-size="12" fill="#065f46">• 主要ページで応答ヘッダを実測</text>
  <text x="390" y="180" font-family="sans-serif" font-size="12" fill="#065f46">• HTTPS 安定後に HSTS を段階導入</text>
  <!-- Steps -->
  <rect x="20" y="220" width="680" height="250" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="360" y="250" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">推奨順序（公式 Configure / Create dashboard の一般化）</text>
  <text x="40" y="282" font-family="sans-serif" font-size="12" fill="#064e3b">① DNS が Cloudflare プロキシ（オレンジ雲）であること、HTTPS が日常運用で安定していることを確認</text>
  <text x="40" y="308" font-family="sans-serif" font-size="12" fill="#064e3b">② Rules → Settings → Managed Transforms で「Add security headers」を ON（影響が出たら修正可）</text>
  <text x="40" y="334" font-family="sans-serif" font-size="12" fill="#064e3b">③ 同じく「Remove X-Powered-By headers」を検討（情報露出の低減）</text>
  <text x="40" y="360" font-family="sans-serif" font-size="12" fill="#064e3b">④ トップ・問い合わせ・管理入口など主要URLで応答ヘッダを確認（開発者ツール／curl 等）</text>
  <text x="40" y="386" font-family="sans-serif" font-size="12" fill="#064e3b">⑤ 埋め込みが必要なページだけ Response Header Transform Rule で例外調整</text>
  <text x="40" y="412" font-family="sans-serif" font-size="12" fill="#064e3b">⑥ Edge Certificates で HSTS を短い max-age から段階導入（要件・注意を公式で再確認）</text>
  <text x="40" y="438" font-family="sans-serif" font-size="12" fill="#064e3b">⑦ 問題が続く場合は Managed Transform を切り、部分実装の Transform Rule に落とす（公式推奨の切り分け）</text>
</svg>
<figcaption>図2. Before / After と、Managed Transforms → 実測 → 例外 → HSTS の推奨順序</figcaption>
</figure>

## 手順1: Managed Transforms で Add security headers を入れる

公式の Configure Managed Transforms では、ダッシュボード操作はおおむね次のとおりです。

1. Cloudflare ダッシュボードで対象ゾーンを開く
2. **Rules → Settings**（Rules Settings）へ移動
3. **Managed Transforms** タブで、目的の項目のトグルを有効／無効にする
4. プランや製品契約によって、一部の Managed Transforms が使えない場合がある

公式（Configure Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/configure/

中小向け最小では、まず次を候補にします。

- **Add security headers** を ON
- （任意）**Remove "X-Powered-By" headers** を ON

有効化後は、トップページと問い合わせフォーム、可能ならログインや管理画面の手前までをブラウザで開き、次を確認します。

- レイアウト崩れ・フォントやスクリプトの読み込み失敗がないか
- iframe 埋め込み（YouTube、地図、外部ウィジェット）が意図どおり動くか
- 外部ドメインへの遷移や計測タグが、Referrer-Policy の影響で困っていないか

公式が注意しているとおり、問題が出たら **いったん Managed Transform を OFF にして再現するかどうか** を切り分けるのが先です。

## 手順2: 必要なら Response Header Transform Rules で例外を足す

Managed Transforms はゾーン全体一括です。「コーポレートサイト全体は SAMEORIGIN でよいが、特定パスだけ埋め込みを許したい」「Referrer-Policy を `strict-origin-when-cross-origin` に変えたい」などが出たら、**Response Header Transform Rules** で個別に Set / Add / Remove します。

公式のダッシュボード手順の要点は次のとおりです。

1. **Rules → Overview** を開く
2. **Create rule → Response Header Transform Rule**
3. ルール名を付け、適用範囲（全リクエスト／カスタム式）を選ぶ
4. 操作を選ぶ（Add static / Set static / Remove など）
5. ヘッダ名と値を入れ、必要なら同一ルール内で複数ヘッダを指定（公式は1ルールあたり最大30ヘッダと記載）
6. **Deploy**（または下書き保存）

公式（Create in the dashboard）: https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/

中小向けの使い方の例（あくまで運用判断のイメージです。値は自社要件で決めてください）。

| 目的 | 操作のイメージ |
| --- | --- |
| 特定パスだけ `X-Frame-Options` を外す／緩める | パス条件付きで Remove または Set |
| Managed の Referrer-Policy を別値に上書き | Set static で希望値を指定 |
| オリジンが既に付けているヘッダと衝突する | Set で上書きするか、オリジン側を整理 |

Transform Rules を使う前提として、対象ホストの DNS が Cloudflare プロキシである必要があります（公式の Transform Rules 注記）。また Free では Active Transform Rules の本数に上限があるため、**例外ルールを増やしすぎない** ことも運用上のポイントです。

## 手順3: HSTS は Edge Certificates で段階導入

Managed Transforms の Add security headers は HSTS を含めません。公式は「保護を強めるなら HSTS を有効に」と案内しています。HSTS は Cloudflare では **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)** から設定します（Free でも利用可、と公式 Availability 表）。

公式（HSTS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

導入前に公式が挙げる要件・注意の要約です。

- 先に HTTPS が有効で、ブラウザが HSTS を受け取れる状態であること
- 有効後は、DNS を DNS only に戻す・Cloudflare を一時停止する・ネームサーバを外す・HTTPS を HTTP に戻す、などを避ける
- max-age の期間中に HTTPS を外すと、訪問者がサイトへ到達しにくくなる可能性がある
- `includeSubDomains` や Preload は、サブドメインの HTTPS 準備が甘いと影響が大きい
- 無効化したいときは、まず max-age を 0（Disable）にする、という公式手順がある

中小向けの現実的な進め方は次のイメージです（数値は例・目安であり、規範ではありません）。

1. Always Use HTTPS と SSL/TLS Full (strict) が安定運用できていることを確認（別記事）
2. HSTS を有効にし、**短い max-age** から始める
3. 問題がなければ段階的に延ばす
4. `includeSubDomains` / Preload は、サブドメインの HTTPS と運用体制が整ってから検討
5. Preload リストへの申請は、公式が示す最小 max-age などの条件を満たしてから（ブラウザ側のリスト運用あり）

HSTS をサブドメイン単位や独自値で付けたい場合は、公式も「オリジンで付ける」「Response Header Transform Rule を使う」などの代替を案内しています。

## よくある失敗と限界

現場で起きやすいすれ違いは次のとおりです。

1. **ヘッダだけで安心してしまう**  
   応答ヘッダはブラウザへの約束です。SQL インジェクションや権限不備、管理画面の露出は WAF / Access / アプリ側の話です。

2. **iframe 埋め込みを忘れて SAMEORIGIN を入れる**  
   地図・動画・外部予約ウィジェットが消えることがあります。公式も影響を注意喚起しています。例外パスを先に洗い出すか、問題時に Managed Transform を切って切り分けます。

3. **HSTS を最初から長く・広く入れる**  
   max-age 長期＋ includeSubDomains ＋ Preload を一気にやるのは、HTTPS が揺れている環境では手戻りが大きいです。段階導入が無難です。

4. **オリジンと Cloudflare の二重設定で値が揺れる**  
   オリジンが既にヘッダを付けている場合、どちらが最終値になるかを実測で確認します。Response Header Transform Rules の Set は既存値の上書き用途として使えます。

5. **Transform Rules を増やしすぎる**  
   Free の Active 本数上限に近づくと、本当に必要なルールが足せなくなります。まずは Managed Transforms、例外だけ個別ルール、が扱いやすいです。

6. **レガシーヘッダの意味を過大評価する**  
   `X-XSS-Protection` や `Expect-CT` は歴史的経緯のある項目です。Managed Transforms のセットに含まれていても、「これだけで現代的な XSS 対策が完了」とは限りません。Content-Security-Policy など、より詳細な方針は別途設計が必要です（本記事の最小導入範囲外）。

## 検証のしかた（攻撃ではなく確認）

導入後の確認は、ブラウザの開発者ツール（Network → 対象レスポンスの Response Headers）や、自社端末からの `curl -sI https://example.com/` のような **自サイトへの応答ヘッダ確認** で十分です。第三者への負荷試験や攻撃ツールの話はしません。

確認したい項目の例です。

- `x-content-type-options` が付いているか
- `x-frame-options` または後続で導入する frame-ancestors 相当の方針が意図どおりか
- `referrer-policy` の値
- HSTS を入れたあとは `strict-transport-security` の有無と max-age
- `x-powered-by` が意図どおり消えているか

計測タグや外部埋め込みを使っているページは、**見た目だけでなくコンソールエラー** も一度見ると安心です。

## これまでのシリーズとの位置づけ

- **Access / Zero Trust**: 誰が入口を通れるか（別記事）
- **WAF / Bot Fight Mode**: リクエストの質と自動アクセスのコスト（別記事）
- **Tunnel**: オリジンへどう届けるか（別記事）
- **SSL/TLS Full (strict) / Authenticated Origin Pulls**: 経路の暗号化とオリジン側の検証（別記事）
- **Rate Limiting Rules**: マッチした通信の「何回まで通すか」（別記事）
- **Turnstile**: フォーム送信直前の人間っぽさ確認（別記事）
- **本記事（Managed Transforms / Response Header Transform Rules + HSTS）**: ブラウザへ返す最小のセキュリティヘッダ

公開サイトの「応答の約束」は本記事、管理画面の「誰が入れるか」は Access、痛いパスの連投は Rate Limiting、問い合わせ送信直前は Turnstile、という切り分けが扱いやすいです。

## チェックリスト（導入・運用）

- [ ] 対象ゾーンの DNS が Cloudflare プロキシになっている
- [ ] HTTPS（可能なら Full strict と Always Use HTTPS）が日常運用で安定している
- [ ] Rules → Settings → Managed Transforms で Add security headers を有効化した
- [ ] （任意）Remove X-Powered-By headers を有効化した
- [ ] トップ・問い合わせ・埋め込みありページで表示と応答ヘッダを実測した
- [ ] iframe / 外部ウィジェットの壊れがないか確認した（壊れたら OFF して切り分け）
- [ ] 例外が必要なパスだけ Response Header Transform Rule を追加した（本数上限に注意）
- [ ] HSTS は短い max-age から段階導入し、includeSubDomains / Preload は準備ができてから検討した
- [ ] ヘッダは基礎レイヤであり、WAF / Access / アプリ側対策と役割分担していることを関係者で共有した
- [ ] プラン上限・UI・ヘッダセットは変わりうるため、公式ドキュメントを導入時に再確認した

## まとめ

セキュリティヘッダは、WAF や Access の代わりではなく、**ブラウザに渡す約束事をエッジでそろえる** ための基礎です。中小企業向けの最小導入としては、次の順が扱いやすいです。

1. Managed Transforms の **Add security headers** を入れる  
2. 必要なら **Remove X-Powered-By** も入れる  
3. 主要ページで実測し、影響があれば切り分け・例外ルールへ落とす  
4. HTTPS が安定してから **HSTS** を短い期間から段階導入する  

Studio Foods のような食品卸・バックオフィス・小さな公開サイトでも、「まずプリセット、次に例外、最後に HSTS」の順なら、情シス不在に近い体制でも進めやすいです。設定値の最終判断は自社の埋め込み要件と HTTPS 運用に合わせてください。手順やプラン上限は公式ドキュメントが正です。

公式（Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/

公式（Available Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/reference/

公式（Configure Managed Transforms）: https://developers.cloudflare.com/rules/transform/managed-transforms/configure/

公式（Response Header Transform Rules）: https://developers.cloudflare.com/rules/transform/response-header-modification/

公式（Create Response Header Transform Rule）: https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/

公式（HSTS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

公式（Transform Rules）: https://developers.cloudflare.com/rules/transform/

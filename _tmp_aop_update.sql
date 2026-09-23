UPDATE blog_posts SET body = '## Full (strict)の次の層。「誰がオリジンに接続しているか」を見る

前回のシリーズでは、訪問者 ↔ Cloudflare ↔ オリジンの経路を **Full (strict)** で暗号化し、オリジン証明書まで検証する最小導入を整理しました。そこでは「Cloudflare がオリジンを信頼できるか」を見ていました。

本記事の主題は、その逆方向です。**オリジン側が、接続してきたクライアントが Cloudflare であることを検証する**仕組み——公式名は **Authenticated Origin Pulls（AOP / 認証済みオリジンプル）**——です。TLS のクライアント証明書（mTLS）を使い、プロキシ経由の接続だけをオリジンが受け入れるための層として案内されています。

公式（Authenticated Origin Pulls 概要）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/

公式（Full strict・AOPへの言及）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

※本記事は防御設計の一般解説です。攻撃手順や回避方法は扱いません。プラン上限やダッシュボードUI、手順は変更されうるため、導入時は公式ドキュメントに従ってください。

## Full (strict) と Authenticated Origin Pulls の役割の違い

図で整理すると、検証の「向き」が異なります。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="400" viewBox="0 0 700 400" role="img" aria-label="Full strictとAuthenticated Origin Pullsの検証の向き">
  <rect width="700" height="400" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">誰が誰を検証するか（Full strict と AOP）</text>
  <!-- Full strict row -->
  <rect x="20" y="50" width="660" height="150" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="40" y="78" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">① Full (strict)：Cloudflare → オリジン証明書を検証</text>
  <rect x="40" y="100" width="110" height="70" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="95" y="140" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">訪問者</text>
  <text x="165" y="135" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="210" y="100" width="150" height="70" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="285" y="130" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e40af">Cloudflare</text>
  <text x="285" y="150" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e3a8a">オリジン証を検証</text>
  <text x="375" y="135" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="420" y="100" width="140" height="70" rx="6" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
  <text x="490" y="140" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#065f46">オリジン（検証済）</text>
  <text x="580" y="140" font-family="sans-serif" font-size="11" fill="#047857">サーバ証</text>
  <!-- AOP row -->
  <rect x="20" y="220" width="660" height="150" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
  <text x="40" y="248" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">② Authenticated Origin Pulls：オリジン → Cloudflare クライアント証を検証</text>
  <rect x="40" y="270" width="110" height="70" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="95" y="310" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">訪問者</text>
  <text x="165" y="305" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="210" y="270" width="150" height="70" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="285" y="300" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e40af">Cloudflare</text>
  <text x="285" y="320" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e3a8a">クライアント証を提示</text>
  <text x="375" y="305" font-family="sans-serif" font-size="11" fill="#2563eb">mTLS</text>
  <rect x="420" y="270" width="140" height="70" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="490" y="300" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e3a8a">オリジン</text>
  <text x="490" y="320" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e40af">クライアント証を検証</text>
  <text x="580" y="310" font-family="sans-serif" font-size="11" fill="#1e40af">CFのみ</text>
</svg>
<figcaption>図1. Full (strict) は Cloudflare がオリジンのサーバ証明書を検証し、Authenticated Origin Pulls はオリジンが Cloudflare のクライアント証明書を検証する</figcaption>
</figure>

要約すると次のとおりです。

| 層 | 誰が検証するか | 何を見るか |
| --- | --- | --- |
| Full (strict) | Cloudflare | オリジンのサーバ証明書（有効期限・CA・CN/SAN） |
| Authenticated Origin Pulls | オリジン | Cloudflare が提示するクライアント証明書（mTLS） |

公式の説明では、AOP は Full または Full (strict) のうえで、オリジンへのリクエストが Cloudflare ネットワーク経由であることを追加で確かめる層です。Encryption mode が **Off** や **Flexible** のときは AOP は適用されません。

また公式は、オリジンの IP が知られた場合に Cloudflare を経由せず直接届く通信を抑えたい場面で、WAF などと組み合わせると「WAF を通過したリクエストだけがオリジンに届く」方向になると案内しています。本記事ではその防御の考え方だけを示し、具体的な回避や検証用の攻撃手順は扱いません。

## これまでのシリーズとの位置づけ

- **Access / Zero Trust**: 誰が入口を通れるか（別記事）
- **WAF / Bot Fight Mode**: リクエストの中身や自動アクセスのコスト（別記事）
- **Tunnel**: オリジンへどう届けるか。外向き接続で inbound を開かない選択（別記事）
- **SSL/TLS Full (strict)**: 経路を暗号化し、オリジン証明書を検証する（前回）
- **Authenticated Origin Pulls（本記事）**: オリジン側で「接続元が Cloudflare か」をクライアント証明書で確かめる

届け方が **Cloudflare Tunnel** の場合は注意が必要です。公式は「AOP は Cloudflare Tunnel 経由のオリジンとは互換ではない」と明記しています。Tunnel はオリジンからの外向き接続であり、Cloudflare がクライアント証明書を提示する inbound リスナーが無いためです。Tunnel で届ける構成では、コネクタ側の認証ですでにオリジン側の到達経路が絞られている、というのが公式の整理です。AOP のダッシュボード設定をオンにしても、そのホスト名の Tunnel トラフィックには効果がありません。

公式（Tunnel 非互換の注意・概要ページ内）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/

公開オリジンを inbound で受けている場合に AOP を検討し、Tunnel のみで公開している場合は公式の Tunnel ドキュメント側の前提を先に確認してください。

## 設定レベルの選び方（Global / Zone / Per-hostname）

公式は AOP を **3つの独立した設定レベル** として説明しています。どれか一つを有効・無効にしても、他のレベルは自動では変わりません。

1. **Global（ゾーン全体・Cloudflare提供証明書）**  
   全アカウントで共有される Cloudflare 提供のクライアント証明書を使う。設定が最も簡単で、「Cloudflare ネットワークからの接続であること」までは示せる。ただし「自アカウント専用」までは保証しない。
2. **Zone-level（ゾーン全体・自前証明書）**  
   自分で用意した証明書をアップロードする。アカウント専用の証明書になるため、Global より厳しい。ゾーンのプロキシ済みトラフィック全体に適用。Zone-level は Global より優先。
3. **Per-hostname（ホスト名単位・自前証明書）**  
   特定ホスト名だけ別証明書にする。Zone-level / Global より優先。

中小企業の公開サイトで「まず最小」なら、多くの場合 **Global** から入り、運用と証明書管理に余裕が出たら Zone-level を検討する、という段階が扱いやすいです。自アカウント専用や FIPS 対応が必要な場合は、公式どおり自前証明書（Zone-level / Per-hostname）が必要です。

公式（設定レベル・可用性）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/

公式（Global セットアップ）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/global/

公式（Zone-level セットアップ）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/zone-level/

可用性は Free / Pro / Business / Enterprise いずれも Yes、と公式の表にあります（導入時点の表を再確認してください）。

## 中小企業向け最小導入の順序（Before / After）

いきなりオリジンでクライアント証明書を必須にすると、設定ミスのときにサイト全体が届かなくなることがあります。公式の手順も「まず任意（optional）で受け、動作確認してから必須（require / on）にする」流れです。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420" role="img" aria-label="AOP導入のBefore Afterと推奨順序">
  <rect width="700" height="420" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After と導入順序（AOP最小）</text>
  <!-- Before -->
  <rect x="20" y="50" width="320" height="130" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="180" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before（よくある公開オリジン）</text>
  <text x="40" y="110" font-family="sans-serif" font-size="12" fill="#7f1d1d">• Full (strict) で経路は暗号化済み</text>
  <text x="40" y="134" font-family="sans-serif" font-size="12" fill="#7f1d1d">• オリジンは「誰からのTLSか」は未検証</text>
  <text x="40" y="158" font-family="sans-serif" font-size="12" fill="#7f1d1d">• オリジンIPが分かると直接接続の余地</text>
  <!-- After -->
  <rect x="360" y="50" width="320" height="130" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="520" y="78" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After（AOPをオリジンで必須化）</text>
  <text x="380" y="110" font-family="sans-serif" font-size="12" fill="#065f46">• CFがクライアント証明書を提示</text>
  <text x="380" y="134" font-family="sans-serif" font-size="12" fill="#065f46">• オリジンが提示証を検証して受理</text>
  <text x="380" y="158" font-family="sans-serif" font-size="12" fill="#065f46">• 証なしの直接接続は拒否側へ</text>
  <!-- Steps -->
  <rect x="20" y="200" width="660" height="195" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="350" y="230" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">推奨順序（公式手順に沿った一般化）</text>
  <text x="40" y="262" font-family="sans-serif" font-size="12" fill="#7c2d12">① Encryption mode を Full 以上（できれば Full strict）にする</text>
  <text x="40" y="288" font-family="sans-serif" font-size="12" fill="#7c2d12">② オリジンへ CA / Cloudflare AOP 用 PEM を置き、クライアント証を任意受付</text>
  <text x="40" y="314" font-family="sans-serif" font-size="12" fill="#7c2d12">③ ダッシュボードで Global（または Zone）AOP を On</text>
  <text x="40" y="340" font-family="sans-serif" font-size="12" fill="#7c2d12">④ プロキシ経由の正常応答を確認してから、オリジンで検証を必須化</text>
  <text x="40" y="366" font-family="sans-serif" font-size="12" fill="#7c2d12">⑤ Tunnel のみ公開なら AOP 対象外。公式の Tunnel 前提を先に確認</text>
</svg>
<figcaption>図2. Full (strict) 後の Before/After と、任意受付→有効化→必須化の導入順序</figcaption>
</figure>

### 前提チェック

1. **Encryption mode が Full 以上**  
   Global / Zone-level いずれのセットアップ案内でも、「Full またはそれ以上」が前提です。Flexible のままでは AOP の前提を満たしません。できれば前回どおり Full (strict) を先に安定させてください。
2. **オリジンが inbound の HTTPS を受けている**  
   公開 IP 上で 443 を待ち受け、Cloudflare から接続される構成が対象です。Tunnel のみの場合は本機能の対象外（非互換）です。
3. **証明書の取り違えに注意**  
   Global AOP 用に公式が配布する Authenticated Origin Pull 用 PEM は、**Cloudflare Origin CA 証明書とは別物**です。Full (strict) 用の Origin CA と混同しないでください。

### Global の最小ステップ（概要）

公式の Global 手順を、中小企業向けに噛み砕くと次の順です。詳細なディレクティブ名やファイルパスは、導入時点の公式と Web サーバのドキュメントに従ってください。

1. 公式ページから **Authenticated Origin Pull 用証明書（.PEM）** を取得し、オリジンに配置する。  
2. オリジン（Apache / NGINX 等）でクライアント証明書の検証を **いったん任意（optional）** で受けられるようにする。  
3. ダッシュボードの Origin Server → Authenticated Origin Pulls で **Global を On** にする（API ではゾーン設定 `tls_client_auth`）。  
4. プロキシ経由でサイトが通常どおり応答することを確認する。  
5. 問題なければオリジン側を **必須（require / on）** に切り替える。

公式（Global）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/global/

「必須化する前に任意で様子を見る」のは、証明書パスの誤りやトグルの入れ忘れで全面障害になるのを避けるための実務的な順序です。

### Zone-level を選ぶとき（概要）

Zone-level は自前のリーフ証明書を Cloudflare にアップロードし、その発行に使った CA をオリジンに置く構成です。公式は OpenSSL での生成例、ダッシュボード／API でのアップロード、オリジン設定、Zone-level トグルの有効化、その後の必須化、という順を示しています。

ポイントだけ抜粋します。

- アップロードするのは **リーフ証明書**（ルート CA を上げると失敗する、と公式）。
- Zone-level の有効化 API は、Global の `tls_client_auth` とは **別エンドポイント**。取り違えない。
- 動作確認後にオリジンで検証を必須化する流れは Global と同じ。
- 証明書期限アラート（例: 30日・14日前）を公式の通知機能で受けられる。

公式（Zone-level）: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/zone-level/

中小企業で「まずは Cloudflare ネットワーク経由であること」を足したいだけなら Global で足りることが多く、アカウント専用証明書が必要になった段階で Zone-level に進む、という分け方が現実的です。

## 向いている場面・向いていない場面

**向きやすい例**

- すでに Full または Full (strict) で安定している公開サイト・LP・コーポレートサイト
- オリジンが inbound HTTPS を受けており、IP が露出している（または将来露出しうる）構成
- WAF / Bot Fight Mode / Access と並べて、「エッジを通った通信だけをオリジンが受ける」方向を揃えたい場合

**最初から AOP を必須にしない方がよい例**

- Encryption mode がまだ Flexible または Off
- オリジン証明書や Full (strict) が不安定で、526 などが続いている
- **Cloudflare Tunnel のみ**で公開しており、inbound リスナーが無い（公式どおり AOP 非互換）
- 複数オリジン・ロードバランサ・CDN 併用で、クライアント証明書の配布経路が整理できていない

Tunnel 記事で inbound を閉じた構成に寄せている場合は、AOP より先に「いまの届け方が Tunnel か、公開オリジンか」を確認するのが先です。

## 運用上の注意（一般解説）

- **段階導入**: 任意受付 → Cloudflare 側 On → 必須化。いきなり必須だけを入れると、証明書未配置時に全面エラーになりやすい。
- **証明書の種別**: AOP 用 PEM と Origin CA、エッジ証明書を混同しない。
- **レベルは独立**: Global / Zone / Per-hostname は別スイッチ。意図しない二重設定に注意し、優先順位（Per-hostname > Zone > Global）を公式どおり把握する。
- **WAF との関係**: 公式は AOP と WAF を組み合わせると、オリジンに届く前にエッジで評価される、と説明しています。WAF のルール設計自体は別記事の範囲です。
- **確認方法**: 公式は設定後、オリジンへ直接向けた確認で証明書検証が効いているかを見る、と案内しています。本記事では具体的な回避手順や攻撃例は示しません。検証は自社の検証環境と公式手順に従ってください。
- **プラン・UI**: Free でも利用可能と公式表にありますが、画面文言や API パスは変わり得ます。作業直前に公式を開き直してください。

## まとめ

Authenticated Origin Pulls は、Full (strict) が担う「Cloudflare がオリジンを検証する」層の次に置く、**オリジンが Cloudflare を検証する**最小の追加層です。中小企業向けの実務的な順序は次のとおりです。

1. Full 以上（できれば Full (strict)）を安定させる  
2. 公開オリジン（inbound）であるか確認する。Tunnel のみなら公式どおり AOP は対象外  
3. Global なら公式 PEM をオリジンに置き、任意受付で動作確認  
4. ダッシュボードで AOP を On にする  
5. 問題なければオリジンでクライアント証明書検証を必須化する  
6. 自アカウント専用が必要なら Zone-level / Per-hostname を公式手順で検討する  

シリーズの積み上げイメージは次のとおりです。

1. 公開サイトの入口を薄くする（Bot Fight Mode / WAF）  
2. 管理画面の「誰が入れるか」を決める（Access）  
3. オリジンの「どう届けるか」をポート開放から外す（Tunnel）  
4. 訪問者↔オリジンの経路を暗号化する（SSL/TLS Full strict）  
5. オリジンが「接続元が Cloudflare か」を確かめる（本記事の AOP）  

出典（いずれも Cloudflare 公式ドキュメント）:

- https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/
- https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/global/
- https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up/zone-level/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/

合同会社スタジオフーズでは、Cloudflare を含むネットワーク・アクセス設計や、業務システムの DX 支援も扱っています。オリジンの HTTPS 方針や Authenticated Origin Pulls の入れ方を整えたい場合は、お気軽にご相談ください。

※本稿は2026年9月時点の公開ドキュメントにもとづく一般的な解説です。プラン上限や手順は変更されうるため、導入時は公式を確認してください。攻撃・回避手順は扱いません。
', updated_at = '2026-09-23 08:30:00' WHERE slug = 'cloudflare-authenticated-origin-pulls-minimum-for-smb';
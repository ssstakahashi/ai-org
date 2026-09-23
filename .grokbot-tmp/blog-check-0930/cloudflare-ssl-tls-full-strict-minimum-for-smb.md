# 訪問者とオリジンのあいだを暗号化する。Cloudflare SSL/TLS（Full strict）の最小導入

<!-- id=blog_02f3ea13-6ceb-40d5-9d29-12f84ce2d03e dest=studiofoods_hp -->

## Excerpt
訪問者↔Cloudflare↔オリジンの経路をどう暗号化するかを、Encryption mode・Always Use HTTPS・HSTSの順で整理します。中小企業向けに Full (strict) を軸とした最小導入の考え方です。

## Body
## 「HTTPSになっている」だけでは足りないことがある

中小企業のサイトでも、ブラウザの鍵マークが出ているから安心、と思いがちです。実際には Cloudflare 配下では、次の2区間が別々に存在します。

- **訪問者 ↔ Cloudflare**（エッジ）
- **Cloudflare ↔ オリジン**（実体のサーバー）

Encryption mode（暗号化モード）は、この両区間をどう扱うかを決める設定です。訪問者側だけ HTTPS で、オリジン側が HTTP のまま、という構成も選べますが、経路全体の保護としては弱い選択になります。

本記事では、公式が推奨する方向に沿って **Full (strict)** を軸に、**Always Use HTTPS** と **HSTS** を「どの順で入れるか」まで含めた最小導入を整理します。Access（誰が入れるか）、WAF / Bot Fight Mode（リクエストの中身）、Tunnel（どう届けるか）に続く、**経路を暗号化する層**です。

公式（暗号化モード一覧）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/

公式（サイト全体を暗号化して守るユースケース）: https://developers.cloudflare.com/use-cases/solutions/encrypt-all-keep-site-secure/

※本記事は防御設計の一般解説です。攻撃手順や回避方法は扱いません。プラン上限や手順は変更されうるため、導入時は公式ドキュメントに従ってください。

## Encryption modeとは（要点だけ）

公式ドキュメントが示す中核は次のとおりです。

1. **モードは訪問者↔Cloudflare と Cloudflare↔オリジンの両方に効く**  
   「ブラウザだけ HTTPS」では、オリジン区間の扱いが別問題として残ります。
2. **Flexible**  
   Cloudflare ↔ オリジンは HTTP。実運用のセキュリティとしては避けたい選択です。
3. **Full**  
   両区間を HTTPS にするが、オリジン証明書の妥当性は検証しない（自己署名でも接続しうる）。暗号化はあるが検証は弱い。
4. **Full (strict)**  
   Full に加え、オリジン証明書を検証する。未期限・公開CAまたは Cloudflare Origin CA・CN/SAN がホスト名と一致、などが条件。満たさないと訪問者側で 526 になり得ます。
5. **推奨の方向**  
   公式は可能なら Full または Full (strict) を推奨し、特に Full (strict) を可能な限り選ぶよう案内しています。

公式（Full strict）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

公式（Full）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full/

## これまでのシリーズとの役割分担

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="380" viewBox="0 0 700 380" role="img" aria-label="Flexible・Full・Full strictの暗号化区間の違い">
  <rect width="700" height="380" fill="#f8fafc" rx="8"/>
  <text x="350" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">訪問者 — Cloudflare — オリジン（モード別の暗号化）</text>
  <!-- Flexible -->
  <rect x="20" y="45" width="660" height="95" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="40" y="70" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Flexible（避けたい）</text>
  <rect x="40" y="85" width="120" height="40" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="100" y="110" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">訪問者</text>
  <text x="175" y="108" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="220" y="85" width="140" height="40" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="290" y="110" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e40af">Cloudflare</text>
  <text x="375" y="108" font-family="sans-serif" font-size="11" fill="#dc2626">HTTP</text>
  <rect x="420" y="85" width="120" height="40" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="480" y="110" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">オリジン</text>
  <text x="560" y="110" font-family="sans-serif" font-size="11" fill="#7f1d1d">検証なし</text>
  <!-- Full -->
  <rect x="20" y="155" width="660" height="95" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="40" y="180" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">Full（暗号化あり・証明書検証なし）</text>
  <rect x="40" y="195" width="120" height="40" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="100" y="220" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">訪問者</text>
  <text x="175" y="218" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="220" y="195" width="140" height="40" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="290" y="220" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e40af">Cloudflare</text>
  <text x="375" y="218" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="420" y="195" width="120" height="40" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="480" y="220" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">オリジン</text>
  <text x="560" y="220" font-family="sans-serif" font-size="11" fill="#c2410c">自己署名可</text>
  <!-- Full strict -->
  <rect x="20" y="265" width="660" height="95" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="40" y="290" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">Full (strict)（本記事の軸）</text>
  <rect x="40" y="305" width="120" height="40" rx="6" fill="#fff" stroke="#64748b"/>
  <text x="100" y="330" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">訪問者</text>
  <text x="175" y="328" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="220" y="305" width="140" height="40" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="290" y="330" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e40af">Cloudflare</text>
  <text x="375" y="328" font-family="sans-serif" font-size="11" fill="#059669">HTTPS</text>
  <rect x="420" y="305" width="120" height="40" rx="6" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
  <text x="480" y="330" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#065f46">オリジン検証済</text>
  <text x="560" y="330" font-family="sans-serif" font-size="11" fill="#047857">CA/Origin CA</text>
</svg>
<figcaption>図1. Flexible / Full / Full (strict) における訪問者・Cloudflare・オリジン間の暗号化と検証の違い</figcaption>
</figure>

- **Access / Zero Trust**: 「誰が入口を通れるか」（別記事）
- **WAF / Bot Fight Mode**: リクエストの中身や自動アクセスのコスト（別記事）
- **Tunnel**: オリジンへ「どう届けるか」。ポート開放に頼らない外向き接続（別記事）
- **SSL/TLS（本記事）**: 訪問者↔Cloudflare↔オリジンの「経路を暗号化する」層

届け方が Tunnel でも、エッジとオリジンの証明書方針は別問題として残ります。公開サイトでは Full (strict) を軸に整え、管理画面では Access と組み合わせる、というのがシリーズ全体の積み上げです。

## 中小企業が先に入れる最小ステップ（順序が重要）

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" role="img" aria-label="オリジン証明書からHSTSまでの推奨順序">
  <rect width="700" height="340" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">推奨順序：証明書 → Full (strict) → Always Use HTTPS → HSTS</text>
  <!-- step 1 -->
  <rect x="30" y="55" width="150" height="100" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="105" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">① オリジン証明書</text>
  <text x="105" y="108" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">公開CA または</text>
  <text x="105" y="126" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">Origin CA</text>
  <text x="105" y="144" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">未期限・CN/SAN一致</text>
  <text x="195" y="110" font-family="sans-serif" font-size="20" fill="#64748b">→</text>
  <!-- step 2 -->
  <rect x="220" y="55" width="150" height="100" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="295" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">② Full (strict)</text>
  <text x="295" y="108" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#047857">両区間を暗号化</text>
  <text x="295" y="126" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#047857">＋証明書を検証</text>
  <text x="295" y="144" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">失敗時は526注意</text>
  <text x="385" y="110" font-family="sans-serif" font-size="20" fill="#64748b">→</text>
  <!-- step 3 -->
  <rect x="410" y="55" width="120" height="100" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="470" y="85" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">③ Always</text>
  <text x="470" y="102" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">Use HTTPS</text>
  <text x="470" y="126" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#78350f">http→https</text>
  <text x="470" y="144" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">mode≠Off</text>
  <text x="545" y="110" font-family="sans-serif" font-size="20" fill="#64748b">→</text>
  <!-- step 4 -->
  <rect x="570" y="55" width="100" height="100" rx="8" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="620" y="90" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#5b21b6">④ HSTS</text>
  <text x="620" y="112" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4c1d95">最後に有効化</text>
  <text x="620" y="134" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">ブラウザ強制</text>
  <!-- warning box -->
  <rect x="30" y="180" width="640" height="140" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="350" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9a3412">順序を守る理由（公式の注意に沿った一般解説）</text>
  <text x="50" y="240" font-family="sans-serif" font-size="12" fill="#7c2d12">• 先に Full (strict) を入れると、オリジン証明書が条件を満たさない場合に 526 が出ることがある</text>
  <text x="50" y="265" font-family="sans-serif" font-size="12" fill="#7c2d12">• Always Use HTTPS は暗号化モードが Off だとダッシュボード上で選べない</text>
  <text x="50" y="290" font-family="sans-serif" font-size="12" fill="#7c2d12">• HSTS は HTTPS が安定してから。早すぎる有効化やHTTPS解除は、max-ageのあいだ到達不能になりうる</text>
</svg>
<figcaption>図2. オリジン証明書 → Full (strict) → Always Use HTTPS → HSTS の推奨順序と注意点</figcaption>
</figure>

現場向けに噛み砕くと、次の順が扱いやすいです。

### 1. オリジン側に妥当な証明書を置く

Full (strict) は、オリジンが提示する証明書について次を求めます（公式の要件）。

- 有効期限内であること（`notBefore`〜`notAfter` のあいだ）
- 公開の認証局、または **Cloudflare Origin CA** が発行したものであること
- CN または SAN が、要求されるホスト名と一致すること

前提として、オリジンが 443 で HTTPS を受け付けられることも必要です。満たさないまま Full (strict) に切り替えると、訪問者は 526 エラーを見ることがあります。

**Cloudflare Origin CA** は、Cloudflare が信頼するオリジン向け無料証明書で、Full (strict) と組み合わせやすい選択肢として公式に案内されています。公開サイト用の Let's Encrypt 等とどちらを使うかは、運用方針と証明書更新のやりやすさで選んでください。

公式（Origin CA）: https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/

### 2. Encryption mode を Full (strict) にする

ダッシュボードの SSL/TLS Overview からモードを選択します。可能なら Full (strict) を第一候補にし、やむを得ない場合のみ Full を検討する、というのが公式の方向です。Flexible は、経路全体の暗号化という観点では避けたい選択です。

切り替え直後は、主要ホスト名で鍵マークとエラーの有無を確認します。526 が出る場合は、モード以前にオリジン証明書側を見直すのが先です。

### 3. Always Use HTTPS を有効にする

Always Use HTTPS は、アプリケーション内のすべてのホストについて、訪問者の `http` リクエストを `https` へリダイレクトします。暗号化モードが **Off** のときはオプション自体が見えません（または使えない）、というのが公式の注意です。

オリジン側で別途 HTTP→HTTPS リダイレクトを重ねると、ループの原因になり得ます。公式は「リダイレクトはオリジンではなく Cloudflare 側で行う」方向を勧めています。サイトの一部だけ HTTPS にできない場合は、全体強制ではなく個別リダイレクトを検討してください。

公式（Always Use HTTPS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/

### 4. HSTS は「最後」に入れる

HSTS（HTTP Strict Transport Security）は、対応ブラウザに対して「このサイトは HTTPS でアクセスせよ」とヘッダで指示する仕組みです。ブラウザ側で HTTP リンクを HTTPS に書き換えたり、証明書警告の安易な無視を抑止したりします。

公式の要件は簡潔です。

- **先に HTTPS を有効にしておく**（ブラウザが HSTS 設定を受け取れる状態）
- **HTTPS を維持する**（訪問者がサイトに届けるため）

HSTS 有効後に、DNS を DNS only へ戻す・Cloudflare を一時停止する・ネームサーバを外す・HTTPS を無効化する、といった操作は、訪問者が届かなくなる要因になり得ます。特に **max-age の期間中に HTTPS を外すと、そのあいだサイトにアクセスできなくなる**、という公式の警告があります。

そのため中小企業では、次の順が安全です。

1. 証明書と Full (strict) で HTTPS を安定させる  
2. Always Use HTTPS で http 流入を寄せる  
3. 問題がないことを確認してから HSTS を有効化する  
4. preload や includeSubDomains は、サブドメイン含めて HTTPS が揃ってから慎重に検討する  

公式（HSTS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

### 5.（任意の次の層）Authenticated Origin Pulls

Full (strict) に加え、オリジンが「Cloudflare からの接続だけを受け入れる」ための **Authenticated Origin Pulls** という選択肢もあります。本記事では深追いしません。公開オリジンをさらに絞りたい場合の次の一歩として、公式を参照してください。

※Tunnel 経由で inbound リスナーを使わない構成では、Authenticated Origin Pulls の効き方が異なる、という注意が別記事・公式にあります。届け方に Tunnel を使っている場合は、その前提で公式を確認してください。

## 向いている場面・向いていない場面

**向きやすい例**

- すでに Cloudflare プロキシ配下の公開サイト・LP・コーポレートサイト
- オリジンに証明書を置ける（または Origin CA を使える）環境
- Access / WAF / Bot Fight Mode と並べて「経路の暗号化」を揃えたい場合

**最初から Full (strict) や HSTS に一気に寄せない方がよい例**

- オリジンがまだ HTTPS を受け付けられない、または証明書のホスト名が一致しない
- サブドメインの一部だけ HTTP のまま残っている（Always Use HTTPS や HSTS の includeSubDomains が副作用を出しやすい）
- 証明書の更新運用が固まっておらず、期限切れで 526 が続くリスクが高い

## まとめ

Cloudflare の SSL/TLS 最小導入は、「鍵マークが出ている」ことではなく、**訪問者↔エッジ↔オリジンの両区間を暗号化し、オリジン証明書まで検証する**ところにあります。中小企業向けの実務的な順序は次のとおりです。

1. オリジンに妥当な証明書を置く（公開CA または Origin CA）
2. Encryption mode を **Full (strict)** にする（難しければ Full を検討し、Flexible は避ける）
3. **Always Use HTTPS** で http を https へ寄せる（mode が Off でないこと）
4. HTTPS が安定してから **HSTS** を有効化する（順序を間違えると max-age のあいだ到達不能になりうる）

シリーズの積み上げイメージは次のとおりです。

1. 公開サイトの入口を薄くする（Bot Fight Mode / WAF）
2. 管理画面の「誰が入れるか」を決める（Access）
3. オリジンの「どう届けるか」をポート開放から外す（Tunnel）
4. 訪問者↔オリジンの「経路を暗号化する」（本記事の SSL/TLS）

出典（いずれも Cloudflare 公式ドキュメント）:

- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full/
- https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/
- https://developers.cloudflare.com/use-cases/solutions/encrypt-all-keep-site-secure/

合同会社スタジオフーズでは、Cloudflare を含むネットワーク・アクセス設計や、業務システムの DX 支援も扱っています。自社サイトの HTTPS 方針やオリジン証明書の置き方を整えたい場合は、お気軽にご相談ください。

※本稿は2026年9月時点の公開ドキュメントにもとづく一般的な解説です。プラン上限や手順は変更されうるため、導入時は公式を確認してください。攻撃・回避手順は扱いません。


## Notes
Cloudflare・月水金シリーズ。2026-09-21。題材=SSL/TLS最小導入（Full strict・Always Use HTTPS・HSTSの順序）。

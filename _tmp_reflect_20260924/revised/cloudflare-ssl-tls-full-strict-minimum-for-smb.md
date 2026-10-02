## この記事だけで完結する範囲／シリーズ前提（ベンダー開示）

本記事は、**Cloudflare 配下の公開サイトで Encryption mode・Always Use HTTPS・HSTS をどの順で入れるか**を、中小企業向けに整理したものです。攻撃手順や回避方法は扱いません。

合同会社スタジオフーズは Cloudflare を含むネットワーク・アクセス設計の支援も扱っています。本稿は自社の支援経験に沿った解説であり、**AWS ACM＋ALB 等の代替スタックとの中立比較記事ではありません。**

- **この記事だけで完結する範囲**: Flexible / Full / Full (strict) の違い、導入前チェック（Go/No-Go）、推奨順序、**Error 526: Invalid SSL Certificate**（オリジン証明書が無効・期限切れなどの場合に Cloudflare が表示するエラー）時の切り戻し、HSTS 初期値、共用ホスティングで Origin CA が置けない分岐と Full 暫定の期限
- **対象外（本文では深追いしない／注記は本箱に集約）**: Access・WAF / Bot Fight Mode・Tunnel の手順、Authenticated Origin Pulls の設定、HSTS preload 申請、AWS ACM＋ALB 等との中立比較
- **最小の定義**: 「鍵マークが出ている」ではなく、訪問者↔エッジ↔オリジンの両区間を暗号化し、可能ならオリジン証明書まで検証する状態まで

公式（暗号化モード一覧）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/

公式（サイト全体を暗号化して守るユースケース）: https://developers.cloudflare.com/use-cases/solutions/encrypt-all-keep-site-secure/

## 「HTTPSになっている」だけでは足りないことがある

中小企業のサイトでも、ブラウザの鍵マークが出ているから安心、と思いがちです。実際には Cloudflare 配下では、次の2区間が別々に存在します。

- **訪問者 ↔ Cloudflare**（エッジ）
- **Cloudflare ↔ オリジン**（実体のサーバー）

Encryption mode（暗号化モード）は、この両区間をどう扱うかを決める設定です。訪問者側だけ HTTPS で、オリジン側が HTTP のまま、という構成も選べますが、経路全体の保護としては弱い選択になります（**Flexible**）。

本記事では、公式が推奨する方向に沿って **Full (strict)** を軸に、**Always Use HTTPS** と **HSTS** を「どの順で入れるか」まで含めた最小導入を整理します。**Full (strict) はオリジン証明書の検証であり、アプリ脆弱性や不正ログインを防ぐものではありません。** 「strict で十分」と誤解しないでください。

※本記事は防御設計の一般解説です。プラン上限や手順は変更されうるため、導入時は公式ドキュメントに従ってください。

## Encryption modeとは（要点だけ）

1. **モードは訪問者↔Cloudflare と Cloudflare↔オリジンの両方に効く**
2. **Flexible**: Cloudflare ↔ オリジンは HTTP。実運用では避けたい
3. **Full**: 公式の現行説明では、オリジンへの接続は訪問者のリクエスト方式に合わせる（訪問者が http ならオリジンも HTTP、https なら HTTPS）。オリジン証明書は検証しない（自己署名・期限切れでも接続しうる）
4. **Full (strict)**: Full に加え、オリジン証明書を検証する。未期限・公開CAまたは Cloudflare Origin CA・CN/SAN 一致などが条件。満たさないと訪問者側に **Error 526: Invalid SSL Certificate**（オリジン証明書の無効エラー）が表示されることがある
5. **推奨**: 可能なら Full または Full (strict)。特に Full (strict) を可能な限り

公式（Full strict）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

公式（Full）: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full/

### Full 単体でオリジン HTTP に落ちうる失敗例

Always Use HTTPS が **オフ** のまま Encryption mode だけ **Full** にしていると、訪問者が `http://` で来たとき、公式の現行説明どおりオリジン側も **HTTP** になり得ます。ブラウザの鍵マークが付かない流入経路が残り、エッジ↔オリジンも平文になり得ます。

- **起きやすい誤解**: 「Full にしたから両区間は常に HTTPS」
- **実際**: Full は方式追従。常時 HTTPS に寄せるには **Always Use HTTPS**（または同等の http→https）が別途必要
- **検証の弱さ**: Full はオリジン証明書を検証しない。期限切れ・自己署名でもつながり得る

Flexible はさらに弱く、訪問者が HTTPS でもオリジン区間が HTTP のままです。「鍵マークがある＝経路全体が守られている」にはなりません。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300" viewBox="0 0 700 300" role="img" aria-label="Flexible・Full・Full strictの暗号化区間の違い">
  <rect width="700" height="300" fill="#f8fafc" rx="8"/>
  <text x="350" y="24" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#0f172a">訪問者 — Cloudflare — オリジン（モード差）</text>
  <rect x="20" y="40" width="660" height="70" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="40" y="65" font-family="sans-serif" font-size="12" font-weight="700" fill="#991b1b">Flexible（避けたい）</text>
  <text x="40" y="88" font-family="sans-serif" font-size="12" fill="#7f1d1d">訪問者↔CF: HTTPS ／ CF↔オリジン: HTTP（検証なし）</text>
  <rect x="20" y="120" width="660" height="70" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="40" y="145" font-family="sans-serif" font-size="12" font-weight="700" fill="#9a3412">Full（方式追従・検証なし）</text>
  <text x="40" y="168" font-family="sans-serif" font-size="12" fill="#9a3412">訪問者が http ならオリジンも HTTP になり得る。Always Use HTTPS とセットで考える</text>
  <rect x="20" y="200" width="660" height="80" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="40" y="230" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">Full (strict)（本記事の軸）</text>
  <text x="40" y="255" font-family="sans-serif" font-size="12" fill="#047857">両区間 HTTPS ＋ オリジン証明書を検証。失敗時は Error 526</text>
</svg>
<figcaption>図1. Flexible / Full / Full (strict) の暗号化と検証の違い（図は本図＋順序テキストのみ）</figcaption>
</figure>

役割の一言: Access＝誰が入れるか／WAF・Bot＝中身／Tunnel＝届け方／**本記事＝経路の暗号化**。Tunnel を利用する場合、cloudflared と Cloudflare 間はトンネル内で暗号化されるため、オリジンに公開 CA／Origin CA 証明書を置く構成とは前提が異なります。一方、Tunnel を使わず Cloudflare エッジから公開オリジンへ HTTPS 接続するサイトでは、オリジン証明書の検証方針が必要です。

## 導入前チェックリスト（Go/No-Go）

モードを触る前に、次を揃えてください。**1つでも未チェックなら、次の Encryption mode 変更セクションへ進まない**でください。各ステップの先頭でも「未充足なら進むな」を再確認します。

- [ ] **オリジンが 443 で HTTPS を受け付けられる**
- [ ] **証明書の CN/SAN が、要求されるホスト名と一致する**（有効期限内）
- [ ] **証明書の更新担当と手順が決まっている**（放置すると 526 が続く）
- [ ] **サブドメインの HTTPS 一覧がある**（www / api / staging 等。HTTP のまま残るホストを把握）
- [ ] **共用ホスティング制約を確認した**（後述：Origin CA／カスタム証明書が置けない場合）
- [ ] **HSTS 有効化の承認者と、切り戻し担当が社内（または契約業者）にいる**

## 推奨順序（図は sequential テキスト）

**証明書 → Full (strict) → Always Use HTTPS → HSTS**

1. 先に Full (strict) を入れると、証明書が条件を満たさない場合に **526** が出ることがある  
2. Always Use HTTPS は暗号化モードが **Off** だと選べない（公式注意）  
3. HSTS は HTTPS が安定してから。早すぎる有効化や HTTPS 解除は、max-age のあいだ到達不能になりうる  

### 1. オリジン側に妥当な証明書を置く

Full (strict) は次を求めます（公式の要件）。

- 有効期限内（`notBefore`〜`notAfter`）
- 公開の認証局、または **Cloudflare Origin CA**
- CN または SAN がホスト名と一致

**Cloudflare Origin CA** は Full (strict) と組み合わせやすい選択肢として公式に案内されています。Let's Encrypt 等との選択は、更新のやりやすさで決めてください。

公式（Origin CA）: https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/

#### 共用ホスティングで Origin CA／カスタム証明書が置けない分岐

共用レンタルサーバーやマネージド環境では、オリジンへの証明書インストール権限が無い・パネルが自己署名しか出せない、といった制約があり得ます。

| 状況 | とりうる分岐（概念） |
|---|---|
| カスタム証明書／Origin CA をオリジンに置ける | **Full (strict)** を第一候補 |
| HTTPS は出せるが検証可能な証明書が置けない | 一時的に **Full**（検証なし）。**期限・担当・strict 再挑戦日を必須**（下記）。Flexible は避ける |
| オリジン HTTPS 自体が不可 | Full (strict) は選べない。ホスティング変更・Tunnel 等の届け方見直し・業者依頼を検討（対象外箱／後述の境界） |

「strict が理想」でも、置けない環境では **無理に切り替えて 526 を出し続ける**より、制約を文書化したうえで Full 暫定＋改善計画の方が現場的です。

#### Full 暫定の必須項目（永久化防止）

- [ ] **期限**（例: **30日**。過ぎたら下の分岐へ強制遷移）
- [ ] **担当者**（証明書またはホスティング改善のオーナー）
- [ ] **strict 再挑戦日**（カレンダーに入れる）
- [ ] 期限超過時の分岐: ホスティング変更／Origin CA が置ける環境へ移す／Tunnel 等の届け方見直し（詳細手順は対象外箱）

暫定 Full を「十分」と誤読して証明書検証を先送りしないでください。

### 2. Encryption mode を Full (strict) にする

**Go/No-Go が全てチェック済みであること。** 未充足ならここへ進まないでください。

ダッシュボードの SSL/TLS Overview から選択します。可能なら Full (strict) を第一候補、やむを得ない場合のみ Full。Flexible は経路全体の暗号化としては避けたい選択です。

切り替え直後は主要ホスト名で鍵マークとエラーの有無を確認します。526 ならモード以前にオリジン証明書側を見直します。

### 3. Always Use HTTPS を有効にする

訪問者の `http` を `https` へリダイレクトします。mode が **Off** のときはオプション自体が見えません。

オリジン側で HTTP→HTTPS リダイレクトを重ねるとループの原因になり得ます。公式はリダイレクトを Cloudflare 側で行う方向を勧めています。

**二重リダイレクトの検知（概念）**: ブラウザの開発者ツール等で、http アクセス時に 301/302 が Cloudflare とオリジンの両方から連続していないかを見る。連続しているならオリジン側のリダイレクトを止める方向で整理します（具体操作は環境依存のため公式とホスティング手順へ）。

公式（Always Use HTTPS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/

### 4. HSTS は「最後」に入れる

HSTS は対応ブラウザに「このサイトは HTTPS でアクセスせよ」と指示します。公式要件は、(1) 先に HTTPS を有効にする (2) HTTPS を維持する、です。

HSTS 有効後の DNS only 復帰・一時停止・HTTPS 無効化は、訪問者が届かなくなる要因になり得ます。特に **max-age 期間中の HTTPS 解除**は公式が警告しています。

#### HSTS 初期値とチェックリスト（preload は当面禁止）

初回の目安（例）:

- **max-age**: 短く始める（例: **300〜86400秒**）。いきなり半年〜1年にしない
- **includeSubDomains**: **初回オフ**
- **preload**: **当面禁止**（検討は業者境界側。本記事の完結範囲外）

includeSubDomains や preload を検討する前に:

- [ ] **対象ドメイン配下の全サブドメインが HTTPS で到達できる**（HTTP のままの staging / 旧ホストが無い）
- [ ] **証明書がサブドメイン分までカバーされている**（または個別に揃っている）
- [ ] **短い max-age で様子を見た**（上記の初期値）
- [ ] **切り戻し担当と手順がある**（次節ランブック）。承認者＝切り戻し担当が社内にいること

公式（HSTS）: https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

### 5.（対象外）Authenticated Origin Pulls / Tunnel

オリジンが「Cloudflare からの接続だけを受け入れる」ための選択肢や、Tunnel 併用時の届け方は **冒頭の対象外箱**に含めます。本記事の完結範囲外です。

※Tunnel 経由で inbound リスナーを使わない構成では前提が異なります。詳細はシリーズ別記事と公式を確認してください。

## 失敗時ランブック（526 / HSTS）

### 526 が出たとき

1. **訪問者向け影響を確認**（主要ホストが 526 か）
2. **オリジン証明書を確認**（期限・CN/SAN・公開CAまたは Origin CA）
3. **必要なら一時的に Encryption mode を Full に戻す**（検証なし。サービス復旧優先の切り戻し。Flexible へは戻さない）
4. 証明書を直してから **再度 Full (strict)** へ
5. 詳細は公式の Full (strict) / 526 関連ドキュメントへ

#### 匿名の失敗例（所要のイメージ）

共用ホスティングで証明書期限切れに気づかず Full (strict) のまま → 主要ページが **526 継続** → 一時的に **Full へ切り戻し**（Flexible には戻さない）→ Origin CA（または更新）を再発行して設置 → **strict 復帰**。検知から復帰まで半日〜数日かかった、というパターンがあります。更新担当と Go/No-Go が無いと、同じ事故が再発します。

### HSTS 事故（HTTPS 維持が危ういとき）

1. **慌てて Cloudflare を止めない・DNS only に安易に戻さない**（max-age 中はブラウザが HTTPS を強制し続ける）
2. **可能なら HSTS の max-age を短縮したヘッダを出し、時間経過を待つ**（公式の HSTS 案内に従う）
3. **キャッシュ／ブラウザ側の残存を意識する**（短縮しても、既存クライアントは旧 max-age が切れるまで残る）
4. 詳細は公式 HSTS ドキュメントへ

## 自社でやること／業者に頼む境界（CTAの前）

| 自社で進めやすい | 業者・支援に頼んだ方がよい例 |
|---|---|
| ダッシュボードでの mode / Always Use HTTPS の切替と確認 | 共用ホスティングで証明書が置けず構成変更が必要 |
| オリジン証明書の更新担当の明確化 | 526 が続き、証明書とリダイレクトの切り分けが付かない |
| サブドメイン HTTPS 一覧の作成 | HSTS preload / includeSubDomains を本番全域に入れる判断 |
| 短い max-age での HSTS 試験 | Tunnel 併用時の Origin Pulls／届け方の再設計 |

「ダッシュボードを触れる」と「障害時に切り戻せる」は別です。切り戻し担当が社内にいない場合は、業者境界を先に決めてから HSTS に進んでください。

## 向いている場面・向いていない場面

**向きやすい例**

- すでに Cloudflare プロキシ配下の公開サイト・LP・コーポレートサイト
- オリジンに証明書を置ける（または Origin CA を使える）環境

**一気に寄せない方がよい例**

- オリジンがまだ HTTPS を受け付けられない、またはホスト名が一致しない
- サブドメインの一部だけ HTTP のまま
- 証明書更新運用が固まっていない
- 共用ホスティングで検証可能な証明書が置けない（Full 暫定＋改善計画）

## まとめ

Cloudflare の SSL/TLS 最小導入は、「鍵マーク」ではなく **両区間の暗号化と、可能ならオリジン証明書の検証** にあります。実務順序は次のとおりです。

1. 導入前チェック（443・CN/SAN・更新担当・サブドメイン一覧・ホスティング制約）
2. オリジンに妥当な証明書（公開CA または Origin CA）
3. **Full (strict)**（難しければ Full。Flexible は避ける）
4. **Always Use HTTPS**（Full 単体の方式追従落とし穴を塞ぐ）
5. HTTPS 安定後に **HSTS**（サブドメインチェックと短い max-age から）
6. 526 / HSTS の切り戻しを知ったうえで本番へ

出典（いずれも Cloudflare 公式ドキュメント）:

- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full/
- https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/
- https://developers.cloudflare.com/use-cases/solutions/encrypt-all-keep-site-secure/

合同会社スタジオフーズでは、Cloudflare を含むネットワーク・アクセス設計や、業務システムの DX 支援も扱っています。自社サイトの HTTPS 方針やオリジン証明書の置き方を整えたい場合は、[サービス一覧](https://www.studiofoods.net/services) や [お問い合わせ](https://www.studiofoods.net/contact) からお気軽にご相談ください。

※本稿は2026年9月時点の公開ドキュメントにもとづく一般的な解説です。プラン上限や手順は変更されうるため、導入時は公式を確認してください。攻撃・回避手順は扱いません。

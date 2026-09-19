INSERT INTO blog_posts (
  id, slug, title, excerpt, body, category, tags, thumbnail_url, published_on,
  status, notes, source, created_at, updated_at, destination
) VALUES (
  'blog_ef65365b-2d82-43ac-85ba-08648e173d65',
  'cloudflare-tunnel-minimum-for-smb',
  'ポートを開けずに届ける。Cloudflare Tunnel（cloudflared）の最小導入',
  '管理画面や内部アプリをインターネットに出すとき、ルーターのポート開放に頼らない選択肢があります。Cloudflare Tunnel（cloudflared）の外向き接続モデルと、Access・WAF・Bot Fight Modeとの役割分担を中小企業向けに整理します。',
  '## ポートを開けて届ける、という習慣を見直す

中小企業でも、次のような画面を「とりあえず外から触れるようにする」場面があります。

- 社内の業務管理画面や在庫ツール
- ステージング環境
- NASや小規模サーバー上の管理コンソール
- 外注先と共有する限定アプリ

よくあるやり方は、ルーターやクラウドのセキュリティグループで **80 / 443 などを開け、公開IPへ直接届ける** ことです。動くのですが、オリジン（実体のサーバー）がインターネットから見える攻撃面になりやすく、Access記事で触れた「誰が入れるか」以前に、「どこへ届くか」の設計が残ります。

**Cloudflare Tunnel** は、サーバー側に置いた軽量デーモン `cloudflared` が Cloudflare へ **外向き（outbound-only）** の接続を張り、そのトンネル経由でサービスを届ける仕組みです。公開向けの用途では inbound の待受ポートやパブリックIPを前提にしなくてよい、と公式に説明されています。

公式（公開アプリ向け概要）: https://developers.cloudflare.com/tunnel/

公式（Cloudflare One / Zero Trust 向け Tunnel）: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

※本記事は防御設計の一般解説です。攻撃手順や回避方法は扱いません。個別環境の設定は公式手順と自社ポリシーに従ってください。

## Cloudflare Tunnelとは（要点だけ）

公式ドキュメントが示す中核は次のとおりです。

1. **`cloudflared` が外向き接続を開始する**  
   多くのファイアウォールは outbound を許可している前提で、オリジンから Cloudflare のグローバルネットワークへトンネルを張ります。
2. **トンネルは UUID で識別される永続オブジェクト**  
   同じトンネル上で複数の `cloudflared`（コネクタ）を動かせます。
3. **ホスト名をローカルサービスに対応づける**  
   例: `app.example.com` → `http://localhost:8080` のように、公開ホスト名と内部の待ち受けを紐づけます（公式の「How it works」）。
4. **トラフィックは Cloudflare 経由でオリジンへ**  
   CDN・WAF・DDoS対策などエッジ側の保護が乗ったうえで届く、という位置づけが公式に示されています。

公式（仕組み・外向き接続）: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

公式（公開向け How it works）: https://developers.cloudflare.com/tunnel/

Authenticated Origin Pulls は Tunnel 経路では効果が無い、といった注意も公式にあります（Tunnel は inbound リスナーを使わないため）。細かい例外は導入時に公式を確認してください。

## これまでのシリーズとの役割分担

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="320" viewBox="0 0 700 320" role="img" aria-label="Access・WAF・Bot Fight・Tunnelの役割分担図">
  <rect width="700" height="320" fill="#f8fafc" rx="8"/>
  <text x="350" y="28" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#0f172a">シリーズの役割分担（誰を・何から守るか）</text>
  <!-- Internet -->
  <rect x="20" y="50" width="100" height="50" rx="6" fill="#e2e8f0" stroke="#64748b"/>
  <text x="70" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#334155">インターネット</text>
  <!-- Bot Fight -->
  <rect x="150" y="40" width="130" height="70" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="215" y="68" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#92400e">Bot Fight Mode</text>
  <text x="215" y="88" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#78350f">自動アクセスのコスト↑</text>
  <!-- WAF -->
  <rect x="300" y="40" width="130" height="70" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="365" y="68" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">WAF</text>
  <text x="365" y="88" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">怪しいHTTPを抑える</text>
  <!-- Access -->
  <rect x="450" y="40" width="110" height="70" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
  <text x="505" y="68" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#5b21b6">Access</text>
  <text x="505" y="88" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4c1d95">誰が入れるか</text>
  <!-- Tunnel highlight -->
  <rect x="150" y="150" width="430" height="90" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
  <text x="365" y="180" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#065f46">Tunnel（本記事）</text>
  <text x="365" y="205" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#047857">オリジンへ「どう届けるか」— inboundポートを開けない</text>
  <text x="365" y="225" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#064e3b">cloudflared が外向き接続 → Cloudflare経由でサービスへ</text>
  <!-- Origin -->
  <rect x="580" y="165" width="100" height="60" rx="6" fill="#e2e8f0" stroke="#475569"/>
  <text x="630" y="190" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e293b">内部アプリ</text>
  <text x="630" y="208" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#334155">管理画面等</text>
  <text x="350" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">入口の認証＝Access／通信の中身＝WAF・Bot／届け方＝Tunnel</text>
  <text x="350" y="300" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">※一般解説。攻撃・回避手順は扱いません</text>
</svg>
<figcaption>図1. Access / WAF / Bot Fight Mode / Tunnel の位置づけ</figcaption>
</figure>

- **Access / Zero Trust**: 「誰が入口を通れるか」を本人確認で決める（別記事）
- **WAF（Managed / Custom / レート制限）**: 怪しいHTTPパターンや連打をルールで抑える（別記事）
- **Bot Fight Mode**: ドメイン全体の自動アクセスにチャレンジをかけてコストを上げる（別記事）
- **Tunnel（本記事）**: オリジンへ「どう届けるか」。ポート開放に頼らず、外向きコネクタ経由にする

Tunnel は Access の代わりではありません。ホスト名を公開しただけで認証が無ければ、届く相手は広くなります。管理画面なら **Tunnel で届け方を整え、Access で許可する人を絞る** のが、シリーズ全体の最小セットです。

## 中小企業が先に入れる最小ステップ

<figure>
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="360" viewBox="0 0 700 360" role="img" aria-label="ポート開放直公開とTunnel経由のBefore Afterと最小ステップ">
  <rect width="700" height="360" fill="#f8fafc" rx="8"/>
  <text x="350" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#0f172a">Before / After と最小ステップ</text>
  <!-- Before -->
  <rect x="20" y="45" width="320" height="130" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="180" y="70" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#991b1b">Before：ポート開放で直公開</text>
  <text x="40" y="100" font-family="sans-serif" font-size="12" fill="#7f1d1d">インターネット → 公開IP:443/80</text>
  <text x="40" y="122" font-family="sans-serif" font-size="12" fill="#7f1d1d">→ ルーター／FWでポート転送</text>
  <text x="40" y="144" font-family="sans-serif" font-size="12" fill="#7f1d1d">→ オリジンが直接攻撃面になる</text>
  <!-- After -->
  <rect x="360" y="45" width="320" height="130" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
  <text x="520" y="70" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#065f46">After：Tunnel経由</text>
  <text x="380" y="100" font-family="sans-serif" font-size="12" fill="#064e3b">インターネット → Cloudflare</text>
  <text x="380" y="122" font-family="sans-serif" font-size="12" fill="#064e3b">← cloudflared（外向きのみ）</text>
  <text x="380" y="144" font-family="sans-serif" font-size="12" fill="#064e3b">→ ローカルサービス（inbound不要）</text>
  <!-- Steps -->
  <rect x="20" y="195" width="660" height="140" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="350" y="222" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e40af">最小ステップ（公式の流れに沿った一般解説）</text>
  <!-- step boxes -->
  <rect x="40" y="240" width="140" height="70" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="110" y="268" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">① Tunnel作成</text>
  <text x="110" y="288" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">ダッシュボード等</text>
  <text x="195" y="275" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="215" y="240" width="150" height="70" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="290" y="268" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">② cloudflared</text>
  <text x="290" y="288" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">外向き接続を確立</text>
  <text x="375" y="275" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="395" y="240" width="130" height="70" rx="6" fill="#fff" stroke="#2563eb"/>
  <text x="460" y="268" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#1e40af">③ hostname</text>
  <text x="460" y="288" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1e3a8a">公開名→ローカル</text>
  <text x="535" y="275" font-family="sans-serif" font-size="18" fill="#64748b">→</text>
  <rect x="555" y="240" width="110" height="70" rx="6" fill="#ede9fe" stroke="#7c3aed"/>
  <text x="610" y="268" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#5b21b6">④ Access</text>
  <text x="610" y="288" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4c1d95">誰が入れるか</text>
</svg>
<figcaption>図2. ポート開放直公開とTunnel経由の対比、および Tunnel→hostname→Access の最小順序</figcaption>
</figure>

公式の始め方では、オリジン上に `cloudflared` を入れ、認証したうえでトンネルを作成・管理する流れが案内されています。ダッシュボードや API からリモート管理トンネルを作る構成が、多くの用途で推奨されています。

公式（初めてのトンネル）: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/

公式（その他のトンネル種別）: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/

現場向けに噛み砕くと、次の順が扱いやすいです。

### 1. 守りたい内部サービスを1つ決める

最初は管理画面やステージングなど、「関係者だけが触る画面」が向きます。公開マーケティングサイトまで一気に抱え込まない方が、切り戻ししやすいです。

### 2. Tunnel を作り、`cloudflared` を動かす

ダッシュボード等でトンネルを作成し、案内どおりにコネクタを起動します。ポイントは **オリジン側が Cloudflare へ外向きに接続する** ことであり、「ルーターに穴を開けて待つ」モデルからの切り替えです。

### 3. 公開ホスト名をローカルサービスへマップする

例として、社内でだけ動いている HTTP サービスへホスト名を紐づけます。DNS やルーティングの細部は公式の Routing ドキュメントに従います。

### 4. 管理画面なら Access を重ねる

届け方が Tunnel になっても、「URLを知っている人は入れる」状態のままでは Access 記事の問題が残ります。人が触る入口には、本人確認のポリシーを載せるのがシリーズの一貫した方針です。

### 5. ファイアウォールは inbound を閉じる方向で見直す

公式は、`cloudflared` の外向き接続を活かし、不要な inbound を閉じるポジティブなセキュリティモデルを説明しています。既存のポート転送ルールが残っていないかは、導入後の確認項目に入れるとよいです。

※本記事では具体的なポート番号の列挙や設定コマンドの再現手順は書きません。接続要件は時点で変わるため、導入時は公式のファイアウォール向け案内を確認してください。

## 向いている場面・向いていない場面

**向きやすい例**

- 社内やVPS内だけで動く管理画面を、許可した人だけに届けたい
- 固定の公開IPやポート転送が取れない・取りたくない環境
- Access と組み合わせて「関係者だけ」の入口にしたい

**最初から Tunnel だけに寄せない方がよい例**

- すでに Cloudflare プロキシ配下の静的公開サイトだけで足りている場合（Tunnel が必須とは限らない）
- 認証もレート制限も無しのまま、内部ツールのホスト名だけを広く公開する場合（届け方を変えても入口の問題は残る）

## まとめ

Cloudflare Tunnel（`cloudflared`）は、オリジンが Cloudflare へ外向き接続を張り、ポート開放に頼らずサービスを届けるためのコネクタです。中小企業では「管理画面や社内ツールをどう外に出すか」の最小選択肢として有効です。ただし Tunnel は届け方の層であり、誰が入れるかは Access、通信の中身は WAF / Bot Fight Mode と役割が分かれます。

シリーズの積み上げイメージは次のとおりです。

1. 公開サイトの入口を薄くする（Bot Fight Mode / WAF）
2. 管理画面の「誰が入れるか」を決める（Access）
3. オリジンの「どう届けるか」をポート開放から外す（Tunnel）

出典（いずれも Cloudflare 公式ドキュメント）:

- https://developers.cloudflare.com/tunnel/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/

※本稿は2026年9月時点の公開ドキュメントにもとづく一般的な解説です。プラン上限や手順は変更されうるため、導入時は公式を確認してください。
',
  'セキュリティ',
  'Cloudflare, Tunnel, cloudflared, Zero Trust, セキュリティ, 中小企業',
  '',
  '',
  'draft',
  'Cloudflare・月水金シリーズ。2026-09-18。題材=Tunnel最小導入（ポート公開しない届け方・Accessとの役割分担）。',
  'grokbot',
  '2026-09-18 08:14:36',
  '2026-09-18 08:14:36',
  'studiofoods_hp'
);

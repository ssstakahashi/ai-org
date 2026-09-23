INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, status, created_at) VALUES ('bpc_4517e94f80e84fe8887017c08e57d34f', 'blog_29a9efa8-49ab-45ef-875c-62b6d81e1229', NULL, '記事チェック', 'automation-0800', '【外部チェック 2026-09-23 08:00】再確認。verdict=差し戻し候補（昨日09:30コメント継続）。

■ 再取得
- METI 賃上げ促進税制トップ（WebFetch）: 「全企業向けは令和7年度末で廃止」「教育訓練費に係る上乗せ措置は令和7年度末で廃止」。法人の当該措置は令和8年3月31日までに開始する事業年度まで。
- NTA 5927 / 5927-2: 到達200。TaxAnswer本文は「令和7年4月1日現在」表記のまま（R8改正未反映）。
- chusho syotokukakudai.html: 本環境403。

■ 結論
本文・図・excerptの「最大45%／教育訓練+10pt／全企業向けを現行レーン併記」は、令和8年4月1日以後開始事業年度の現場チェックとして不適切。大幅改稿が必要 → 9:30回で差し戻し候補。新規の長文コメントは昨日分を参照。', 'open', datetime('now','+9 hours'));
UPDATE blog_posts SET notes = '毎日下書き 2026-09-22。柱⑥税制・賃上げ促進税制の現場チェック。task=task_blog_2026-09-22_tax。本番へは出さない。destination=studiofoods_hp。図表SVG2枚。
外部チェック 2026-09-23 08:00 差し戻し候補（R8改正未反映・昨日コメント継続）', updated_at = datetime('now','+9 hours') WHERE id='blog_29a9efa8-49ab-45ef-875c-62b6d81e1229';
INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, status, created_at) VALUES ('bpc_6340bfbe276b401aba27ec023c5a1fa4', 'blog_8e039901-7ed3-4edc-9655-cffd80599505', NULL, '記事チェック', 'automation-0800', '【外部チェック 2026-09-23 08:00】出典実取得。verdict=要修正（軽微〜中）。

■ 一致した点
- 論説 https://www.agrinews.co.jp/opinion/index/382021 （2026-05-22）: 2025年度隊員数8,196人／直近5年定住5,038人／定住後就農477人（約1割）→ 本文の8196・5038・477・約9.5%は整合。
- 社会面 https://www.agrinews.co.jp/society/index/405662 （2026-09-10）: 富山県朝日町「あさひ農学舎」・協力隊マッチングの題材は一致（到達200）。

■ 要修正
1. 【事実】「定住率約6割」は上記論説に記載なし（定住人数のみ）。総務省の別統計に依るなら出典を明示。依拠できないなら削除か「人数ベース」に言い換え。
2. 【表現】「全隊員比では約5.8%」（477÷8196）は、5年累計の就農人数と単年度隊員数の割り算で比較軸がずれる。論説どおり「定住者の約1割」に寄せる方が安全。
3. 【リンク】notes記載の本番 https://agri-landing.s-takahashi-241.workers.dev/blog/cooperation-team-agriculture-matching-settlement/ は本環境でも404（公開前draft運用と整合）。本文からは未リンクなので致命傷ではないが、公開時は要確認。
4. 【文体】導入の危機感・「痛感」連発はややAIっぽい。数字節は良いので、体験パートを短く具体例1つに絞ると締まる。

■ 問題なし
攻撃・回避手順なし。役割分担系の誤りなし。', 'open', datetime('now','+9 hours'));
UPDATE blog_posts SET notes = 'https://agri-landing.s-takahashi-241.workers.dev/blog/cooperation-team-agriculture-matching-settlement/
初回見回り2026-09-22 15:37 JST: 本番404のため published→draft（D1同期）
外部チェック 2026-09-23 08:00 要修正: 定住率約6割は出典なし／全隊員比の比較軸／本番URLは404', updated_at = datetime('now','+9 hours') WHERE id='blog_8e039901-7ed3-4edc-9655-cffd80599505';
INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, status, created_at) VALUES ('bpc_4249d2df67aa47bfa91f7a147dde2e15', 'blog_3c9214b7-8491-4d1a-b362-e4210e748291', NULL, '記事チェック', 'automation-0800', '【外部チェック 2026-09-23 08:00】出典実取得。verdict=ほぼOK（出典整理の軽微指摘）。

■ 数値（整合）
- 日本農業新聞 406384（2026-09-13）: 9日正午時点で農林水産関係1,613億円、農地・農業用施設1万5,083カ所で963億円、共同利用施設355億円 → 本文一致。
- 農水省被害状況PDF（サイト内 attach r8_kumamotojishin-31.pdf、令和8年9月17日14時）: 合計1,613.5億円、農地+農業用施設小計962.7億円（5,066+10,017=15,083箇所）、共同利用施設355.3億円 → 丸めと整合。
- プレス https://www.maff.go.jp/j/press/kanbo/bunsyo/saigai/260803.html : 「机上査定上限額の引上げ」等の効率化説明と本文の言及は一致（200）。

■ 要対応（軽微）
1. 出典リストの読売（2026-08-27、県速報で農林水産約1,102億円／農地・施設約786億円）は本文採用値より古い別時点。並記するなら「8月末時点の県速報」と注記するか、混乱回避のため外す。
2. ハブ https://www.maff.go.jp/j/saigai/r8_kumamotojishin.html 自体に1613の数字は無く、一次は添付PDF。可能ならPDF直リンクを出典に追加（農業新聞経由のみだと二次依存）。
3. 「莫大な数字」等の形容は、すでに具体額があるので削ってもよい。

■ 問題なし
Access/WAF等の役割誤りなし。攻撃手順なし。事実誤認の本体数字は見つからず。大幅差し戻しは不要。', 'open', datetime('now','+9 hours'));
UPDATE blog_posts SET notes = 'Google Docs: https://docs.google.com/document/d/1EWIUBXrINahqm0dNi4c1xdY_TofnnqFgfAcw3ebO5bs/edit
外部チェック 2026-09-23 08:00 ほぼOK: 1613/963/355は農水PDF整合。読売旧速報の時点注記か削除を推奨', updated_at = datetime('now','+9 hours') WHERE id='blog_3c9214b7-8491-4d1a-b362-e4210e748291';
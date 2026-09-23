UPDATE blog_posts
SET body = REPLACE(REPLACE(body, '3. **Full**  
   両区間を HTTPS にするが、オリジン証明書の妥当性は検証しない（自己署名でも接続しうる）。暗号化はあるが検証は弱い。', '3. **Full**  
   公式の現行説明では、オリジンへの接続は訪問者のリクエスト方式に合わせる（訪問者が http ならオリジンも HTTP、https なら HTTPS）。オリジン証明書の妥当性は検証しない（自己署名・期限切れでも接続しうる）。Always Use HTTPS と併用すれば実質的に両区間 HTTPS になりやすいが、検証は弱い。'), 'Full（暗号化あり・証明書検証なし）', 'Full（方式追従・証明書検証なし）'),
    notes = CASE WHEN notes IS NULL OR notes = '' THEN '外部チェック 2026-09-21 09:30 修正: Fullモード説明を現行公式（訪問者スキーム追従）に合わせて調整'
                 ELSE notes || char(10) || '外部チェック 2026-09-21 09:30 修正: Fullモード説明を現行公式（訪問者スキーム追従）に合わせて調整' END,
    updated_at = datetime('now')
WHERE id = 'blog_02f3ea13-6ceb-40d5-9d29-12f84ce2d03e';

UPDATE blog_posts
SET notes = CASE WHEN notes IS NULL OR notes = '' THEN '外部チェック 2026-09-21 09:30 OK'
                 ELSE notes || char(10) || '外部チェック 2026-09-21 09:30 OK' END,
    updated_at = datetime('now')
WHERE id = 'blog_b1ed9305-e947-4a61-98b3-9e897bc68651';

UPDATE blog_posts
SET notes = CASE WHEN notes IS NULL OR notes = '' THEN '外部チェック 2026-09-21 09:30 OK（最終構成を出典再検証）'
                 ELSE notes || char(10) || '外部チェック 2026-09-21 09:30 OK（最終構成を出典再検証）' END,
    updated_at = datetime('now')
WHERE id = 'blog_b2d58e39-1603-49a8-9d04-142f1cf87431';

INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, created_at, status)
VALUES ('bpc_' || lower(hex(randomblob(16))), 'blog_b1ed9305-e947-4a61-98b3-9e897bc68651', NULL, '記事チェック', 'grokbot', '【外部チェック 2026-09-21 09:30】OK（軽微注記のみ・本文修正なし）

■ リンク到達
- NTA特設サイト・スキャナ保存PDF・改正概要PDF・スキャナ一問一答PDF … いずれも 200
- 内部リンク（invoice-backoffice / mieru-invoice / services / contact）… Macから 200（box直はCF 403）

■ 出典整合
- 早期入力おおむね7営業日／業務処理サイクル最長2か月＋おおむね7営業日・規程必須 … スキャナ保存PDFと一致
- 検索3項目＋DL求めで範囲指定・組合せ不要 … 一致
- 電子取引の検索不要措置：基準期間売上高 1,000万→5,000万以下への拡大＋プリントアウト整理提示 … 改正概要PDFと一致
- 「2年／2期前」は口語。公式表現は「2課税年度前」（断定を避けており差し戻し不要）

■ その他
- 攻撃手順なし／AIっぽい空疎な断言は少なめ／免責あり
- 本番公開・承認は未実施（draft維持）', datetime('now'), 'open');

INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, created_at, status)
VALUES ('bpc_' || lower(hex(randomblob(16))), 'blog_02f3ea13-6ceb-40d5-9d29-12f84ce2d03e', NULL, '記事チェック', 'grokbot', '【外部チェック 2026-09-21 09:30】軽微修正あり（差し戻し不要）

■ リンク到達
- developers.cloudflare.com の Encryption modes / Full / Full (strict) / Origin CA / Always Use HTTPS / HSTS / encrypt-all … いずれも 200

■ 出典整合
- Flexible＝オリジンHTTP／Full (strict)＝検証あり・条件未達で526／推奨は Full または Full (strict) … 公式と一致
- Always Use HTTPS は mode≠Off のとき／HSTSはHTTPS安定後・max-age中のHTTPS解除で到達不能 … 公式と一致
- Access / WAF / Bot / Tunnel との役割分担は明確。攻撃・回避手順なし

■ 修正内容
- Full の説明が旧来の「両区間HTTPS」固定だったが、現行公式は「訪問者スキームに合わせてオリジンへ接続（httpならHTTP）」と明記。Always Use HTTPS併用時の実質両区間HTTPSに触れつつ、現行公式に合わせて本文を微修正

■ 残メモ（任意）
- 図1のFull行は「方式追従」表記へ軽く合わせ済み。preload/includeSubDomainsの注意は既存のまま十分', datetime('now'), 'open');

INSERT INTO blog_post_comments (id, blog_post_id, employee_id, author_name, source, body, created_at, status)
VALUES ('bpc_' || lower(hex(randomblob(16))), 'blog_b2d58e39-1603-49a8-9d04-142f1cf87431', NULL, '記事チェック', 'grokbot', '【外部チェック 2026-09-21 09:30】OK（08:00指摘の最終構成を再検証・追加修正なし）

■ リンク到達
- smartagri.jp/p/209・p/233 … 200
- jgha海外報告書PDF・農研機構手引きPDF … 200

■ 08:00指摘の反映確認
- 「節水30〜50%」を主主張に使わず、p/209の50〜90%および地表灌漑置換の約25%節水・約30%増収を条件付き参考値として分離 … 一致
- 肥料20〜50%は一般論、岡山露地ナスはN16%・P25%減・収量17%増・約60aで約23万円・単年度回収 … p/233・NARO手引きと一致
- コスト「10a約20万円／20〜30万円」「40万円前後は構成次第で出典に一律記載なし」… p/233（約20万・20〜30万）と注記方針が妥当。発明数値なし

■ その他
- 多雨・排水・目詰まり・小面積テスト等の反対意見・実務手順あり。差し戻し不要', datetime('now'), 'open');

AI-ORG ロゴ 最終版
================================
シンボル: P1「組織図」D案（代表＝差し色の四角 → 横線 → 三つの部署。幹はすべてブロックの左端にそろえる）
ワードマーク: Inter SemiBold（Google Fonts 版の可変フォントから wght600 / opsz32 で書き出し、SIL Open Font License 1.1）をアウトライン化
              小文字「ai-org」（サイト表記）と大文字「AI-ORG」の2種。書体は仮決め。
              ※SVGに文字データは含まず、すべてパス。フォントのインストールは不要。

色
  墨      #1E2B3A  （横線・幹・部署・文字）
  差し色  #B26A1F  （代表のブロック）
  地      #F6F6F4  （apple-touch-icon / favicon-180・512 / SNS の背景）
  単色版は墨 #1E2B3A のみ。反転版は白 #FFFFFF のみ（濃い地の上で使う）。

形: 100単位の格子。線・幹の太さ8、代表28角、部署は幅28/22/22・高さ28。平面、グラデーション・影なし。
16px用favicon: 16pxグリッドで描いた専用形（線1px、代表5px角、部署 5/4/3px 幅）。

ファイル（files/）
  aiorg-symbol-{color|mono|reverse}.svg / .png                     シンボル（PNG 1000×1000）
  aiorg-horizontal-{lower|upper}-{color|mono|reverse}.svg / .png   横組み（lower=ai-org, upper=AI-ORG。PNGは8倍）
  aiorg-vertical-{lower|upper}-{color|mono|reverse}.svg / .png     縦組み（PNGは6倍）
  favicon.svg                                  16pxグリッドの専用形
  favicon-16.png / favicon-32.png / favicon-48.png   favicon.svg から書き出し
  favicon-180.png / favicon-512.png            通常シンボルを地色の正方形に配置
  apple-touch-icon.svg / apple-touch-icon.png  180×180
  sns-400.svg / sns-400.png                    400×400
その他
  overview.png              一覧（実寸・拡大・220px幅・タブ風表示を含む）
  study/p1-variants.png     P1 微調整の比較（元・A吊り札・B段・C本線・D左揃え・E左揃え＋高さ違い。採用はD）
  build.py / study.py       生成スクリプト（python3 build.py。要 fontTools, cairosvg, Pillow）
  fonts/Inter-SemiBold.ttf, fonts/OFL-Inter.txt

faviconの<link>タグ例（ファイルをサイトのルートに置く場合）
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
  <link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">

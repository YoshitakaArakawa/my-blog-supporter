# 記事構成: Dreamforce 2026 Tableau Keynote の振り返りと、今年アンバサダーを引き受けた理由（仮）

<!-- 以下の箇条書きは話す順の骨であり、最終本文の形ではない。本文は散文化する -->

## コアメッセージ
- Keynote は Tableau を「Tableau の上に AI」から「AI を中心に据えた Tableau」へ反転させた。可視化や従来 BI の話が減ったのは当然の帰結で、Tableau ユーザーの定義も MCP や AI を含む形に広がる。自分はその方向で肩書なしに発信してきたが、今年アンバサダーを引き受けたのは、活動を変えるためではなく、その活動を日本の Tableau コミュニティが持つ属性の一つとして数えてもらうため。読者には、「既に難しい部分を作った」の先のもう一歩として、生成 AI のトピックに浸ることを勧めたい。

## 読後の読者の状態
- Keynote が示した方向を自分の言葉で捉え直し、生成 AI を含めたデータ活用の情報に「浸る」ところから経験値を積み始める。

## 構成

### 導入: 連休の宣言
展開する思考（話す順）:
- Dreamforce 2026 の Tableau Keynote の感想と、今年 Tableau Ambassador になった話を絡めて書く（ポスト A の宣言）
- 2本立てであること。前半は Keynote、後半はアンバサダー
- 免責: Keynote は配信と字幕・スライドから読んだ範囲。製品はまだ触っていない
素材:
- ポスト A（20260919）
- Keynote 動画（Salesforce ch・20260918 公開）

### 展開1: Keynote は何を語ったか
展開する思考:
- 3ステップの playbook（登壇者の言葉どおり）
  - (1) Empower everyone to be a builder（Studio・Data Apps）
  - (2) Have intelligence come to you（Proactive Intelligence）
  - (3) Build on a trusted foundation（Tableau Knowledge）
- 4製品を一行ずつ。デモで見せたことに絞り、評価はここでは書かない
- 短く済ませる。まとめは他の人が出す前提で、所感に字数を使う（TC26 記事と同じ姿勢）
素材:
- references/keynote-neutral-summary.md 第2・3節
- references/images/C-15_1.jpg（3ステップのまとめ）、C-3（Studio）、C-6（Data Apps）、C-7（Proactive Intelligence）、C-12（Knowledge）
接続: 事実を先に置き、次章の所感を読者が検証できるようにする

### 展開2: 「Tableau の上に AI」から「AI を中心に据えた Tableau」へ
展開する思考:
- 主題（trust と speed で agentic analytics enterprise へ）は、ある意味当たり前
- 大きめの世界観の変更と感じたのは製品側
  - (i) Studio は Tableau Desktop の完全なリブランディング・再構成。「Tableau というアプリで何をするのか」が変わった
  - (ii) Data Apps はユーザーを Studio に閉じ込めず、Claude や ChatGPT を使いたい時も MCP・プラグインで支える。「Tableau がサポートする世界観」
  - [著者:会話 20260922] (ii) は取り下げ。Data Apps は MCP／Plugin の話ではない。「普段の AI ツールの側」は Keynote の headless analytics に Tableau MCP／Plugin を当てて書く。反転は Studio だけで論じ、製品ごとの直接の所感は展開1へ移す
- 一言でいうと「Tableau の上に AI（Tableau Agent 等）」から「AI を中心に据えた Tableau 体験」への反転
- 可視化・従来 BI の話が少ないのは当然の帰結
  - 事実として突きつける（`visualization` 5回、手作業の作図は0場面、best practices は AI に内蔵される前提）
  - 寂しさに寄り添うより「こう進むのだから合わせた方がいい」。応援するトーン
- 紹介程度に留めるもの
  - 「self-service から at your service へ」（Libby Nel）。Slack の話が主で、画期的とは思わない
  - BI🤝AI。IBM Michael Peeler「従来 BI は anchor として残る」。既刊 AI🤝BI と接続
素材:
- ポスト C-3・C-4・C-6・C-10・C-11・C-14
- 中立要約の第1・5節（出現回数）、逐語引用 [24:13] [46:00]
- 既刊 20260913 AI🤝BI
接続: 前章の事実から、自分が何を大きな変化と見たかへ。反転の定式は以降の章の背骨

### 展開3: 「Tableauユーザー」とは誰か
展開する思考:
- 昨日までは「Tableau MCP ユーザー」のような別属性を考えていた（ポスト B-2）
  - 背景: Tableau はずっと可視化・BI ツール。可視化を作るツールから離れ、BI プラットフォームのデータに API・MCP で入るユーザーは、属性が違うのではと思っていた
  - 違いの中身は、道具と、それを使うスキルセット・生成 AI 習熟度
- 今日からは MCP も AI も全部含めて使って／使えて「Tableau ユーザー」
  - Studio（アプリの中に AI）と Data Apps（AI の中に Tableau）の両方から。両方とも Tableau 自身が提示している
- ただし習熟度の差は消えない。AI をバリバリ使う人も、まだ使えていない人も同じ Tableau ユーザーの内側にいる（結びへの伏線）
素材:
- ポスト B-1・B-2（20260918）
- Libby Nel「The same thing goes for ChatGPT and the same thing goes for Claude」[29:10]
接続: 製品の反転が、ユーザーの定義の反転になる。後半（アンバサダー）へ渡す橋

### 展開4: なぜ今年、Tableau アンバサダーを引き受けたか
展開する思考:
- これまで引き受けてこなかった理由
  - 自分の中のアンバサダー像は、製品のアンバサダー活動・可視化のパワーを伝える・コミュニティ運営・発信
  - その領域は自分以外にもできる人がいる。肩書が無くてもブログ・登壇で伝え広めてはいた
  - 自分がブログでやりたいこととマッチしていないと正直思っていた
  - 詳細（推薦の経緯）は書かない
- 今年引き受けた理由
  - TC26 では Tableau 側からのユーザーの変化に関するメッセージは控えめだった。他方、Visionary たちが、生成 AI の流れを受けて役割・仕事・Tableau との向き合い方を変えようとする発表をしていた（Beyond the Boundaries of Tableau／5 Things Tableau Developers Should Know About Tableau Next／Keynote の Will のパート）
  - 自分もそれに近い立場で動いている。生成 AI をもっと発信する Tableau ユーザーが日本にいてもいい
  - 5月の TC26 記事に「Datafam がもっと Agent-native になれば嬉しく、自分の発信もそのような内容を続けたい」と書いていた（応募締切より前）
- 肩書を持つ意味
  - 自分の活動は変わらない。変わるのは、その活動が何として数えられるか
  - (a) 日本のアンバサダーが持つ属性の中に、生成 AI をゴリゴリに使う一色を足しに行った
  - (b) 製品が「AI を中心に据えた Tableau」を言うなら、コミュニティにもそういう人がいた方がいい。生成 AI の色を、コミュニティの側面からも支えたい
  - 立場は謙虚に。Tableau への貢献とコミュニティへの還元
- Keynote を見て、役割の見え方は変わらなかった。TC26 で控えめだった Tableau 側のメッセージが、DF26 では自分の役割に近づいてきた（既刊 20260606〜20260913 の日付で示す）
- 余談: 公式の定義文に「shine the spotlight on new voices, innovative ideas」「try out new things」とあることを知らなかった
素材:
- references/tableau-ambassador-official.md（定義文・3特性・Ambassador と Visionary の違い・募集ブログ）
- 既刊 20260512 TC26 感想、20260606、20260607、20260913
- 2026 cohort（20260909 発表）
接続: 前半の反転が、自分の役割の側から見える。payoff

### 結び: 「既に難しい部分を作った」の先の、もう一歩
展開する思考:
- Keynote は「You've already built the hard part」と繰り返した。想定聴衆は既に基盤を持つ組織
- そこから AI も交えて価値を生むには、もう一歩が要る。展開3の習熟度の差はここで埋める
- 雑巾の比喩。霧吹きでテクニックを学ぶだけでは絞っても出ない。浸してから絞る
- 生成 AI のトピックに浸る。まず経験値を積む。「早く何か使って試して深い原体験を作る」（C-15）
  - 既刊でも同じことを書いてきた。「Moving Up the Stack には泥臭く手を動かすフェーズが必要」（20260512）、「脳と手をどこまで作り込むかは、手を動かしてみないと見えてこない」（20260606）
- このブログ自体が浸って書かれている（AI とハーネスを組んで執筆、音声入力、字幕やポストの収集も AI に任せた）
- 「だって Tableau もそういう方向に変わっていくんだから」
残す問い:
- 浸る先は生成 AI を含むデータ活用の情報、と向きは定める。何から手を付けるかだけを読者に委ねる

## 参考資料との接続
| 参考資料 | 記事での活用方法 |
|---|---|
| ポスト A・B・C（references/x-posts.md） | 導入の宣言、展開2の所感、展開3の再定義、結びの Just Do It |
| Keynote 動画・中立要約・要約ノート | 展開1の事実、展開2の出現回数と逐語引用、結びの「already built the hard part」 |
| 画像24枚（references/images/） | 展開1に集約。展開2で Studio・Data Apps を指す時に再掲可 |
| Tableau Ambassador 公式4ページ | 展開4の定義文・Ambassador と Visionary の違い・余談 |
| 既刊 TC26 感想（20260512） | 展開4の引き受けた理由の一次資料 |
| 既刊 20260606・20260607・20260913 | 展開4「Tableau 側が近づいてきた」を日付で示す。展開2の BI🤝AI |
| 既刊 20260512・20260606（手を動かす） | 結びの「浸る」の根。比喩だけにしない |

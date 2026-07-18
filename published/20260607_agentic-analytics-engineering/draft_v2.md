<!-- draft_v2（再構成案）: 「データソースをAgentフレンドリーにするために」章を置かず、
     そのエッセンスを 導入 / ch2 / ch3 に分散させる案。
     新しい章立て:
       導入（dbt の枠組み宣言を追加）
       → Headを軽くしたい（ch2: 任意で PDS=semantic layer 引用を一文）
       → データソースの裏側も整えたい（ch3: 既存の問題提起 + 層化という解 + 効き方の書き分け + lineage 土台）
       → 手作業を、AIエージェントに
       → 最後に
     ※ A/B/C は draft_user.md の既存プローズに「足す」ための素材。丸ごと差し替えではない。
     voice は draft_user.md（口語・（）補足・です/ます）に寄せた。 -->

# 再構成案：「データソースをAgentフレンドリーに」章は立てず、中身を散らす

---

## A. 導入に足す ― dbt の枠組みを最初に宣言する

（導入で2つのエージェントを紹介したあと、本論に入る前に置く想定）

具体的な話に入る前に、この記事を通して借りている考え方を一つ宣言しておきます。dbt で知られる「アナリティクスエンジニアリング」です（dbt そのものを使うわけではなく、考え方だけ拝借するイメージです）。ざっくり言うと、分析の土台を整えるのに方向が二つあります。ひとつは**定義の一貫性**——指標や計算を「一つの正」にまとめること。もうひとつは**変換の層化**——データの加工を、追えるかたちに分けること。この記事でやろうとしているのは、要するにこの二つを Tableau に持ち込む、という話です。これ以降の2つの章が、それぞれの方向に対応しています。

- What is analytics engineering?（dbt。アナリティクスエンジニアリングとは何か）: https://www.getdbt.com/blog/what-is-analytics-engineering

---

## B.「データソースの裏側も整えたい」(ch3) の後半に足す ― 層化という解

（既存の ch3 は「長大 Prep は人にも AI にも解析しづらい」で終わっている。その続きとして）

では、どう整えるか。ここで使うのが、導入で宣言したアナリティクスエンジニアリングの「層化」の発想です。一本に何もかも詰め込まれた Prep を、dbt 流に staging / intermediate / marts といった層に切り分けていきます。staging で素材を整え、intermediate で目的ごとに変換を重ね、marts で「売上」や「顧客」といった“そのまま分析に使える”単位にまとめあげる、というイメージですね。こうすると、さっき「データのレシピ」と呼んだデータソースの裏側が、ぐっと追跡しやすく・読みやすくなります。

- dbt explained（噛み砕いた概念解説。非エンジニア向け）: https://www.getdbt.com/blog/dbt-explained
- How we structure our dbt projects（より詳しい dbt 公式のベストプラクティス・やや技術寄り）: https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview

ちなみにこの層化は、前章で触れたセマンティックレイヤーとは効き方が少し違います。定義をデータソースに寄せるのが「エージェントが正しい定義を直接読める」という効き方だとすれば、層化のほうは「答えがどの加工を経て出てきたのかを辿れる」という、追跡可能性での効き方です。どちらも“整える”ですが、効くポイントが違う——というのは、自分の中で整理がついたところでした。

そして、この追跡しやすさを支えてくれるのが、Tableau の Metadata API です。ワークブック・データソース・フローのスキーマと lineage（どれがどこから来たか）を横断的に拾ってくれます。外部データベースのテーブルや列まで含めて辿りたい場合は、Data Management アドオンの Tableau Catalog も効いてきます。自分の取り組みでも、この lineage を辿る部分が、地味に中心的だったりします。

- Introduction to Tableau Metadata API: https://help.tableau.com/current/api/metadata_api/en-us/index.html
- Use Lineage for Impact Analysis（Tableau Catalog / Data Management）: https://help.tableau.com/current/server/en-us/dm_lineage.htm

lineage（データの来歴）という考え方そのものは、dbt の世界が一番きれいに見せてくれていると思います。source からどんな変換を経て最終成果物に至るかを DAG（有向非巡回グラフ）で描く発想で、これを Tableau のデータソースにも持ち込めたら、というのが自分の狙いです。

- What is data lineage, and why do you need it?（dbt。lineage を平易に解説）: https://www.getdbt.com/blog/what-is-data-lineage

---

## C.（任意）「Headを軽くしたい」(ch2) に一文足すなら ― PDS＝セマンティックレイヤー

（ch2 で「定義をデータソースに寄せる」と言うくだりに、公式の裏付けとして）

ちなみに Published Data Source は、Tableau 公式のヘルプでも "the closest equivalent Tableau has to a semantic layer or semantic model"（Tableau において最もセマンティックレイヤーに近い存在）と表現されています。ロジックをここに寄せる、というのは公式の位置づけとも噛み合っているわけですね。

---

## 章の流れ（確認用）

1. 導入（＋A の dbt 宣言）
2. Headを軽くしたい ＝ 定義の一貫性の軸（＋任意で C）
3. データソースの裏側も整えたい ＝ 変換の層化の軸（既存の問題提起＋B の解）
4. 手作業を、AIエージェントに ＝ 「ここまでが“あるべき姿”。では誰が整えるのか」で受ける
5. 最後に

→ 削除した「Agentフレンドリーに」章が担っていた〈二軸の明示〉は A が、〈効き方の書き分け〉は B が引き継ぐ。重複していたセマンティックの軸は ch2 に一本化。

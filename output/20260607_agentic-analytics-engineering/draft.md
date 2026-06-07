# Tableau に Analytics Engineering を持ち込む実験について

> **Tableau NOTE**
> このブログは、(1) 世界で使われている発展的な技術を広める、(2) Tableau とデータ可視化についての日本語ドキュメントを増やす、(3) 自身が学習した内容を整理し言語化する、の3つを目的に書いています。
> Yoshitaka Arakawa - BI Developer / Tableau Trainer

**参考資料**
- セマンティックレイヤー / Headless BIとは（たくまんさん, Zenn）: https://zenn.dev/takuman/articles/e779a733c5fb35
- Semantic Layer vs. Text-to-SQL: 2026 Benchmark Update（dbt Developer Blog）: https://docs.getdbt.com/blog/semantic-layer-vs-text-to-sql-2026
- Top Announcements from Tableau Conference 2026（Tableau）: https://www.tableau.com/blog/top-announcements-tableau-conference-2026

> ✍️ ここに個人的な書き出し（体験・現在地）を追記。例：最近 Tableau の Agentic Analytics の話を追いかけていて／手元でこんな実装を触っていて、など。

今回は、自分がいま手を動かしている「Tableau に Analytics Engineering を持ち込む」実験について共有してみます。先に、何をやろうとしているのかをざっくり言ってしまいますね。やっているのは大きく二つで、(1) 長大になった Tableau Prep のフローを dbt 流の層に分解・再構成するエージェント、(2) Published Data Source をセマンティックレイヤーとして整備するエージェント、を作っています。

どちらも GitHub に公開しているので、人でも AI でも、興味があれば中を覗いてみてください。

- tableau-prep-architect（Prep の分解・再構成）: https://github.com/YoshitakaArakawa/tableau-prep-architect
- tableau-datasource-steward（データソースの整備）: https://github.com/YoshitakaArakawa/tableau-datasource-steward

なぜこんなことをやっているのか。背景には、Tableau 自身がデータソースを「分析の主役」に押し上げようとしている流れがあります。Tableau Conference 2026 では「Agentic Analytics Platform」が打ち出されましたが、それ以外にも、VizQL Data Service API で Published Data Source を API 経由で直接クエリできるようになっていたり、Tableau Pulse がデータソース上の指標を（ワークブックを介さず）自然言語で読ませてくれたり、複数のデータソースを結合する Composable Data Sources が出てきたり——と、データソースまわりの強化が立て続けに来ています。

こうなると、勝負どころはダッシュボードの見栄えではなく、エージェントやサービスが読みにいく「データソース」そのものに移っていきます。分析の軸足を、ワークブック（head）からデータソース側へ寄せて、データソースを「Agent フレンドリー」な状態に整えておく。自然言語で問えば AI が答えてくれる、その答えの信頼性は、結局そこで決まると思うんですよね。

ただ、その「整える」作業がやっかいなんです。指標の定義を揃えたり、散らかったロジックを層に分け直したりは本来やった方がいいのですが、Tableau は GUI ベースの製品なので、人力でポチポチ続けると正直かなり辛い。そこを AI エージェントに肩代わりさせて、「品質」と「効率」の両取りで進められないか——というのが今回の動機です（このあたりは後半でもう少し詳しく書きます）。

なお、結果を誇る話ではありません。実装してテストまでは通していますが、本格的な運用や反復検証はこれからの段階で、あくまで途中経過の見立ての共有として読んでいただけたらと思います。

---

## これまでのTableauはheadが重すぎた

Tableau は歴史的に「データ可視化」で価値を訴求してきました。誰でもドラッグ&ドロップで分析できる、という体験はすばらしいものでした。ただ、可視化が入口だったぶん、多くのユーザーはロジックを消費側——あとで触れる Headless BI の言葉でいう「head」、つまりワークブックの側——に持たせてきたように思います。指標の計算も、ビジネスルールも、まずは手元のワークブックで書く。その積み重ねで、組織の重心が「ワークブック」に乗ってしまった、という感覚ですね。

どういうことかというと、指標の定義やビジネスロジックが、ワークブックの中や埋め込みデータソースの中に散らばってしまう、という状態です。Published Data Source に接続したワークブックの中で作った計算フィールドは、そのデータソースには保存されず、そのワークブックの中だけのローカルなものとして残ります（他の人が同じデータソースを使っても、その計算は見えません）。だから同じ「売上」でも、ある部署のダッシュボードでは返品額が引かれていて、別の部署では引かれていない、といったブレが起きてしまうわけですね。

Tableau のガバナンス指針でも、データソースを「埋め込みにするか、publish して authoritative source にするか」は管理上の論点として挙げられています（"Data Source Management" の節）。

- Tableau Data and Content Governance（"Data Source Management" の節）: https://help.tableau.com/current/blueprint/en-us/bp_data_and_content_governance.htm
- Best Practices for Published Data Sources（PDS に含める計算の選び方）: https://help.tableau.com/current/pro/desktop/en-us/publish_datasources_about.htm

この「定義が分散する」という課題は、セマンティックレイヤー / Headless BI の文脈で昔から語られてきたものでもあります。たくまんさんの記事がとても分かりやすいのですが、要するに分析ロジック（指標・定義・計算）を可視化の側から切り離して、一度だけ定義して、あらゆる利用先に供給しよう、という発想です。

- セマンティックレイヤー / Headless BIとは（たくまんさん）: https://zenn.dev/takuman/articles/e779a733c5fb35

<!-- 画像: ロジックが各ワークブックに散在している状態（左）と、データソース＝セマンティックレイヤーに寄せた状態（右）の対比図 -->

人がダッシュボードをクリックして読んでいた時代は、これでも何とか回っていたのだと思います。ただ、これからは「機械」がデータソースを読みにくる時代です。冒頭で挙げた Pulse や VizQL Data Service がまさにそうで、ワークブックを介さずにデータソースを直接消費していきます。Pulse の指標は Published Data Source から作られるので、データソース側の定義が雑だと、そのまま読まれてしまうわけですね。

- About Tableau Pulse（Tableau Help）: https://help.tableau.com/current/online/en-us/pulse_intro.htm

つまり、ワークブックも、埋め込み分析も、Pulse も、そして AI エージェントも、等しくデータソースを消費する「窓口」になっていく。「データソースにロジックを寄せておく」価値は、将来の Agentic な話だけでなく、Pulse としてもう現実になっている、ということですね。

裏を返すと、ロジックが head（ワークブック）に溜まって重くなっている状態は、生成AI時代の Tableau の API とは相性が良くないんですよね。エージェントやサービスがデータソースを API 経由で読みにいっても、肝心のロジックがワークブック側に隠れていたら、それは拾えません。だからこそ、Agentic Analytics を見据えて、いまのうちにロジックをデータソース側へ寄せ直して「head を軽くしておく」。そこを是正しておきたい、というのが自分の問題意識です。

### 余談：REST API でビューのデータは読めるけれど

Tableau の REST API でもビューのデータ自体は取得できます。ただ、これは基本的に全件取得で、粒度も元のビューに依存します。なので、生成AI や Text-to-SQL に「必要な粒度で、必要なぶんだけ」問い合わせる用途だと、VizQL Data Service API のほうが素直に噛み合う印象です。データソースを headless に叩く口としては、後者のほうが今風だなと感じています。

---

## 寄せた先も、整っているとは限らない

ここまでは「ロジックをワークブックからデータソースへ寄せる」という話をしてきました。ただ、寄せれば終わり、というわけでもないんですよね。寄せた先——データソースの裏側——がどうなっているか、という問題が残ります。

Tableau でその裏側にあたるのは、多くの場合 Prep のフローです。そしてこれが曲者で、現場の Prep は継ぎ足しの歴史でだんだん一本に肥大していきがちなんですよね。JOIN も計算も整形も、ぜんぶが一本の長いフローに団子状に詰まっている——というのは、わりとよく見る光景じゃないでしょうか。

こうなると、ある数字がどんな加工を経て出てきたのかを追うのが、人間でもしんどい。ましてや AI に読ませて解析させるとなると、なおさらです。つまり、ワークブックからデータソースへロジックを寄せても、寄せ先がこの状態だと、結局は「散らかっていたロジックを、一箇所に積み直しただけ」になりかねない。

ロジックは「どこに置くか」だけでなく、「どう積むか（どう構造化するか）」も質のうち、ということですね。次は、その“整え方”の話に入っていきます。

---

## データソースをAgentフレンドリーにするために

では、軸足をワークブック（head）からデータソースへ寄せて、データソースを「Agent フレンドリー」にするには、何が要るのか。ここで自分は、dbt の学習で出会った Analytics Engineering の考え方を借りています（dbt そのものを使うわけではなく、考え方だけ拝借するイメージです）。やることは、大きく二つだと思っています。

なお、アナリティクスエンジニアリングという営みに馴染みがない方は、dbt の解説が分かりやすいです。データエンジニアとアナリストのあいだの「ギャップを埋める」仕事、と説明されていて、自分の問題意識にも近いんですよね。

- What is analytics engineering?（dbt。アナリティクスエンジニアリングとは何か）: https://www.getdbt.com/blog/what-is-analytics-engineering

一つめは「セマンティックレイヤー」の軸です。指標の定義、各列が何を表すか、デフォルトの集計、計算フィールド——こうしたビジネス定義を一つの正としてデータソースに持たせる、という話です。Published Data Source は、Tableau 公式のヘルプでも "the closest equivalent Tableau has to a semantic layer or semantic model"（Tableau において最もセマンティックレイヤーに近い存在）と表現されています。エージェントがこの「一貫した定義」を読むからこそ、生成されるクエリも正しくなる、という直接的な効き方です。

二つめは「データモデリング」の軸です。さっき触れた、長大な Prep が追えないブラックボックスになってしまう問題——あれがここに直接効いてきます。あの一本の長大な Prep を dbt 流に staging / intermediate / marts といった層に切り分けると、データソースの裏側のロジックが「追跡しやすく」「読みやすく」なります。長大な Prep 一本でも理屈の上では追跡はできるのですが、層に分かれているほうが、答えがどの加工を経て出てきたのかを辿りやすい——人にとっても AI にとっても、ということですね。AI フレンドリーにする、というのはこういう意味です。

dbt のプロジェクト構成のベストプラクティスが、この層分けの考え方の元になっています。staging で素材を整え、intermediate で目的ごとに変換を重ね、marts で「売上」や「顧客」といった“そのまま分析に使える”単位にまとめあげる、という規律ですね。

- dbt explained（噛み砕いた概念解説。非エンジニア向け）: https://www.getdbt.com/blog/dbt-explained
- How we structure our dbt projects（より詳しい dbt 公式のベストプラクティス・やや技術寄り）: https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview

そしてこの「追跡しやすさ」を支える土台が、Tableau の Metadata API です。ワークブック・データソース・フローのスキーマと lineage（どれがどこから来たか）を横断的に拾ってくれます。さらに、外部データベースのテーブルや列まで含めて lineage をきちんと可視化したい場合は、Data Management アドオンの Tableau Catalog が効いてきます。自分の取り組みでも、この lineage を辿る部分が地味に中心的な役割を担っていたりします。

- Use Lineage for Impact Analysis（Tableau Catalog / Data Management）: https://help.tableau.com/current/server/en-us/dm_lineage.htm
- Introduction to Tableau Metadata API: https://help.tableau.com/current/api/metadata_api/en-us/index.html

ちなみに、lineage（データの来歴）という考え方そのものは、dbt の世界が一番きれいに見せてくれていると思います。source からどんな変換を経て最終成果物に至るかを DAG（有向非巡回グラフ）で可視化する、という発想で、これを Tableau のデータソースにも持ち込めるといいなと思っています。

- What is data lineage, and why do you need it?（dbt。lineage を平易に解説。下流への影響が「池の波紋」のように伝わる、という喩えが分かりやすい）: https://www.getdbt.com/blog/what-is-data-lineage

ちなみに、TC2026 で発表された「Auto Knowledge Graph」も、データスタック全体のメタデータを束ねてエージェントに文脈を渡す、という意味では近い発想だなと感じました。lineage そのものというより「メタデータをグラフとして持つ」方向ですが、いずれにせよ“データの周りの文脈を整える”という話に収束していくのが面白いところです（自分もまだ詳しく追えていないので、ここでは紹介まで）。

---

## 手作業を、AIエージェントに

ここまでが「あるべき姿」だとして、問題は誰がそれを整えるのか。これらの整備は Tableau が GUI 製品であるがゆえに、手作業だとかなり辛い領域です。ポチポチ続けるのは骨が折れますし、やる人によって品質もブレてしまう。一方で Tableau は REST API、Metadata API、VizQL Data Service といった API を持っています。だったら、AI エージェントに任せられないか、というのが今回のやろうとしていることです。

やりたいのは、AI に「判断」と「調整」をさせ——必要なところは人間と相談させながら——自律的かつ協働的に整備を進めてもらうこと。「どこで層を切るか」「列の説明を自然言語で起こす」「散らばった計算フィールドの意味を見抜く」といった、規則だけでは書ききれない部分こそ AI に任せ、機械的な実行（ダウンロードや publish、行数・列の比較）は決定的なツールに任せて、結果は元フローとの突き合わせ（parity 検証）で担保する。そんな協働の形で、「品質」と「効率」を同時に取りにいくイメージですね。

<!-- 画像: 役割分担の図。AI＝判断・自然言語草案 / 決定的ツール＝実行・publish / parity検証＝担保 -->

実際に作っているのは、二つのエージェントです。どちらも GitHub で公開しているので、中身は人でも AI でも覗けます。ここでは「何をさせているか」を箇条書きで紹介します。

**tableau-prep-architect — Prep の分解・再構成**

- 既存の長大な Prep フロー（.tfl/.tflx）を読み込み、何をしているフローなのかを解析する
- dbt 流の staging / intermediate / marts に沿って、分解の設計を立てる
- 設計をもとに新しい Prep フロー群を生成し、Tableau Cloud に publish して実行する
- 元のフローと分解後のフローの出力（列・行数）を突き合わせて parity を検証する
- 失敗したら原因を判定し、回復できるものは自律的にリトライする

リポジトリ: https://github.com/YoshitakaArakawa/tableau-prep-architect

**tableau-datasource-steward — データソースの整備**

- 既存の Published Data Source を棚卸しし、メタデータの抜け（説明のない列など）を洗い出す
- 各列・計算フィールドの説明文の草案を、抽出（extracted）か推論（inferred）かの区別つきで作る
- 下流のワークブックに散った重複する計算フィールドを Metadata API で見つけ、データソースに寄せる候補を出す
- 反映するときは元を壊さないよう別名で publish（CreateNew）し、破壊的な反映は人間の承認を挟む

リポジトリ: https://github.com/YoshitakaArakawa/tableau-datasource-steward

繰り返しになりますが、いまの段階は実装してテストまで通したところで、本格的な運用や反復検証はこれからです。「これで解決しました」ではなく、「こういうものを作っている」という共有として受け取ってください。

それと一つだけ。本来こうしたデータモデリングは DWH 側でやるのが筋で（その方が安く、lineage も明快なことが多い）、今回の話はあくまで DWH を触れない・すでに長大な Prep を抱えてしまった、という状況での現実解です。万能薬のつもりはありません。

ひとつ位置づけを補足すると、この方向は Composable Data Sources のような Tableau 公式の流れとも同じ船だと思っています。ただ、Composable が「すでに整ったデータソースを組み合わせる」役だとすれば、こちらは「組み合わせるに値するものを、長大なレガシーから生み出す」前段。だから公式が追いついてきても、この前段の価値は残るんじゃないかな、と思っています。整えたデータソースは Tableau Next 側にも引き継げるようになってきているので、いま磨いておく意味もありそうですね。

- Tableau Conference 2024で発表されたデータソース回りの進化３選（たくまんさん）: https://zenn.dev/takuman/articles/70cabec35abea6

---

## 最後に

今回は、「Tableau に Analytics Engineering を持ち込む」という取り組みについて、やろうとしていることと実装の概要を共有してみました。

書きながら自分の中で改めて整理できたのは、Tableau の勝負どころが「可視化」から「データソースの質」へ静かに移ってきている、という感覚です。可視化で民主化された分、ロジックがワークブックに散ってしまった。それを Agentic な時代に向けてデータソースに寄せ直す——その地道な整備を、AI エージェントという手段で品質と効率の両取りで進められないか、というのが今回の話でした。

まだ分かっていないことも多いです。たとえば、集計ロジックがワークブック側にも残っている場合に、データソースから上流の Prep までリネージュを辿っていく、というところはまだ手をつけられていません。Tableau MCP にこの辺りを助けてくれるツールがあると嬉しいな、と思っていたりします。「AI に Prep そのものを作らせる」という工学的な面白さの話も、別の機会に書いてみたいですね。

最後に問いを一つ置いて締めます。みなさんのデータソースは、エージェントが読みにきても大丈夫な状態になっているでしょうか。自分もまだ道半ばなので、また考えが進んだり、運用の事例が出てきたら、その時にまた書いてみます。

質問などありましたら、XかLinkedinまでお願いします。それでは！

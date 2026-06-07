# TableauにAnalytics Engineeringを持ち込む実験

この記事では、最近試している「Tableau に Analytics Engineering を持ち込む」実験について共有します。

何をやろうとしているかを簡潔に言うと、以下の2つに取り組んでいます。

1. （長大になってしまった）Tableau Prepフローを、dbtの流儀を参考に、複数の処理層に分解・再構成するAI Agentの作成
2. Published Data Source をセマンティックレイヤーとして整備するAI Agentの作成

ここ2年ほどでTableauデータソースが、Tableau x AIにおける主要な要素になっていると認識していることが動機です。

- 2024年：Tableau Pulseの登場。これはデータソース上の指標を（ワークブックを介さず）自然言語で読ませてくれる
- 2025年：VizQL Data Service API で Published Data Source を API 経由で直接クエリできるようになった。
- 2026年：Tableau Conference 2026 では「Agentic Analytics Platform」という構想が打ち出された。また複数のデータソースを結合する Composable Data Sources が2026.2でリリースされる。

このあたりにはHeadless BIの流れを意図した流れもあるように思います。特にAgentic Analyticsの文脈が、このトピックを加速させているように見えますね。

というこでデータソースやロジックの整備と集約を進めたいものの、TableauはGUIローコードツールで訴求し普及した側面があるため、この辺りを整備するコストがどうしても高くなりがちです。

特に、歴史的にHead側／ワークブック側にロジックを集約しているケースは多いのかなと…人間主体かつセルフサービス主導のデータ分析活動ではそこまで問題になりませんが、ここにAIを巻き込もうと思うと、Tableauデータソース整備は検討するべき事項かなと思います。

（まぁ人間にとっても「正しいロジックはどこにあるのか」「何が正しいのか」は重要なのですが）

この大変な作業を、Tableauの豊富なAPIとAI Agentを使いながら、「品質」と「効率」の両取りで進められないか、というのが実験の動機です。

ただし、本記事では結果を語りません。執筆時点では簡単なテストしか出来ていないこと、自分もTableauコンテンツの運用に取り入れられていないためです。

あくまで途中経過の見立ての共有として読んでいただけたらと思います。

そしてもう1点...具体的な話に入る前に、参考にしている考え方を紹介します。dbtの「アナリティクスエンジニアリング」です。

参考：[What is analytics engineering?](https://www.getdbt.com/blog/what-is-analytics-engineering)

分析の土台を整えるために、定義の一貫性をTableauデータソースに集約し整えること、またTableau Prepでのデータの加工を理解しやすいかたちに分けること、この２つをTableau に持ち込みます。

## 動機1: Headを軽くしたい

Tableau は歴史的に「直感的に作れるデータ可視化」で価値を訴求してきたように思います。誰でもドラッグ&ドロップで分析できる体験はすばらしいものでした。

ただし可視化が入口だったため、多くのユーザーはロジックを消費側、つまりワークブックの側に持たせてきたように思います。指標の計算もビジネスルールもまずは手元のワークブックで書いている状態です。

（Tableauコンテンツを管理する部署がいれば緩和されていると思いますが、セルフサービスの本質として、ワークブックで作りがちになってしまうなと...）

この状態が困るのは、指標の定義やビジネスロジックが、ワークブックの中や埋め込みデータソースの中に散らばってしまうことです。

例えば同じ「売上」でも、ある部署のダッシュボードでは返品額が引かれていて、別の部署では引かれていない、といったブレが起きてしまう、など...

そしてそのブレは、ワークブックの中身を紐解くまで分からない...と。

この「定義が分散する」という課題は、セマンティックレイヤーとHeadless BIの文脈で語られてきた理解です。

要するに分析ロジック（指標・定義・計算）を可視化の側から切り離して、一度だけ定義して、あらゆる利用先に供給しよう、という発想です。

- [セマンティックレイヤー / Headless BIとは](https://zenn.dev/churadata/articles/e779a733c5fb35)
- [Centrally defined metrics: The key to AI success](https://www.getdbt.com/blog/centrally-defined-metrics)

一方で、現在のTableauはワークブック・ダッシュボードだけでなく、Tableau Pulse もAI Agentも視野に入れる必要があります。

上記に対応し、またそれぞれの窓口でのデータ消費を効率化するため、ロジックがHead（ワークブック）に溜まって重くなっている状態からPublished Data Source側に寄せたいという動機です。Headが重い状態は生成AI時代とは相性が悪いと思っています。

## 動機2: データソースの裏側も整えたい

ここまでは「ロジックをワークブックからデータソースへ寄せる」という話をしてきました。ただしワークブック側で持っているロジックは、行単位または集計に関するものが主かと思います。

この章では、データソースを作成するデータ加工プロセスに焦点を当てます。つまりTableau Prepの話です。

使用するデータソースが加工・集計されているとして、そのロジックも参照可能にする必要があります。分析の問いに応えるために、データのレシピを知る必要がある場合があります。

Tableau Prepもまた直感的に使用できてしまうがゆえに、一つのPrepフローに多くのステップを盛り込んでいる場合が散見されます。クリーニングステップだけでなく、長い加工フローの中に、JOINもUNIONも色々混ざっている、など...

（Tableau DesktopもTableau Prep Builderも、操作感が良いことが逆に困りごとを生んでいる時がありそう...）

この状態ではデータ加工ロジックを紐解くことが困難になります。人間にとって難しいことは言うまでもなく、また生成AIにとっても、tflファイルが長くなること等から、少なくとも効率的な解析にならないことが予想されます。

では、どう整えるか。ここで使うのが、アナリティクスエンジニアリングの「層化」の発想です。

一本に何もかも詰め込まれた Prep を、dbt 流に staging / intermediate / marts といった層に切り分けていきます。

- staging で素材を整える
- intermediate で目的ごとに変換を重ねる
- marts で「売上」や「顧客」といった"そのまま分析に使える"単位にまとめあげる

というイメージですね。

目的ごとに分解するので、追跡しやすく読みやすい形にします。

参考資料：
[dbt explained](https://www.getdbt.com/blog/dbt-explained)
[How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview)

そして、この追跡しやすさを支えてくれるのが、Tableau Metadata APIです。ワークブック・データソース・フローのスキーマとLineageを横断的に拾ってくれます。

参考資料：
[Introduction to Tableau Metadata API](https://help.tableau.com/current/api/metadata_api/en-us/index.html)

## 手作業で整えるのは辛いので、AI Agentにお願いする

ここまでが「こうしたい姿」だとして、誰がそれを整えるのかは問題ですよね。

TableauはGUIが強い製品であるがゆえに、手作業だとかなり辛い領域です。自分だったらやりたくはないですね...価値はあると思いますが、対象も多いでしょうし、Prepフローを理解して分解するのも辛いので...

人海戦術を取るにしても、品質がブレますよね。

一方でTableauはREST API、Metadata API、VizQL Data Serviceといった API を持っています。これらを使ってAI Agentに任せてみたい、というのが今回の動機です。

実際に作っているのは、２つのエージェントです。どちらも GitHub で公開しているので、中身は人でもAIでも覗けます。ここでは「何をさせているか」を箇条書きで紹介します。

**tableau-prep-architect：Prep の分解・再構成**

- https://github.com/YoshitakaArakawa/tableau-prep-architect
- 既存の長大な Prep フロー（.tfl/.tflx）を読み込み、何をしているフローなのかを解析する
- dbt 流の staging / intermediate / marts に沿って、分解の設計を立てる
- 設計をもとに新しい Prep フロー群を生成し、Tableau Cloud に publish して実行する
- 元のフローと分解後のフローの出力（列・行数）を突き合わせて parity を検証する
- 失敗したら原因を判定し、回復できるものは自律的にリトライする

**tableau-datasource-steward：データソースの整備**

- https://github.com/YoshitakaArakawa/tableau-datasource-steward
- 既存の Published Data Source を棚卸しし、メタデータの抜け（説明のない列など）を洗い出す
- 各列・計算フィールドの説明文の草案を、抽出（extracted）か推論（inferred）かの区別つきで作る
- 下流のワークブックに散った重複する計算フィールドを Metadata API で見つけ、データソースに寄せる候補を出す
- 反映するときは元を壊さないよう別名で publish（CreateNew）し、破壊的な反映は人間の承認を挟む

繰り返しになりますが、いまの段階は実装して簡単なテストまで通したところで、本格的な運用や反復検証はこれからです。「これで解決しました」ではなく、「こういうものを作っている」という共有として受け取ってください。

ちなみに、本来こうしたデータモデリングは DWH 側でやるのが良いはず、今回の話はあくまで DWH を触れない・すでに長大な Prep を抱えてしまった、という状況での現実解です。Tableauで全部解決するのではなく、組織の資産・環境と相談した上で、上記を参考にしてください。

## 最後に

ということで、Agentic Analytics PlatformとしてのTableauを見据えた、実験的アイデアの共有でした。

手元の個人Tableau Cloud環境でもう少し実験ができ、ちゃんと実践して整理した記録も書いてみたいので、そちらは形になったら後日書いてみたいです。

追加でやってみたいアイデアもいくつかあります。Metadata APIとLineageにも触れましたが、これも良い感じのDAGを書いて出してくれるAgentかSkillも作りたいですね。[こういう感じ](https://docs.getdbt.com/blog/dbt-explorer)のイメージです。

（TC26で発表のあったAuto Knowledge Graph機能がそういう感じなんですかね？）

最後までお付き合いをありがとうございました。

質問などありましたら、XかLinkedinまでお願いします。

よいAgentic Analyticsを！

**余談：**
[Blog執筆サポートAgent](https://github.com/YoshitakaArakawa)に、[挿絵を作るSkill](https://github.com/YoshitakaArakawa/my-blog-supporter/tree/main/.claude/skills/illustrate)を足しました。割とそれっぽい図が出来ていると思いますが、どうでしょう？文字だけの記事だと辛くなりそうなので、図を足してみました。

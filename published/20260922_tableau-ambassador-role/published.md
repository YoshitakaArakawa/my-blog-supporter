<!-- source: https://www.yarakawa.com/single-post/reflections-on-df26-and-ambassador / fetched: 2026-09-26 / method: playwright-cli + wix-html-to-md -->
<!-- 公開記事の取得スナップショット（fetch-page の yarakawa.com 手順）。毎回上書き。 -->
```
公開日: 2026/09/26
最終更新: 2026/09/26

参考資料
- How to Bring Agentic Analytics to Your Org | Tableau Keynote, Dreamforce 2026
```

この記事では、[Dreamforce 2026のTableau Keynote](https://www.youtube.com/watch?v=Gg37k9tM7vo)の感想と、[今年Tableau Ambassadorとして活動させていただく](https://www.tableau.com/blog/introducing-2026-tableau-ambassadors)にあたって考えていることを書きます。

前半はKeynoteが示した方向を自分の言葉で捉え直す話を、後半はその方向の中で、Tableau Ambassadorとしての活動方針？抱負？についての話を書きます。

---

## Keynoteで語られたメッセージ

Keynoteを一言でまとめると、TrustとSpeedで、Data-driven企業からAgentic Analytics企業へ移行しよう、という話だったと理解しています。
その中身が、3つのステップと、それに紐づく4つの製品・新機能でした。

---

**Keynoteの中身**

上記の「3つのステップ」とは、以下の通りです。

- 組織の全員をBuilderにする（Tableau Studio / Tableau Data Appsの話）
- Intelligenceの側から人のところへ来させる（Proactive Intelligenceの話）
- 信頼できる基盤の上に組織の意味と文脈を載せる（Tableau Knowledgeの話）

<!-- 画像:  -->

**Tableau Studio**

チャットと従来型の編集画面を行き来しながら、Tableau Agentと一緒にデータ分析をして、そして必要に応じてTableauの見慣れた編集画面でグラフを作る体験を提供するアプリのようです。
AIと人間の協業を前提に設計された分析環境に見えました。これは従来のようなTableau AgentがTableau製品の上に乗っただけのような形ではなく、AI-nativeなBIを目指している印象を受けました。

（詳細は後述し、まずは紹介に留めます）

<!-- 画像: Tableau Studioの紹介パート（開始から10分ほどから） -->

[Tableau Studioの紹介パート（開始から10分ほどから）](https://www.youtube.com/watch?v=Gg37k9tM7vo&t=613s)

<!-- 画像: Tableau Studioのチャット画面でデータ分析をする様子。動画で見る方が分かりやすいです。 -->

Tableau Studioのチャット画面でデータ分析をする様子。動画で見る方が分かりやすいです。

<!-- 画像: チャットに表示されたVizを、Tableauの見慣れたUIで編集する様子。 -->

チャットに表示されたVizを、Tableauの見慣れたUIで編集する様子。

**Tableau Data Apps**

ClaudeやChatGPTの中でTableauのデータを使ったアプリを作り、それをTableau（実際にはTableau Next?）へパブリッシュできる機能のようです。

TableauのVizを作る機能ではなく、Webアプリ自体を作ってそのままTableau（Tableau Next?）で共有するための機能のように見えました。

Tableauユーザー的には、作ったTableau ExtensionsをそのままTableau上で公開できるようなイメージになるのかなと。ただしこれはBI向け機能というよりはアドホックな分析やアプリを共有するための機能のように見えたので、価値訴求も含めて、ちょっと続報と詳細を待ちたいですね。

```
自分は最初、既存のTableau MCPやTableau系のPluginを総称してTableau Data Appsと呼んでいると誤解していました。Keynote前の9/14にChatGPT向けPluginが出たニュースが印象的だったので、そういう話という先入観で見てしまった...
```

<!-- 画像: Tableau Data Appsの紹介パート（開始から15分30秒から） -->

[Tableau Data Appsの紹介パート（開始から15分30秒から）](https://youtu.be/Gg37k9tM7vo?si=i-nQ_ZKutJAEzzFk)

<!-- 画像: AIがアプリを組み立て、Tableauへパブリッシュする様子。 -->

AIがアプリを組み立て、Tableauへパブリッシュする様子。

<!-- 画像: 実際に作成されたWebアプリ。SalesforceのUI上というか、Tableau Next上にあるように見えますね。 -->

実際に作成されたWebアプリ。SalesforceのUI上というか、Tableau Next上にあるように見えますね。

**Proactive Intelligence**

既存のデータアラートの上にエージェントが常駐し、変化を見つけてSlack / Teams / ChatGPT / Claudeなど、あなたが良く使うツールへ届ける、という世界観のようです。

発表の中にあった以下の言い回しが印象的でした。

> *What if instead of looking for an insight, intelligence found you at the right moment in your flow of work?*
> *（インサイトを探しに行く代わりに、仕事の流れの中のちょうどいい瞬間に、Intelligenceの方からあなたを見つけに来たらどうだろう？）*

<!-- 画像: Proactive Intelligenceの紹介パート（開始から23分30秒から） -->

[Proactive Intelligenceの紹介パート（開始から23分30秒から）](https://youtu.be/Gg37k9tM7vo?si=yCIWMJkJueDI7MWk&t=1410)

**Tableau Knowledge**

組織にとって唯一の、信頼できるナレッジの基盤、という位置づけでした。

セマンティックモデルやパブリッシュ済みデータソース、ドキュメントや用語集を読んで、ナレッジグラフを自動で作ります。

構築されたナレッジがどれだけ健全かはHealth Scoreとして示され、指標の定義の衝突や、いつの間にか定義が変わった指標を検知して、修正案まで出してくれるようです。

リッチなTableau Catalogと何が違うのかと思って見ていたのですが、修正対象を自動で検知して直す提案まで組み込みで出てくる体験は面白そうでした。

<!-- 画像: Tableau Knowledgeの紹介パート（開始から35分20秒から） -->

[Tableau Knowledgeの紹介パート（開始から35分20秒から）](https://youtu.be/Gg37k9tM7vo?si=SYD9jSZ8OOAEACJQ&t=2123)

<!-- 画像: 構築されたナレッジの自動健康診断。 -->

構築されたナレッジの自動健康診断。

<!-- 画像: Tableau Studioから、壊れた計算フィールドの検知と修正案を扱う様子。 -->

Tableau Studioから、壊れた計算フィールドの検知と修正案を扱う様子。

**Tableauの世界観がどう変わっていくのか**

Keynoteの話は全て面白かったのですが、自分は特にTableau Studioの話が印象に残りました。

まず前提として...データを使って何かを作る・可視化する・分析することは、TableauのCreator / Explorer / Viewerというライセンスの区分には全然閉じていませんよね。ライセンスに関わらず、Tableauにあるデータもないデータも、自分のビジネス上の行動や意思決定のために生成AIと協業して、分析やレポートを作ることは、もう普通になったと思っています（MCPとかSkillsとかPluginsとかの仕組みに感謝）。

Keynoteでの「全員がBuilderになる」というのは、そのような世界観の話として受け取りました（そしてその世界を支えるTableau Knowledgeという構図ですね）。

<!-- 画像:  -->

この前提において、Tableau Studioの話が面白かったです。

Keynoteの言葉を借りると、Tableau Studioは「ゼロから作り直してデスクトップの動き方を考え直した、再構想されたTableau」です（Keynote動画の11:51 - 11:58)。

> *Tableau Studio is a completely reimagined version of Tableau. We've built it from the ground up. We're reimagining how desktop works.*

つまり既存のTableauにAI機能が足されたのではなく、Tableau Desktopというアプリが提供する体験そのものが、可視化を作るためのツールから、生成AIと協業しながらデータ分析をするためのツールへ変わっています。

これは「Tableauとは何か」という世界観を大きく動かしたように感じます。結論としては、こういう世界を提示したのかなと。

<!-- 画像:  -->

「Tableauの上にAI」から「AIを中心に据えたTableau」への進化です。

これまではTableauという製品の上にTableau Agentのような機能が乗る形でした。これからはAIとの協業を中心に置いた上で、Tableauの中（Tableau Studio）でも、普段のAIツールの中でも、同じ信頼できる基盤につながる形に、体験を作り直そうとしているように見えました。

特に普段のAIツールの中から使う場合に関しては、以,下の図でHeadless Analyticsとして語られていました。継続的にリリースが続いているTableau MCPや、最近話題になった[Plugin](https://github.com/tableau/tableau-plugin)の世界ですね。

<!-- 画像: Headless Analyticsの紹介パート（開始から6分ごろ） -->

[Headless Analyticsの紹介パート（開始から6分ごろ）](https://youtu.be/Gg37k9tM7vo?si=JSizyqRqg74Djqo7&t=369)

ということで、Keynoteを自分なりに総括すると、Tableauは可視化を作るツールから、生成AIと協業してデータ分析をするためのツールへ変わろうとしている、というものでした。

ライセンスに関わらず全員がBuilderになり、その足元に信頼できる基盤があり、Intelligenceの側から人のところへ来る。その3つが揃った姿を、Tableauが自分の製品で示してきたのが今回のKeynoteだったと受け取っています。

## なぜ今年はTableau Ambassadorとして活動するのか

ここからは今年のTableau Ambassadorを拝命することに関して、ここまでのKeynoteと絡めての考えを書きます。

ここ数年、Tableau Ambassadorの推薦を辞退していました。端的には肩書を必要としていなかったからです。アンバサダーの称号があっても無くても自分の活動は変わりませんし、また自分の活動方針はTableauスキルの再現性の提供でしたので、自分に箔をつける必要性も無かった、というのもあります。この辺りの思想は、過去に[別の記事](https://www.yarakawa.com/single-post/the-art-of-being-unremarkable)に書いていました。

（推薦を承諾したとしても自己PRを提出する必要があり、その中身で普通に落選する可能性は全然あったのですが、一旦それは置いておきます）

ただし、今年は考えを変えてみます。

今年はTableau Conferenceに現地参加する機会に恵まれ、Tableauからのメッセージを、その場で見て感じ受け取る体験をしました。また、Tableau Visionaryたちが生成AIの流れを踏まえて、コミュニティにどのようなメッセージを伝えようとしているかを見ました。

Tableau Ambassadorへのひと押しをしたのは、変化が必要な時に、変化を実践して見せて伝える姿でした。この姿勢の一助になってみても良いかもしれない、という直感です。

（TC26の詳細な感想は[こちらの記事](https://www.yarakawa.com/single-post/reflections-on-tc26)に譲ります）

やってみたいのは、Tableauコミュニティリーダー称号を持っている人間が、AI x BIの世界と実践を見せて伝える状況を作ってみることです。

称号を持たなくても発信はできますし、実際にやってきました。それでも上記の目的のために、あえて称号を持った上で動いてみようと思います。

これは日本のTableauユーザーコミュニティ、日本のTableau Ambassadorコミュニティに「Tableauユーザーだったら、このくらいのAI活用やAI系トピックも行うよね」みたいな属性を足しに行きたい意図がありますね。

そしてKeynoteの話で見てきたように、Tableau自体もAI前提に動いていますよね。

「MCPもAIも全部含めて、データを見て理解してアクションできる、それがTableauユーザー」みたいな世界観が今後やってくるのであれば、それはとても楽しそうに思っています。

Tableauはずっと可視化ツールでありBIツールでしたが、今年はその世界観や認知が大きく変わりそうです。拝命時には当然Keynoteの話は全く知りませんでしたが、結果的には良い選択をしたように思いました。面白くなっていく製品のユーザーコミュニティを盛り上げる役割を担えそうなので。

<!-- 画像:  -->

ということで、Tableau Ambassadorとして、まずは１年がんばってみます。

**宣伝**

BI x AI系のTableau Ambassadorとして登壇する、イベント2つの宣伝をします！

実践と実践からの学びをお見せするイベントです。ご参加をお待ちしております！

[**Tableau Now!　〜 Dreamforce 2026 Recap 〜**](https://techplay.jp/event/1000848)

日時：10月13日 (火) 19:00 - 21:00

この記事でも扱いました、DreamforceのTableau Keynoteをテーマに、同じくTableau Ambassadorの平塚さんと一緒に登壇します。自分からはTableau  MCPとその周辺をテーマに、Keynoteから感じたTableauの方向性も交えて発表します。

オンライン配信なしの本気会です。お待ちしております。

[**Agentforce World Tour Tokyo 2026**](https://www.salesforce.com/jp/events/world-tour/tokyo/)

セッション名：AI時代を楽しみ抜け！コアユーザーが語るTableauとAIの世界

日時：2026年11月19日 (木) 17:00 - 17:20

こちらのセッションでは[Vizトーク](https://x.com/hashtag/Viz%E3%83%88%E3%83%BC%E3%82%AF?src=hashtag_click)メンバー3名で、Tableau x AIの世界を20分に詰め込んでお話しします。

Trailblazerシアターでの開催なので、拍手とか歓声とか音はいっぱい出せそうですね。楽しさ全開でお送りする予定です、ぜひご参加ください！

---

## 最後に

ということで、Dreamforce 2026のTableau Keynoteの感想と、今年Tableau Ambassadorとして活動するにあたって考えていることを書きました。

Keynoteで語られた世界観が製品としてどう実現されるのか、ライセンス費用対効果はどうなるのか、などは気になるところです。何よりも実際に使えるようになり、そして体験して価値観を作ることを楽しみにしています。

そしてTableau Ambassadorとして、Tableau x AIやBI x AIの世界を伝え広めていきたい所存です。この一年で実践する方もかなーり増えてきたように思いますが、何よりも楽しい世界なので、より多くの方を巻き込んでいきたいですね。

ここまでのお付き合いをありがとうございました。

質問などありましたら、XかLinkedInまでお願いします。それでは！

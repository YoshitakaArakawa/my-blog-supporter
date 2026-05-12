

公開日:	2026/05/12
最終更新:	2026/05/12 




Tableau Conference 2026 (TC26) に参加・登壇してきました。





Workout Wednesday Live



AI-Powered Tableau Development and User Experience



念願のTC現地参加でした。KeynoteやDevs on Stageでの内容まとめは多くの方が出しているので、この記事では自分の感想を書いていきます。
KeynoteやTrue to the CoreなどのTableauリーダーシップからのメッセージ、現地で浴びたユーザー主導／Tableau主導の各種セッションを踏まえて、比較的AI Agentの世界に触れている（と願いたい）自分がいま、何を考え・感じているかを書いてみます。



Tableau Next や Agentforceなどの文脈も入りますが、まだ実務で使ったことがありません。この辺りは見聞きした内容からの想像が入ることをご了承ください。







見出しTC26 Keynoteで提示された、Architectというキーワード



本文Keynoteでは様々な内容が紹介されましたが、自分にとって印象深かったのは「Architect」というキーワードです。















出典: Unlock the Power of Agentic Data | Tableau Conference 2026 Keynote Replay



Tableauを「Agentic Analytics Platform」として再定義する。
これからのTableauユーザーは:





Knowledge Architect（データやセマンティクスを設計する人）



Decisions Architect（意思決定の流れを設計する人）



Agentic Architect（AIエージェントを設計する人）

という、3つの「Architect」のいずれか、もしくは複数の組み合わせとして動いていきましょう、というメッセージと受け取りました。



この辺りのメッセージ性や方針については、自分は摩擦なく受け止めています。

単なる「可視化やダッシュボードを作る」「データを整える」というロールに留まらず、Agenticの要素も取り入れながら、人間とAIの両方が最短距離で最適な意思決定と行動をできるように貢献していきましょう、という方向性は、とても妥当に見えます。


かつ、アーキテクトという設計重視、環境整備重視のニュアンスは、昨今のAI Agent動向とも親和性があるように見えます。例えばAnthropicのBlogから：





Effective context engineering for AI agents



Harness design for long-running application development



Scaling Managed Agents: Decoupling the brain from the hands



今回のKeynoteは、Tableau Nextの機能紹介の話や、「Help people see and understand data」のニュアンスは薄れていたように思います。

もっと広い世界に開いていく方向性を強く打ち出してくれたことを歓迎しています。



一方で、Keynoteでもそうですが、今回のTCにおけるTableauからのメッセージに違和感を覚えていました。それは内容に関してではなく、我々への忖度のような空気です（筆者の勘違いである可能性は、もちろん大いにありますが）。







Architectとして動くための、ユーザー側の準備はあるか



この3つのArchitectとして活躍する世界では、確実にTableau Cloud/Server/Desktop/Prepなどの、いわゆるTableau Classicの世界では完結しないのではと。

もちろんTableau Next以外でもAgentic Analytics Platformをサポートするんだ、というメッセージはありましたが、（Tableau/Salesforceの文脈で語れば）本格的に実装するならNextやSlack連携、Salesforce各種製品との密な連携は避けて通れないはずですよね。

この想定の上で、KeynoteやTableau側からのメッセージに、どこまで具体的な世界観の提示があったのかなと。



Tableau MCPに限って言っても同じです。Tableau MCPを使ってAgenticに何かしたいのであれば、Tableau MCP、Tableauの各種APIに話を絞れないはず。もっとOpenAIやAnthropicなど、AIプロバイダー側の世界や主張、メッセージも含めて、我々が理解していかないといけないのでは、と。

一方で、TCの目的と参加者層を考慮してか、かなりTableauに話が閉じていた印象を受けました。



自分はAI系、MCP系のセッションを多めに参加しました。その中で「MCP使ったことある人？」「Claude Codeなども使ったことある人？」などの質問がスピーカーから投げられた際に、会場から手が上がる人の少なさが気になりました。

(自分が参加したセッションがそうだった、という話かもしれませんが)



繰り返しになりますが、Tableau は「Architect」という言葉を用いて、データに関わる我々のロールの広がりを提示してくれました。これ自体には、前段で書いた通り、自分は完全に同意しています。



ただ、ここで一度立ち止まって考えてみたいのは、我々のほうに、そのロールの広がりを受け入れて実践していく準備が、現在どこまでできているか、ということです。

MarkにしてもSouthardにしても、本当は伝えたい世界観や機能の話があったのではないか？この辺りの所感は、True to the Coreに参加したときの応答からも、感じるところはありました。







むしろVisionaryが変化の必要性を主張していた



自分が参加した中ですが、特に印象に残ったセッションが以下2つです。





Beyond the Boundaries of Tableau (特に26:40から)



5 Things Tableau Developers Should Know About Tableau Next



Tableau Visionaryを端的に表現すれば、要はTableauコミュニティリーダーたちです。その彼らがTableauユーザーに、Tableauや現在のスキルセットを拡張することについて言及していた。その構図が面白かったです。



あくまでも自分の印象ですが、Tableau側からのユーザーの変化に関するメッセージは控えめだと感じました。他方、コミュニティリーダーには、変化すること、拡張すること、先に行くことを雄弁に主張している人たちがいた。



Keynoteに戻れば、Willさんのパートも過去のTCから考えるとユニークな内容でしたよね。Tableauの機能の話が主軸ではない。Tableau Nextも出てこない。Claude CodeとTableau MCPを使ったデモが主でした。



True to the CoreでMarkが以下のような内容を語っていたように記憶していますが、「業界も変わってきている、製品も変わってきている、人や学びも変わらないといけない」という内容は、至極真っ当だと思いました。

そしてその変化は、この1年間でまとめて起きましたよね。例えば去年のTC25でTableauリーダーシップとユーザー双方が見えていた景色と、今回のTC26で見えていた景色は、まったく異なるものではないでしょうか。
（Tableau MCPでさえ、リリースから1年も経っていません）



ややTableauの文脈から離れますが、最近自分はdbtというデータモデリング、アナリティクスエンジニアリングの製品とコンセプトについて学んでいます。

これはAgentic Analyticsを進める上で、TableauのようなGUIベースでのアプローチからコードベースでのアプローチに領域を伸ばしたいという意図が主ですが、dbtの方が書いているBlogがこの1年ほどずっと好きです。最近だと以下2つとかですね。





BI’s Second Unbundling



Five things I believe about the future of analytics



例えば我々が2025年以前に組み立ててきたBIやTableauに対するメンタルモデルは、Agenticというアプローチが現実的になったことから、自分の知見を広げつつ大きく更新する必要があるのかもしれません。

学ぶ、更新する、組み立てる、補強する...これらを回しながら、よりデータから価値を届けるため（TC26の文脈で言えば、あの3つの領域でArchitectし価値最大化するため）、我々ユーザー側の方が、誰に言われるまでもなく、変化に対して動けるのではないのでしょうか。その先駆けが自分が拝聴したVisionariesの言葉だったのかなと、そのように受け取っています。







最後に



「Architect」というロールの広がりを実現するのは、Tableauの機能強化やメッセージを待つ姿勢ではなく、能動的に自身を拡張する姿勢にあるのかもしれない、と思いました。

例えばTableauのナレッジグラフの話は面白そうでしたが、あれはAIフレンドリーな形態になるのか？APIはどうなるんだ？などを考えると、そもそも別の製品や世界観を模索するべきではないか、という話もありそうですよね。



Tableau側の機能拡張を待つことも良いですが、いまのTableauで出来ないが実現したいことを、AIの力も借りながら他製品や他製品的なコンセプトも組み合わせながら、我々ユーザー側が進めても良いのかなとも思っています。

この辺りはBI’s Second Unbundlingの主張に影響を受けているかもですが。



何かに習熟した後に、何かの初心者になることは心情的・時間的な難しさがあるかもしれません。自分もずっとTableauの世界で幸せに生きられたら良かったのですが、Moving Up the Stack - 高いステップへと自分も人も進めるためには、やっぱり泥臭く手を動かすフェーズは必要になりますよね。



ということで、自分のTCの感想をまとめると、以下に集約されるのかなと思いました。





Architectの世界観は同意！いいメッセージだった！



Datafamは最高！ネットワーキングやユーザーからのメッセージは刺激的！



コンテンツはもっとTableauに閉じない話や、技術的な話が欲しかった！細かい話は何とかついていくので！



来年はもっと我々に忖度のないAgenticの事例やコンセプトを聞きたい！



DatafamがもっとAgent-nativeになれば嬉しく、また自分の発信もそのような内容を続けたい



質問などありましたら、XかLinkedinまでお願いします。それでは！




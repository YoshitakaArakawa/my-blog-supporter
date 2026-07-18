# Dataiku Summit 2026 ── AIオーケストレーションの「いま」と「これから」を考えた

公開日:

最終更新:

参考資料
- Dataiku Summit TOKYO 2026（公式）：https://meet.dataiku.com/dataiku-summit-tokyo-20260609/
- Agent orchestration explained（Dataiku Blog）：https://www.dataiku.com/stories/blog/agent-orchestration-explained
- AI時代の組織図の変化（Note）：https://note.com/gimupop/n/n5bbdf9720bdb

[Dataiku Summit TOKYO 2026](https://meet.dataiku.com/dataiku-summit-tokyo-20260609/)に参加してきました。

普段自分が触れているようなClaude CodeやCodexとは異なった立場からのAgentic時代に関する思想やインプットに触れ、とても刺激的な会でした。参加して楽しかったです。

自分はDataikuを数年前に知り、ユーザーとして使う機会は無かったものの、動向は長らく気になっていました。データサイエンスの民主化やML Ops、データパイプライン、LLM Mesh的な話など、製品方針の進化をふわっと追ってきていました。今回のSummit参加も、どちらかと言えば非ユーザーとして、現在のDataikuの動向を知るための参加でした。

Summitのコアメッセージは以下2つだと受け取りました。

- AIの成果をどのように実際に届けるか（AI Success, Delivered）
- 人の専門性とAIを繋ぐ統合プラットフォームの必要性（People + Orchestration + Governance = AI Success）

自分は現在のフェーズで言えば、Coding Agentを念頭に個人成果の拡大を追求し、また知見をまずは自部署や自領域で広めるフェーズにあります。

組織的なAI価値最大化を狙うフェーズや立場にいるわけではありませんが、上記のコアメッセージには深い納得がありました。AIオーケストレーションプラットフォームについての話は、色々な所で話題になり始めている印象もあります。

一方で、AIを使っている現場レベルの人間としては、例えばClaude Codeや関連領域を使ったり学んでいるときほどの興奮を覚えない、という所感はありました。

ただし上述のように、必要性や方向性に納得がありました。つまり主張や製品の方向性には合理性があるはずなのに、どこか違和感を感じる。それは自分のAI活用フェーズの問題なのか、AIに対する向き合い方や思想の問題なのか。

この記事は、なぜ自分がもつ違和感を言語化してみる試みです。

なお本記事を執筆している時点では、以下のレポート記事があるようでした。

まずは自分の原体験や感想を記述することを優先したため、以下の記事は深く目を通さずに、この記事を書いています。Keynote内容などが気になる方は、ぜひこちらもご覧ください。

[Dataiku Cobuildによる非エンジニアの自走の可能性 — Dataiku Summit Tokyo 2026 で見えた仮説](https://zenn.dev/taro_cccmkhd/articles/d644d016d3ba6b)

[Dataiku Summit Tokyo 2026 keynoteレポート](https://www.keywalker.co.jp/ai-solution/dataiku_summit_keynote2026_06.html)

---

## そもそもAIオーケストレーションとは何か

まずはオーケストレーション層に関しての、自分の理解を簡単に書いてみます。

どんな課題を解きたいのかについて。大きく2つだと理解しています。（付随してセキュリティや権限に関する話もあると思いますが、一旦は概要として2点に絞ってみます）

- Agentが「増えて散在してきた」こと：部署ごと・人ごと・プラットフォームごとにAgentが作られ稼働し、組織として「誰が、どれを、どこで動かしているのか」が把握できない。
- Agentが「重複していること」：別々のデータに触れ、似た仕事を重複してこなしている（そして上述のように、誰もそれを把握できない）。

この辺りの話については、例えば[DataikuのBlog記事](https://www.dataiku.com/stories/blog/agent-orchestration-explained)や、[MicrosoftのAgent 365の記事](https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/)が参考になりました。

TC26 Keynoteの最後にあった[Agentic Analytics Command Center](https://www.salesforce.com/news/stories/tableau-agentic-analytics-platform-announcement/#:~:text=Command%20Center%3A%20Setting%20the%20Standard%20for%20Agentic%20Analytics%20Across%20the%20Enterprise)の話も、同じ問題提起をしています。「あらゆるAgentを横断して把握し、統治する層が必要」というのは、ある種の共通認識と見なして良いようですね。そして繰り返しになりますが、とても合理的な主張だと思います。AIを組織的に活用するのであれば、このような俯瞰と管理ができる層は必要だというのは、想像に難しくありません。

一方で、オーケストレーションは「組織と人」のため、という印象が強いように思える点が気になっています。

これは思考実験ですが、例えば小規模なチームであれば、採用する技術やプラットフォームの幅は狭いはずです。AI Agentの実装や種類に関する統制も、例えばGitHub管理で割に合うかもしれません。

そもそもOpenAIやClaudeにはそれぞれのAI管理プラットフォームがあるはずです。使ったことは多くありませんが、おそらく以下が該当するのかなと。

- [OpenAI Frontier](https://openai.com/ja-JP/business/frontier/)
- [Claude Console](https://platform.claude.com/docs/ja/home) (というか[Managed Agents](https://platform.claude.com/docs/ja/managed-agents/overview)かな?）

なぜ小規模なチームを考えたかというと...AI Agentのひとつの方向性として、端的に言えば少人数化や、人間の介入を減らす方向に動いているように理解しています。例えば最近何かと話題の「ハーネスエンジニアリング（例：[OpenAIの記事](https://openai.com/ja-JP/index/harness-engineering/)）」の話であったり、Claude Codeの[Auto Mode](https://www.anthropic.com/engineering/claude-code-auto-mode)であったり...

今まではHuman-in-the-loopの必要性が語られていました。

今でも必要な概念ではあるのですが、実態としては人間をLoopの外側にいかに置いていくか、AIを自走させていくか、というのが主流の議論ではないでしょうか。

この辺りに、自分のオーケストレーションに対する引っ掛かりが現れてきます。

---

## AI Agentは人のLoop関与を薄める方向に動いているように見える

繰り返しますが、オーケストレーション層の必要性に疑問はありません。

おそらく引っかかるのは「People + Orchestration + Governance = AI Success」という方程式かもしれません。

Agentic時代はそもそも組織構造にまでメスが入るようにも思っています（諸々の構造や規制から実際にそうなるかはさておき、検討すべき対象にはなりそうだなと）。

例えば[こちらのNote](https://note.com/gimupop/n/n5bbdf9720bdb)では、AI時代の組織図の変化についての議論があります。（かなり面白い記事でしたので、全文を読んでいただきたい気持ち）

端的に言えば、オーケストレーションが「組織の認知を超えてAgentが散在することへの解決策」であれば、そもそも「Agentの散在が組織の認知の範囲 ≒ 人と部署の数に納まるように、組織構造を変えれば良いのでは」を取ってから、オーケストレーションを考えるのはどうなんだろう、と。

もちろん、こんなものは理想論です。一方でAI Agent時代は理想論側に向かって動いていないか？という点が、今の組織や人を前提にしたAIオーケストレーションに対する自分の違和感なのだろう、と考えました。

冒頭の方程式に戻ります。People、Orchestration、Governanceの3つは独立してはおらず、互いに強く関係するものだと思います。

Agenticの世界では、関与するべきPeopleの数は減るかもしれない。伴って必要なGovernanceは軽量化するかもしれない。伴って必要なOrchestrationも薄くなるかもしれない。

これはTableauも同じ問題を抱えると思いますが、人間に重きを置き、人間を助けてきたからこそ、このAgent時代の方向性との整合性や仮定をどのようにするべきか。とても難しい問題だと思います。

ちなみに、同じ問題はGUIの必要性にも言えるように見えました。GUIは基本的に人間のためのものであり、Agenticを見据えるほど、人間のための表現の重要性が下がるはずかなと。

もちろん人間が見て理解する部分は残りますが、そこは構造化データやAPIから、生成AIは人間のための視覚表現を作れますよね。Tableauにも同じ問題を感じていますが、Agentic時代が人の関与を薄める方向に働くなら、人間のためのGUIの価値訴求はどうなっていくのでしょうね。

（その意味で、TableauがAgentic Analytics Platformに振り切ったことを自分は好意的に受け止めています）

---

## それでも現在のためにDataikuは要りそう

自分がここまで書いた違和感は、「AI Agentがこれからどこへ向かいそうか」を元にした話でした。

一方で現在進行形で多くの組織が持っていそうな課題に目を向けると、Dataikuのような、複数のAgentもLLMもデータパイプラインもまるっとオーケストレーションできる層は、けっこうニーズがありそうだなと思いました。

いまこの時点でのPeopleは多く、またGovernanceとOrchestrationのニーズと課題は多く存在していそうなので。

自分はAgentic時代の未来を元に、自分が持った違和感を語りました。

一方で足元の現実を見ると、どう考えても様々なオーケストレーション層は必要そうですよね。様々なデータもAgentも専門知識も、様々なツールを使っていたり、様々な場所に置かれていたりするので。

Summitで紹介された機能も面白かったですね。以下3つが印象に残りました。

- [Dataiku E2A](https://www.dataiku.com/stories/blog/expert-to-agent)
  - 要はDifyやOpenAI Agent Builderのような、Agentic Workflowを構築できる機能と理解しました。Dataiku中にあるデータパイプラインや様々な資産を使えるようなので、専門家がAgentを作り、またそのAgentはDataiku内外の知識やプロセスにもアクセスできる環境を提供する、実用的なツールだと思いました。ワークフロー形式での構築は、なんだかんだ視覚的に分かりやすいので、人に優しいですよね。
- [Dataiku Cobuild](https://www.dataiku.com/product/cobuild)
  - 自然言語からデータパイプライン、機械学習モデル、AIエージェント、アプリケーションを作る機能のようでした。
  - TableauユーザーにとってはTableau Agentが近いように見えました。
  - GUIの各機能やコンポーネントを覚える必要が薄くなるので、多くの方にDataikuの機能を提供しやすくなりそうですね。
- [Dataiku Agent Management](https://www.dataiku.com/product/agent-management)
  - 本記事で主に取りあげたオーケストレーションに関する機能でした。
  - 加えてガバナンス、評価などの機能も有しており、「誰が、どれを、どこで動かしているのか」また「動いているAgentの性能は妥当か、異常はないか」も簡単に把握できそうでした。

Summit全体を通して感じたのは、Dataikuが積み上げてきた視覚的フローやデータパイプラインの資産を、そのままAI Agentの統治へ向け直していることです。

過去積み上げてきた思想と製品を、Enterprise AI Orchestration Platformとして昇華している印象を受けました。

---

## 最後に

「必要性に納得しているのに、なぜか興奮しない」という、ある種の気持ち悪さを動機にして書き始めました。

書いてみて感じましたが、おそらく2つの時計を同時に見ていたことが原因ですね。

ひとつは、いまエンタープライズが現に困っていることを今日解く時計。

ここではオーケストレーション層もデータパイプラインもAgent構築層も必要です。いま散在するAI Agentに困っているので。

もうひとつは、人の関与を薄める方向に動いているように見えるAI Agentの時計。

こちらを見ていると、「人を巻き込んで統治する」前提が、どこまで先まで効くのかが分からなくなります。

思うにですが、この2つはどちらも正しいものの、進む速さも向きも違うのかなと。だから自分の中で、納得（現在地）と引っかかり（方向）が、同時に立っていた、ということだったのかもしれません。

また、自分は組織的なAI最大化のフェーズにいる人間ではなく、AIを使って個人の成果を広げているフェーズの人間だと思います。なので、いまの自分には「People + Orchestration + Governance = AI Success」の方程式が、立場的にも時間的にも少し遠く見える、というだけかもしれません。

そのうえで、これから観測したいことを目印として置いておきます。

人の関与が薄まっていったとき、束ねる層は本当に薄くなるのか、それとも一人あたりのAgentが増えて、かえって濃くなるのか。未来が楽しみですね。

総じて、Dataiku Summitは楽しかったです。Tableauユーザーの方とも多くお会いしました。素敵な機会をいただきました。次回もきっと参加します！

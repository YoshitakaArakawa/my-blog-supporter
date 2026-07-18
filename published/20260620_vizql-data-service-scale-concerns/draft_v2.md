# VizQL Data Serviceは歓迎している。だからこそ、サイト単位で有効化させてほしい - 2026年6月版

> **Tableau NOTE**
> このブログは以下を目的に書いています。
> 1. 世界で使われている発展的な技術を広める
> 2. Tableauとデータ可視化についての日本語ドキュメントを増やす
> 3. 自身が学習した内容を整理し言語化する
>
> Yoshitaka Arakawa - BI Developer / Tableau Trainer

> ℹ️ **（著者向けメモ・公開しない）** コメント欄やSNSで突かれたとき用の控えの返し。本文に積むと防御的になるのでここに退避。
> - 「専用のデータソースをAI用に分ければトグルは要らないのでは」→ 分離は正攻法。ただし全資産を分離し終えるまで移行期間がある。その期間を安全に走らせる時間軸の制御が欲しい、という話なので両立する。
> - 「プロジェクト既定でAPI Accessを拒否すれば擬似的にサイト単位で閉じられる」→ できる。ただしopt-out・手作業・継続管理で、新規プロジェクトの付け忘れが一件でも穴になる（fail-open）。
> - 刃の核心（Viewerが直接クエリできる）について「Viewer can use VDS」と書いた公式の単一明文はまだ見つけられていない。permission checkの挙動とcapability要件からの帰結。本文では断定しつつ脚注で出典の性質を明示している。permission checkの正式な設定名は最終確認が未了。

参考資料（この記事の主要な出典）:
- [VizQL Data Service（公式ドキュメント）](https://help.tableau.com/current/api/vizql-data-service/en-us/index.html)
- [Permission Capabilities and Templates](https://help.tableau.com/current/server/en-us/permissions_capabilities.htm)
- [Tableau Prep Conductor のサイト設定](https://help.tableau.com/current/server/en-us/prep_conductor_configure_server_site_settings.htm)

---

xxx

---

## VizQL Data ServiceとTableau MCPは人間中心のTableauの世界観を変えた

Tableauは長い間「人間中心」のデータ利活用ツールでした。
CreatorやExplorerがワークブックでダッシュボードや可視化を組み、集計済み・フィルター済みのデータを人（多くはViewer）に届ける世界観でした。
どの列を見せるか、どうフィルターするかは、基本的にワークブック側で制御されていました。ここでのフィルターはディメンションやメジャーでのフィルターも、閲覧者の属性によって変化する、ユーザー関数を用いた制御も含みます。
（例：人事情報ダッシュボード - 集計には使用するが表示しない列がある、表示データは閲覧者の所属部署にフィルターされる、など）

一方で、2025.1にてVizQL Data Service（VDS）という機能がリリースされました。端的に言えば「ダッシュボードを介さずに、その裏のデータソースへ直接問い合わせる」ための機能です。

これまでTableauは、ワークブックを通して、整えられたデータを人に届けてきました。VDSはその窓を経由せず、ワークブックの裏側にあるPublished Data Sourceに対して、プログラムやAI Agent（Tableau MCP）から直接クエリを投げ、欲しい列・集計・フィルターを指定してデータを取り出します。

ここで重要なポイントがあります。VDSはViewerユーザーも利用可能です。
例えばTableau Server設定値のページには、以下の記述があります。
'''データ ソースのパーミッション ルール「API アクセス」の権限チェックを有効にします。...(中略)...すべてのサイト ロール (ライセンスなしのロールを除く) が VizQL データ サービス API にアクセスできるようになります。'''

厳密に言えば、データソースにVDSを使用してクエリをするためには、実用上は「APIアクセス」パーミッションを、そのデータソースに対して設定する必要があります。上記の記述がある「features.VizqlDataServicePermission」は、このパーミッション設定に関する項目です。

ただしパーミッション設定で制御するにしても、サイトロールでの制御ではないため、パーミッション付与されているViewerはデータソースにクエリが出来るようになります。

つまり、今までの「ワークブックで表示制御をすれば良い」という世界観は、VDSが有効化されている環境では、2025.1以降では崩れていました。

設定値とパーミッション設定によっては、ワークブック側のフィルターや表示項目に関わらず、Viewerユーザーも集計前のデータが確認できます。

これはVDSが紹介され始めた頃の公式製品ブログからの推測ですが、Tableauの各種APIがそうであったように、VDSはあくまでも技術者向けの機能として開発されていたと思います。ViewerがPATを発行し、個人的な目的のために直接VDS APIを使用してデータを取得しに行くようなユースケースは、この機能の開発時点では想定していたのでしょうか...?
VizQL Data Service from Tableau: Use Your Data, Your Way (2024/8/8)
VizQL Data Service: Extend Your Data Beyond Visualizations (2025/3/19)

また2025.1リリースされた2025年2月時点では、AI Agentの話題は現在ほど本格化していないと記憶しています。MCPの議論が本格化し始めたのは2025年の初頭ごろのようです。ちなみにTableau MCPのリリースは2025年6月ですね。

これは自分の認識としては、VDSは開発者ユーザーがパーミッション設定などを十分意識した上で利用する分には、まったく問題なかったと思います。
2024年～2025年はHeadless BIの議論も熱かったように記憶しており、開発者やエンジニアを念頭に、Tableauデータソースをそのまま使える機能が開発されていたことは、むしろ素晴らしいことだったと思います。

一方で、現在はどうでしょうか？
Tableau MCPはVDSを民主化しました。ViewerユーザーはAIとTableau MCPを使って、VDSを好きなように利用できます。


---
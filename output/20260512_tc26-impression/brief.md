# TC26 Keynote 感想 — 「Architect」というキーワードと、我々が立っている分かれ道（仮）

## テーマ

Tableau Conference 2026 (TC26) の Main Keynote の感想記事。

「Tableauは agentic analytics platform である」「ユーザーは Knowledge / Decisions / Agentic の3つの Architect になっていこう」というメッセージをどう受け取るか。歓迎する一方で、それを実現するには既存のTableau (Classic) だけでは難しく、Salesforce / Headless 360 / Tableau Next、あるいはまったく別のスタックという、構造的な分かれ道に我々は立っている、という話。

要約や機能紹介はしない。あくまで「現地でKeynoteを見て、その後録画を見直しながら考えたこと」の感想として書く。

## 書く動機

- 現地参加 + 早朝にKeynote録画を見ながら興奮の中で書いたXスレッドを、もう少し腰を据えて言語化しておきたい
- Xスレッドでは触れきれなかった構造的な議論 — Tableau Classic の限界、Headless 360 の思想、3つの分岐、Builder Gap — を整理したい
- 「3つの Architect」というKeynoteのメッセージは妥当だが、その実現には Tableau の枠を超えたエコシステムへの理解が必要、という自分の問題意識を、Tableau コミュニティに対して投げかけておきたい
- それでも基本トーンは「歓迎」「変化を楽しむ」。批判記事ではなく、変化の中で何を考えていくべきかを共有する記事にしたい

## 読者像

- yarakawa.com の通常読者層: Tableau ユーザー (中級〜上級)、データ分析実践者
- TC26 に行けなかった人 / 行ったけれど消化中の人
- 「3つの Architect」と言われても、自分が何をすべきか/組織として何を考えるべきか、まだピンと来ていない人
- ダッシュボードの作り方の話より、Tableau とデータ分析の「次」に関心がある層

## コアメッセージの方向性

- TC26 Keynote が提示した「Architect」というキーワードは、この数年の AI / データ業界の流れを踏まえれば妥当で、自分は完全に同意する
- ただし、その「Architect」を本当に実現しようとすると、現状の Tableau (Classic) だけでは構造的に難しい。Tableau Next / Salesforce / Headless 360 の世界観に乗るのか、別スタックで組むのか、現状維持で行くのか — そういう分かれ道に我々は立っている
- そしてこれはTableau社の問題というより、ユーザー側の準備度合いの問題でもある。「テック系じゃないから」で閉じず、「生息地を変える/増やす」覚悟で、初心者に戻ることを楽しむ姿勢が必要

## アイデア・観点の一覧

### TC26 Keynote 自体について
- コアメッセージの整理: Tableau as agentic analytics platform / 3つの Architect (Knowledge / Decisions / Agentic)
- "Help people see and understand data" が主役から退いたことを歓迎するスタンス (今回そもそも触れられたっけ?)
- 可視化やダッシュボードを前面に出さなかったことへの評価
- 「ダッシュボードを見ることは始まりにすぎない」というニュアンス

### 「Architect」というキーワードについて
- 3年来「データユーザーはアーキテクト的役割になる」と言ってきたことの追認
- 3つのArchitectは別人格でなくてよいが、相互作用を理解する必要がある (T字型 × 3 のイメージ)
- 「Tableauユーザー」というアイデンティティに閉じない / 満足しない姿勢
- 5年もしないうちに「Tableauユーザー」というアイデンティティだけでは意味を持たなくなるかもしれない、という前提
- 「やってることAIで大体できませんか」と言われるリスクへの直感

### Knowledge の定義の狭さへの違和感
- Tableau の言う Knowledge は構造化データ寄り (Metrics, Calculated fields, Prep flows, Published data sources)
- AI業界で Knowledge と言うとき含まれるもの: ドキュメント, Wiki, SOP, Skills, 過去の意思決定など
- AgentforceのData Library (画像でも提示) で非構造データに対応はしているが、サイロ化の懸念がある
- 「マスター」と「参照先」の分離 / プラットフォーム横断で参照可能なKnowledge設計の必要性

### Tableau (Classic) の構造的限界
- バイナリな .twbx で diff/PR レビューしにくい (Knowledge as Code と相性悪い)
- Calculated Fields / Parameters / Data Source 定義が GUI に埋め込まれてブラックボックス
- セマンティクスがTableau内でしか再利用できない
- API-firstじゃない / エージェントから呼びやすい設計じゃない
- 「3つのArchitectをやろうとすると、今のTableauだけでは難しい」

### 周辺発表との接続 (タイミング)
- 2025年6月: Agentforce 3 + ネイティブMCP対応
- 2026年4月15日: Salesforce Headless 360 発表 (TDX 2026)
- 2026年4月: Tableau Next MCP GA
- 2026年5月初旬: TC26 — この一連の流れの「結実」のタイミング
- Headless 360 の4層 (System of Context / Work / Agency / Engagement) が、まさに3つのArchitectを成立させる基盤

### 我々が立っている「分かれ道」
- 分岐A: Tableau Next + Salesforce エコシステム (Agentforce / Data 360 / Headless 360)
- 分岐B: 別スタックで再構築 (dbt + Cube/Malloy + LangGraph 等)
- 分岐C: 既存Tableauを使い続ける (短期的には可だが、Architectの実現は構造的に困難)
- Tableau に集約していくのも違う、という洞察 (サイロ問題の拡大版)

### Builder Gap と「生息地を変える」
- 従来の Trailblazer (宣言的ビルダー、ローコード上級者) と、API/MCPで思考する新世代の間のギャップ
- これは Tableau ユーザーにそのまま当てはまる
- 「Tableau Communityに生息しすぎることのリスク」
- ClaudeやMCP、Agent SDKに触れる、データエンジニア/MLエンジニアの議論する場に入る、生息地を増やす

### Tableau Conferenceという枠組み自体への問い (軽めに)
- Tableau Conference の聴衆設計と、Architect の議論はミスマッチ気味
- 「軸足は既存Tableauユーザー向けに調整されてる感」
- 強い断定はしないが、"Architect Conference" のような問い直しの余地はあるかも、という形で示唆

### 業界全体の文脈との接続
- Tristan Handy の "BI's Second Unbundling" (2026-05-03) — BIがフロントエンドエンジニアリング化していく
- Tableau の話だけではなく、業界全体のagentic enterpriseへの移行の一例
- Snowflake Summit / dbt Coalesce / Data Council など、ツール起点のカンファレンスの限界も同じ構造

### 自分の姿勢
- 変化を歓迎する、批判ではなく「楽しむ」スタンス
- Tableau Next / Agentforce / dbt の初心者になることを楽しみたい
- Tristan のセッションから受けた、変化を embrace するマインドセットへの共鳴

## ストーリーラインの素案

1. **導入**: TC26現地参加していること、早朝のテンション、Keynote録画を見ながら考えたこと、感想であって要約ではないことの宣言。Tableau Next / Agentforce は使ったことないので想像と見聞きの範囲、というcaveatも添える
2. **Keynoteの整理 (簡単に)**: 「Tableau as agentic analytics platform」と「3つのArchitect」というコアメッセージを、自分の言葉で簡潔に
3. **歓迎する点**: "Help people see and understand data" の世界観に閉じなかったこと、ダッシュボード機能を前面に出さなかったことへの好意的反応 (もし可視化が前面だったら正直怒っていたかも、という本音も)
4. **「Architect」というキーワードに同意するし、ずっと言ってきた話**: 3年来言ってきたことの追認である一方、これがTableauユーザーに突きつけているもの (アイデンティティの再定義、学び続ける姿勢)
5. **ただし... 提示された世界観は Tableau (Classic) だけでは実現困難**: ここで構造的議論に入る。バイナリアセット、API-first非対応、ブラックボックス。Tableau Next / Salesforce / Headless 360 まで視野を広げないと、本当の意味でのArchitectingにならない
6. **周辺の発表とつなぐ (4月の集中砲火)**: Headless 360 / Tableau Next MCP のタイミング感、Headless 360の思想 = Architect の本質
7. **3つの分岐**: A / B / C の整理。Tableau に集約していくのも違う、という観察
8. **我々の準備はできているか — Builder Gap、生息地を変える**: ユーザー側の進化が問われる。これはTableau社の責任ではなく、ユーザー側が引き受けるべき話
9. **業界全体の文脈 — Tristan Handy の "BI's Second Unbundling" を引く**: Tableau固有の話ではなく、BI/データ業界全体の変化の一断面
10. **(軽く) Tableau Conferenceという枠組み自体への問い**: 断定はせず、「もっと開いた場が必要かも」という問いとして提示
11. **最後に**: Tristan のセッションから受けたインスピレーション、自分はTableau Next / Agentforce / dbt の初心者になることを楽しみたい、変化を embrace する姿勢を共有して締める

## カテゴリ

GenAI × Tableau / Tableauカンファレンスレポート

(yarakawa.com の既存カテゴリ構造に合わせて、執筆時に最終決定)

## 未整理・要検討

- **記事の長さ感**: 上記10〜11セクションを全部入れると相当長くなる。yarakawa.com の通常記事の長さに合わせて削るか、分割して2本にするか (例: 「感想編」と「分かれ道編」)。1本で書くなら、5・7・8あたりは圧縮が必要かも
- **トーンの調整**: Xスレッドの「歓迎しつつ問いかける」スタンスを保ちたい。批判記事に見えないように、特に Tableau Classic の限界を書く部分は表現を選ぶ必要がある
- **画像 / 図の使い方**: Keynote のスライド写真があるなら3つの Architect の図、Headless 360 の4層構造の概念図 (自前で書くか) などを入れたい。あれば読みやすくなる
- **過去記事との接続**: yarakawa.com で過去に「データユーザーの役割拡張」「Vibe Analytics」系の記事があるはず。引用 / 自己参照すると論旨が補強される
- **「生息地を変える」という比喩**: Claudeとの壁打ちで出てきた良いフレーミング。これを記事にも入れるか、シンプルに「Tableauの外に出る」と表現するか
- **TC26 全体のセッション体験への言及**: Day1 Keynote に絞るか、参加した他のセッション (True to the Core, Devs on Stage, From Workout to Workplace, Beyond the Boundaries of Tableau, Tristan のセッション 等) からも引用するか
- **Day2 / Day3 が進行中である事情**: 記事の公開時期によっては、それらの内容も踏まえて加筆できる。現時点では Day1 Keynote ベースで書きつつ、後で追記する余地を残す
- **英語LinkedIn版との関係**: 既にLinkedInに英語投稿済み。日本語ブログ記事は同じ内容のロングフォーム化なのか、まったく別の角度なのかを意識する

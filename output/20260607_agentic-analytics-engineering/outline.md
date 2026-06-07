# 記事構成: Tableau に Analytics Engineering を持ち込む — AI エージェントで、品質と効率の両取りを狙う

タイトル案（主軸＝(b) Analytics Engineering。Agent はその手段＝品質と効率を取りに行く道具）:
- (主) Tableau に Analytics Engineering を持ち込む — AI エージェントという手段で
- (副) データソースの質を、AI エージェントで品質と効率の両取りで整える
- 補助線: 「可視化からデータソースの質へ」は記事内の通底メッセージとして使う（タイトルの主役ではなく、本文の背骨）
- ニュアンス: タイトルは「やろうとしていること（Analytics Engineering の持ち込み）」を立て、Agent は目的でなく手段として添える

## コアメッセージ
可視化の時代から「データソースの質」の時代へ。agentic analytics の成否は、エージェントが読む semantic layer（ビジネス定義の一貫性）と、その裏の data modeling（層化された追跡可能な変換）の整い具合で決まる。Tableau は GUI 製品ゆえこの整備が手作業で辛いが、API ＋ MCP ＋ AI エージェントで自動化できる。これは公式（agentic / Composable Data Sources）と同じ船だが陳腐化しない前段——Composable が「きれいな PDS を組み合わせる」のに対し、こちらは「組み合わせるに値する PDS を生み出す」工程。

圧縮した一文（読者が一つだけ持ち帰る命題）: **「Tableau の勝負どころは、可視化からデータソースの質（semantic layer ＋ data modeling）に移った」**

## 読後の読者の状態
- 「Tableau の自動化しにくい領域も、API ＋ AI エージェントで攻められる」と気づく
- agentic analytics 時代の勝負どころが「データソースの質」だと腑に落ちる
- 走らせなくても使える見方を持ち帰る：「ロジックが workbook / 埋め込み / Prep に散る → データソースに寄せ、層に整理し、メタデータを整える」
- もっと知りたければ GitHub（2 リポ）に行ける導線を得る

## 全体方針
- **「やろうとしていること（構想）＋実装概要」の共有**に徹する。「実験を見せて結果を誇る」記事ではない。技術 how の詳細は書かず GitHub に委譲。
- **成熟度は正直に**: 実装はあり、その中でテスト（元フローとの parity 検証・round-trip 検証）まで通している。ただし**本格運用・反復はこれから**。「実証済み」と過剰主張しない。
- 俯瞰・見立ての共有。読者 A（Tableau 実務者、API は叩かない）向け。専門概念（semantic layer / headless BI / dbt / MCP）は講義せず直感＋参考リンクで橋渡し。
- 参考資料リッチ型。各セクションに日本語の差し込みリンクを置く。
- 分量はライト。各展開は俯瞰で軽く、概念の山場は展開1–2、共有の山場は展開3。

## 構成

### 導入: agentic analytics は来た。でも勝負どころは可視化じゃない
- 展開する思考: Tableau が公式に「Agentic Analytics Platform」へ舵を切った（TC2026）。でも自然言語で問う時代に効くのはダッシュボードの見栄えではなく、エージェントが読む「データソースの質」。一文の命題を早めに置く。
- 素材: TC2026 Agentic Analytics Platform（公式）。Tableau MCP が GA。
- フック: 「可視化で民主化した Tableau の、次の勝負どころはデータソースに移る」と宣言。

### 展開1（問題提起）: ロジックは workbook に閉じ込められてきた — Tableau の構造的負債
- 展開する思考: Tableau は可視化で分析を民主化したが、重心が workbook に乗り、指標定義・ビジネスロジックがワークブックや埋め込みデータソースに散った。Tableau 公式もこれを "scattered calculations problem" と呼ぶ。人がクリックして読む時代はよかったが、機械（エージェント・Pulse・埋め込み）が消費する時代は、ロジックを一か所＝データソースに寄せ直す必要がある。
- 素材:
  - Tableau 公式ガバナンス文書（scattered calculations problem / PDS = single point of truth）
  - headless BI（呼び名として軽く）：たくまん「セマンティックレイヤー / Headless BIとは」。定義の分散＝部署で売上の定義がブレる。
  - Tableau Pulse（実例）：ワークブック無しで PDS を消費する head。「データソースに寄せる価値は今すでに現実」。
  - VizQL Data Service：Tableau 自身の headless インターフェイス。
- 前のセクションからの接続: 導入の「データソースの質」を、「なぜそれが問題なのか」で受ける。

### 展開2（見立て）: データソースの質とは二軸 — Analytics Engineering を Tableau に
- 展開する思考: 「質」を二軸で分ける。① semantic layer ＝ビジネス定義の一貫性（指標・列の意味・集計を一つの正に）。② data modeling ＝層化でロジックを追跡可能にする（dbt の staging/intermediate/marts の規律を Tableau に転用、dbt 自体は使わない）。①は agentic に直接効き、②は追跡可能性で効く。これがアナリティクスエンジニアリングの Tableau への持ち込み。
- 素材:
  - dbt「Semantic Layer vs Text-to-SQL 2026」：「誤答か、エラーか」の対比。精度は参考値として軽く（複数社が報告、と留保）。
  - dbt「How a semantic layer prevents AI hallucinations」
  - 「定義の一貫性」を主柱に、精度はリンク例示に留める。
- 前のセクションからの接続: 問題（散在）→ あるべき姿（二軸で整える）。

### 展開3（やろうとしていること＋実装概要）: GUI で手作業は辛い。だから AI エージェントという手段を採る
- 展開する思考: ①②の整備は Tableau が GUI 製品ゆえ手作業がきつく、品質も人によってブレる。一方 Tableau は REST / Metadata API / VizQL Data Service を持つ。だから AI エージェントに API を使わせ、解析・分解・整備を**品質と効率の両取り**で進める、というのがやろうとしていること。「なぜ決定的スクリプトでなく AI か」＝判断（層の切り方）・自然言語草案（メタデータ）は AI、実行・比較・検証は決定的ツール、parity で担保、という役割分担。2つの取り組みを**実装概要レベル**で共有（中身の how は GitHub）。
- トーン: 「実験して、こうなった」ではなく「**こういう構成のものを作っている／作ろうとしている**」。テストはしているが本格運用・反復はこれから、を明記。
- 素材:
  - 取り組み1 tableau-prep-architect（実装概要）：長大 Prep を staging/intermediate/marts に分解→再構成→publish→元フローとの parity 比較、という構成。fct/dim/rpt の考え方。
  - 取り組み2 tableau-datasource-steward（実装概要）：PDS をセマンティックレイヤーとして整備（列 description・下流 WB の重複 calc の集約・再 publish）という構成。
  - 成熟度の正直な明示: 手元でのテスト（parity / round-trip 検証）までは通している。**本格運用と反復検証はこれから**。
  - 正直な但し書き（#4・一文）: 本来 modeling は DWH 側が筋（安い・lineage 明快）。これは DWH を触れない／長大 Prep が既にある時の現実解。万能薬にしない。
  - リンク: 2 リポの GitHub（公開 URL に置換）、たくまん Snowflake×Tableau コスト最適化（DWH 側が安い、の補強・任意）。
  - （X 実装ログは「未来感」など軽い色付けに留め、結果の誇示には使わない）
- 前のセクションからの接続: あるべき姿（展開2）→ それを誰が・どんな手段で（エージェント）。

### 展開4（位置づけ）: 公式と同じ船だが、陳腐化しない前段
- 展開する思考: この方向は公式ロードマップと同じ船。Agentic Analytics Platform はメタデータ／ビジネスロジックの一元化が前提。Composable Data Sources は複数 PDS を結合して統合モデル化（上流変更が下流にカスケード）＝ネイティブな analytics engineering。だが Composable は「きれいな PDS を組み合わせる」役で、「長大レガシーを解析して、組み合わせるに値する PDS を生み出す」前段は肩代わりしない＝この実験の残る価値。classic PDS は Tableau Next にインポートできる＝投資は未来へ引き継がれる。
- 素材:
  - Composable Data Sources（TC2026 セッション、たくまん TC2024 記事＝概念解説のみ、版は使わない）
  - rpt（Prep 内物理 JOIN）は transitional、fct/dim 分解は残る、と書き分け
  - Tableau Next overview（PDS → semantic model 化）
  - 未確認の版・時期（PDS 編集 2026.2 / Composable 2026.2〜）には触れない（または「近く」と曖昧に）
- 前のセクションからの接続: 自分の実験（展開3）を、公式の大きな流れの中に位置づける。

### 結び: これは見立てと取り組みの共有。詳細は GitHub で、本番はこれから
- 展開する思考: 本記事は「何を・なぜやろうとしているか」の共有。技術詳細は GitHub を見てほしい（人にも AI にも）。可視化からデータソースの質へ、という見立てを置いて締める。**本格運用・反復はこれから**であることを改めて添え、過剰主張で締めない。
- 残す問い:
  - ロジックが Workbook 側にもある場合の上流リネージュ追跡は未着手（Tableau MCP に lineage 系ツールが欲しい）＝今後の宿題として軽く。
  - 「AI に Prep を作らせる」工学的な面白さは別記事予告として一行。
  - 読者に「あなたのデータソースは agentic に耐えるか？」を委ねる。

## 参考資料との接続
| 参考資料 | 記事での活用方法 |
|---|---|
| TC2026 Agentic Analytics Platform（公式） | 導入。「なぜ今」。MCP GA |
| Tableau 公式ガバナンス（scattered calculations problem） | 展開1。問題提起の公式裏付け |
| たくまん「セマンティックレイヤー / Headless BIとは」 | 展開1。読者A向けの定義リンク・定義の分散・LLM 時代の信頼性・VDS |
| Tableau Pulse intro | 展開1。headless 消費の実例 |
| dbt「Semantic Layer vs Text-to-SQL 2026」 | 展開2。「誤答かエラーか」、精度は参考値で軽く |
| dbt「How a semantic layer prevents AI hallucinations」 | 展開2。なぜ semantic layer が要るか |
| Tableau help: PDS = semantic layer 相当 | 展開1–2。PDS をセマンティックレイヤーと見なす論拠 |
| tableau-prep-architect / steward（GitHub） | 展開3。実験の実体（公開 URL に置換、how は委譲）|
| X スレッド4本 | 展開3。実装ログ・実証・「未来感」の一次素材 |
| Composable Data Sources（TC2026 / たくまん TC2024） | 展開4。位置づけ。概念解説のみ、版は使わない |
| Tableau Next overview（PDS→semantic model） | 展開4。投資が未来へ引き継がれる |
| たくまん Snowflake×Tableau コスト最適化 | 展開3。DWH 側が安い、の補強（任意） |

## 決定事項（このループで確定）
- タイトル主軸＝(b) Analytics Engineering。Agent は手段（品質と効率）。「可視化→データソースの質」は本文の通底メッセージ。
- 展開3 は「実験の共有」ではなく「やろうとしていること＋実装概要」。トーンは構想＋実装概要。成熟度は正直に（テスト済／本格運用はこれから）。
- 順序は 問題→見立て→手段（実験早出しはしない）。
- 展開4 は独立（公式接続＝「なぜ今」の要）。

## 残る確認（任意）
- 版・時期（2026.2 等）は未確認のため本文で断定しない方針（このままでよいか）。
- タイトルの最終文言（上の主/副から選ぶ or 言い換え）。

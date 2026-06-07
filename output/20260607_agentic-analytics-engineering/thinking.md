# 思考の深掘り: Tableau に Analytics Engineering を持ち込む — GUI の自動化ギャップを AI エージェントで埋める

## 今回のスコープ（手順2で確定）
- **本筋（1文）**: Tableau の agentic analytics 時代に効くのは「整ったデータソース」——**セマンティックレイヤー（メタデータの質）とデータモデリング（層化された追跡可能な変換）の両輪**であり、その整備は GUI 製品ゆえ手作業だと辛い。だから **API + MCP + AI エージェント**でそのギャップを埋め、Tableau 版アナリティクスエンジニアリングを実装する——という見立てと実験の共有。
- **深掘りリスト（確定）**:
  0. 【問題提起】Tableau の構造的課題——可視化で民主化した結果、重心が workbook に乗り、ロジックがワークブック／埋め込みデータソースに散った。agentic 時代はデータソースへ寄せ直す必要がある（記事の "why" の背骨）
  1. agentic analytics の成否を分ける二軸——semantic layer（直接）と data modeling（追跡可能性＋精度）の効き方の書き分け
  2. なぜ AI エージェントで埋めるのか＝Tableau の GUI 自動化ギャップの正体
- **軽く触れる（深掘りしない）**: #4 「DWH が本筋」の一文の防御線／#1 書く動機（ライトに共有）／headless BI は"呼び名"として軽く・Pulse は具体例として（講義しない）

## コアメッセージ（磨きこみ後）
可視化の時代から「**データソースの質**」の時代へ。agentic analytics の成否はダッシュボードの見栄えではなく、**エージェントが読む semantic layer と、その裏のデータモデリングの整い具合**で決まる。Tableau は GUI 製品ゆえこの整備が手作業で辛いが、Tableau の各種 API ＋ MCP ＋ AI エージェントで自動化でき、Tableau ユーザーでも analytics engineering の果実を取りに行ける。これは公式の潮流（agentic analytics / Composable Data Sources）と同じ船で、**既存の Tableau 資産を「composable × agentic な未来」に耐える形へ作り替える前工程**でもある——Composable が「きれいな PDS を組み合わせる」役を担うのに対し、こちらは「長大レガシーを解析して、組み合わせるに値するきれいな PDS を生み出す」前段であり、公式が来ても残る価値である。

## 読後の読者の状態
- 「Tableau の自動化しにくい領域も、API ＋ AI エージェントで攻められる」と気づく
- agentic analytics 時代の勝負どころが「データソースの質（semantic layer ＋ data modeling）」だと腑に落ちる
- 走らせなくても使える見方を持ち帰る：「ロジックが workbook / 埋め込み / Prep に散る → データソースに寄せ、層に整理し、メタデータを整える」。Pulse のように"ワークブック無しでデータソースを消費する"のが当たり前になる、という見通し
- もっと知りたければ GitHub（2 リポ）に行ける、という導線を得る

## 書く動機（深掘り後）
- 主動機は **「今やっていることをライトに共有したい」**（実装自慢ではなく、見立てと実験の共有）。[著者回答]
- 「なぜ今」は brief で既出：公式が agentic analytics / Composable Data Sources に動き、勝負どころが「データソースの質」に移りつつあるから。[著者回答]
- 加えて、**「AI に Tableau Prep を作らせること自体」への純粋な工学的興味**も正直な駆動の一つ。これは agentic analytics に完全従属させず、半ば独立した動機として持つ（data modeling 軸の二重価値の一方）。[著者回答]

## 各観点の深掘り

### 観点0（問題提起）: Tableau の構造的課題 — workbook 中心からデータソース中心へ
- **主張**: Tableau は**可視化**でデータ分析を民主化した。だがその結果、組織の重心が **workbook** に乗り、指標の定義・ビジネスロジックが**ワークブックや埋め込みデータソースに散らばった**。人がダッシュボードをクリックして読む時代はそれでよかったが、agentic analytics（＋ Pulse ＋ 埋め込み＝機械やサービスが消費する時代）には、ロジックを**機械が読める一か所＝データソース（セマンティックレイヤー）に寄せ直す**必要がある。これが「なぜ今データソースに寄せるのか」という記事の問題提起。[著者回答（著者が提案）]
- **根拠・背景（Tableau 公式の言葉で裏付く）**: [AI回答（公式ソース）]
  - Tableau 公式ガバナンス文書いわく、PDS に接続した**ワークブック内で作った計算・セット・フィールドは PDS の一部にならず、そのワークブックにだけ残る拡張になる**＝ロジックが複数ワークブックに散る **"scattered calculations problem"**。著者の問題意識は公式の言葉とそのまま一致。
  - 公式の good practice：PDS は共通の定義・メジャー計算を全ワークブックで標準化する single point of truth。埋め込みより publish が推奨。data steward が publish・certify すべき。
- **概念レンズ＝headless BI（軽く"呼び名"として）**: 分析ロジック（指標・定義・計算・次元）を可視化（ダッシュボード・UI）から分離し、一度定義して API で全ての"head"に供給する考え方。**データソースが headless な"製品"になり、workbook も埋め込みも Pulse も AI エージェントも、等しくそれを消費する head**。agentic analytics は新しい head の一つにすぎない。定義が2か所以上あると "consistency tax" を払う。※読者 A 向けには講義せず、直感（ロジックを workbook から出してデータソースへ）を主に、headless はその呼び名として軽く触れるに留める。
- **Tableau 自身の headless インターフェイス＝VizQL Data Service（VDS）**: Tableau は VDS で「既存の Published Data Source を API 経由で headless に問い合わせる」道を用意している。著者の実験では VDS を分解前後フローの parity テストに使っているが、**同じ VDS が agentic な消費（エージェント／サービスが PDS をクエリする）の入口**でもある＝「データソースを headless 製品として消費する」が Tableau 内で既に成立している証左。[著者回答＋AI回答]
- **実例＝Tableau Pulse（"既に起きている" 証拠）**: Pulse の指標は **PDS から作る**。Insights platform が統計分析＋ LLM で自然言語の要約・driver/trend/outlier 検出・自然言語 Q&A を返す。**ワークブック無しで PDS を消費する head** であり、良い指標定義が PDS に無いと成立しない。→「ロジックをデータソースに寄せる価値は、将来の agentic だけでなく Pulse として今すでに現実」。多くの Tableau ユーザーが知っている身近な具体例として置ける。
- **接続**: この問題提起が、観点1（データソースの質が勝負どころ）と観点2（その整備を AI エージェントにやらせる）の動機になる。とくに steward の workbook-calc-prospector（下流 WB の重複 calc を PDS に hoist）は、scattered calculations problem への直接の処方。
- **素材**: Tableau 公式ガバナンス文書／PDS ベストプラクティス／Pulse intro／headless BI 解説／steward の workbook-calc-prospector。

### 観点1: agentic analytics の成否を分ける二軸 — semantic layer（直接）と data modeling（追跡可能性＋精度）
- **主張**: agentic analytics（自然言語 → クエリ＝text-to-SQL）の成否は、可視化ではなく「データソースの質」で決まる。質には効き方の違う二軸がある。
  - **セマンティックレイヤー軸（直接効く）**: セマンティックレイヤーの本質的価値は「**部署ごとに売上の定義が違う／使うべき集計軸がぶれる**」を解消すること＝**ビジネス定義のガバナンス・一貫性**（指標定義・各列の意味・デフォルト集計・計算フィールドを一つの正とする）。この価値は Tableau Data Source でもそのまま成り立つ。エージェントが**その一貫した定義を読む**から、生成クエリも正しくなる。これが steward（PDS のメタデータ自動整備）の狙い。[著者回答（②反映）]
    - 書き方の方針: 精度は load-bearing にしない。「一般にセマンティックレイヤーを定義すると生成 AI のデータ分析精度が上がる」は**参考記事を数本例示するだけ**に留め、深く論じない（dbt / Snowflake 等、references 参照）。記事の主張の柱は「定義の一貫性＝信頼できる土台」に置く。
  - **データモデリング軸（主＝追跡可能性、従＝精度の参考値）**: 長大 Prep を層（staging/intermediate/marts 流）に切り出すと、(a)【主柱】データソースの裏側ロジックが**追跡可能（lineage / explainability）**になり、答えを裏側まで辿れる。(b)【従・参考値】dbt の計測では「構造をきれいにすること自体が AI のクエリ精度を底上げ」するが、これは dbt（SQL モデル＋ MetricFlow）での観測であり、Tableau Prep 層化（Hyper Extract で全行マテリアライズ）に同じ機序で効く保証はない。**精度は主柱に据えず「方向性の参考値」に留める**。これが prep-architect（Prep 分解）の狙い。[AI回答（critique #3 反映）]
- **根拠・背景**: 著者の発想源である dbt 自身がこれを言語化・計測している。[AI回答（dbt 一次ソースに基づく）]
  - dbt 2026 ベンチ: text-to-SQL は 84–90%、semantic layer 経由は **98–100%**。生スキーマ素投げは責任を持って出せる水準以下。
  - 失敗の質が違う: **"With text-to-SQL, failure looks like a plausible but incorrect answer. With the Semantic Layer, failure looks like an error message."**（誤答か、エラーか。監査・KPI ではこの差が決定的）
  - data modeling 軸の裏付け: 「**最小限の modeling を足すだけで、text-to-SQL も semantic layer も精度が全面的に改善**」（3 つの最小モデル追加で semantic layer 100% / text-to-SQL 84.1%）。→ 層化は「追跡可能性」だけでなく「精度」にも効く。
- **重要な書き分け**: 「Prep 分解で agentic analytics が良くなる」を飛躍に見せないため、semantic layer＝直接／data modeling＝追跡可能性＋精度、と効き方を分けて書く。
- **Tableau への翻訳時の正直さ（critique #1 反映）**: dbt の 98–100% という数値は **MetricFlow の決定的クエリ生成**に由来する。Tableau の PDS はそこまでの決定的コンパイルを持たないため、**この数値を「Tableau PDS 整備でも出る精度の保証」として使うのは飛躍**。記事では dbt の数値を **「方向性のアナロジー／dbt 文脈の参考値」**として provenance を明示して使い、Tableau 側の主張は「メタデータが整うほどエージェントが正しく解釈しやすくなる」という質的主張に留める。よって記事は **dbt の「コンセプト（governed semantics・clean modeling・lineage）」を借りる**立場（dbt 自体は使わない）を明示する。[AI回答]
- **素材**: dbt blog（数値・引用）／steward・prep-architect の README／X 実装ログ。

### 観点2: なぜ AI エージェントで埋めるのか — Tableau の GUI 自動化ギャップの正体
- **主張**: 上記の整備（Prep の分解・再構成、PDS のメタデータ付与）は、Tableau が GUI 製品であるがゆえに**手作業でポチポチやるのが辛い**。一方 Tableau は REST API / Metadata API / VizQL Data Service といった API を備える。だから **AI エージェントに API を使わせ、解析・分解・整備を効率的かつ自動的にやらせる**ことができる——というのがモチベーション。[著者回答]
- **根拠・背景**: エージェントは「データ加工が全体としてどうなっているかの解析」「ロジックの分解・集約」「メタデータの草案生成」が得意。GUI の反復作業はまさに自動化の旨味が大きい領域。[著者回答 ＋ 一般論]
- **「なぜ決定的スクリプトでなく AI か」の境界（critique #2 反映）**: API があるなら従来型スクリプトでも自動化できる部分はある。両者を切り分けて主張を締める。[AI回答]
  - **決定的（API/スクリプトで十分）**: フローの DL、publish、実行、行数・列差分の比較、メタデータの round-trip 検証。ここは AI でなくてよい（実際 prep-architect も publish/run/compare はスクリプトで決定的に回す）。
  - **非決定的＝AI の旨味が出る判断**: ①長大フローの「層の切り方」の判断（どこで staging/intermediate/marts に割るか、業務的な意味の推定）、②列 description・計算フィールドの**自然言語での草案生成**、③下流 Workbook の重複 calc の意味的な同定。ここは規則ベースでは書ききれず、AI の解釈が要る。
  - だから構図は「**AI が判断・草案、決定的ツールが実行、parity/round-trip 検証で担保**」。AI の非決定性は検証で受け止める設計だと明示する。
- **何をエージェントに任せているか（構成の見立て。how の詳細は GitHub）**:
  - prep-architect: extract → analyze → decompose → build → publish → compare の 6 Skill が、長大 Prep を層化フローへ自律再構築し、元フローとの parity（列差分・行数差分）まで検証。
  - steward: inspect → 列 description 草案 → 下流 Workbook の重複 calc 検出・PDS への集約 → augment（download→編集→publish→検証）の 4 Skill が、PDS をセマンティックレイヤーとして整備。
- **実証段階であることの正直な明示**: X 実装ログのとおり「URL を渡すと DL・解析・分解提案」「分解→依存維持して再構成→Publish→実行確認まで成功」「Tableau MCP で成果物の列/行数比較」までは動いている。一方で完成品ではなく実験。
- **素材**: 2 リポの Skill 構成／X 実装ログ（Auto Mode、未来感のくだり）。

## 別記事候補・今回は軽く触れる論点
- **#4「DWH が本筋」**（一文で残す）: 本来 data modeling は DWH 側でやるのが筋（コスト・lineage 明快）。これは「DWH を触れない／既に長大 Prep がある／Prep 固有処理がある」時の現実解で、万能薬ではない。write では一文の防御線として置く（深掘りしない）。
- **Workbook 上流ロジックのリネージュ追跡**: 集計ロジックが Workbook 側にもある場合、データソースから上流 Prep を辿る処理が要る。未実装＝今後／Tableau MCP に lineage 系ツールが欲しい、という問題提起として軽く。
- **「人間が判断を握る」設計軸**: 両リポに組み込まれている（Stop 確認・CreateNew 既定・承認ゲート）が、今回の記事の主軸にはしない。
- **「AI に Prep を作らせる」工学的深掘り**: 半独立の動機。単体で別記事の余地。
- **公式機能の版・時期**（PDS 編集 2026.2 / Composable 2026.2〜）: 未確認。記事で版に言及するなら著者が一次確認。

## 自動レビュー・ループの反映（critique_01）

AI が自答して反映した点（[AI回答]）:
- **#1 dbt 数値の転用**: 98–100% は dbt の MetricFlow（決定的生成）由来。Tableau PDS へは「精度の保証」でなく「方向性のアナロジー／参考値」として provenance 付きで使う。→ 観点1「Tableau への翻訳時の正直さ」に反映。
- **#3 data modeling 軸の精度も飛躍**: 「精度」を主柱から外し、**追跡可能性を主・精度を従（参考値）**に重みづけ直し。→ 観点1の主張に反映。
- **#2 なぜ AI か**: 決定的（DL/publish/比較/検証）と非決定的（層の切り方判断・自然言語草案・意味的同定）の境界を明記。「AI が判断、決定的ツールが実行、検証で担保」。→ 観点2に反映。
- **#5 動機の二重性**: 工学的興味は本記事では背景に退け、漏れたら別記事予告の一行に留める。メッセージは一焦点。→ 下「別記事候補」と整合。
- **#6 認知負荷**: コアメッセージを「読者が一つだけ持ち帰る命題」に圧縮する候補を outline へ渡す。圧縮案: **「Tableau の勝負どころは、可視化からデータソースの質（semantic layer ＋ data modeling）に移った」**。導入順設計は outline の領分。

著者の判断で決着（[著者回答]）:
- **#4 「公式と同じ船」問題 → (B) で確定**: Composable Data Sources は「**fct / dim 相当のデータソースを論理結合（Relationship）するための機能**」として使えばよい。よって著者の実験が生み出す*きれいな fct/dim の PDS* と Composable は**補完関係**で、残る価値は「長大レガシー Prep を解析・分解してモジュール化された PDS を生み出す前段」。Composable はその素材を**組み合わせる**役。公式が来ても陳腐化しない。
  - 含意（書き分け）: **rpt（Prep 内物理 JOIN）は transitional**——Composable が来れば fct/dim の論理結合で代替可。一方 **fct/dim への分解そのものは残る価値**。記事はこの区別を明示する。
- **精度の扱い → load-bearing にしない**: 著者の手元観測は使わない。「セマンティックレイヤーで生成 AI のデータ分析精度が上がる」は参考記事を数本例示するだけ。主張の柱は「定義の一貫性＝信頼できる土台」（観点1 セマンティックレイヤー軸に反映済み）。

## 対話で得られた気づき
- 二軸は効き方が違う——「semantic layer＝直接、data modeling＝追跡可能性＋精度」と書き分けると、Prep 分解 → agentic の論理の飛躍が消える。
- dbt の **「失敗が誤答か、エラーか」** という対比が、semantic layer の価値を一言で言い切る最強のフレーズ。
- data modeling は「追跡可能性」だけでなく「精度そのもの」にも効く（dbt ベンチ）——これで Prep 分解の正当化が一段強くなる。
- 「AI に Prep を作らせること自体」は agentic analytics に従属しきらない半独立の動機。無理に一本化せず二重価値で持つ方が実態に誠実。
- 記事は「コンセプトを借りる（dbt 自体は使わない／Tableau Next の Semantic Model でもない）」という二重の線引きを明示すると、ブランド・機構の誤読を防げる。

## 参考資料との接続（概要）
| 参考資料 | 主張との関連 |
|---|---|
| dbt: Semantic Layer vs Text-to-SQL 2026 Benchmark | 観点1の核。二軸（直接／追跡可能性＋精度）を数値と引用で裏付け |
| dbt: How a semantic layer prevents AI hallucinations | 「なぜ semantic layer が要るか」の直球 |
| Tableau help: PDS = closest equivalent to semantic layer | steward の前提（PDS＝セマンティックレイヤー）の公式論拠 |
| Tableau TC2026: Agentic Analytics Platform / Composable Data Sources | 「なぜ今」。公式と同じ船・前工程という位置づけ |
| Tableau Next overview（PDS→semantic model 化） | classic 資産が未来へ引き継がれる裏付け |
| prep-architect / steward README | 観点2のエージェント構成・実証段階・誠実な但し書き |
| X スレッド 4 本 | 動機・実装ログ・実証の一次素材 |

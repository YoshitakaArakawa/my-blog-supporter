# Tableau に Analytics Engineering を持ち込む — GUI の自動化ギャップを AI エージェントで埋める（タイトル仮）

## テーマ
Tableau は GUI 製品ゆえに自動化しにくい領域がある。そこを Tableau の API（REST / Metadata API / VizQL Data Service）と Tableau MCP を介した AI エージェントで埋め、**アナリティクスエンジニアリングの考え方を Tableau に持ち込む**試みの共有。具体物は2つの実験リポジトリ：
- 変換/モデリング層：長大な Tableau Prep フローを dbt 流のレイヤ規律（staging/intermediate/marts）で分解・再構築する（tableau-prep-architect）
- セマンティックレイヤー層：Published Data Source をセマンティックレイヤーとみなし、列の説明・計算フィールド等のメタデータを自動整備する（tableau-datasource-steward）

## 書く動機
- Tableau での agentic analytics は結局「データソースへのクエリ（text-to-SQL）」が主軸になると見ている。そこで効くのは、指標・集計ロジック・各列の意味といった**セマンティックレイヤー的メタデータ**の質。
- ところが Tableau ではロジックが Prep / Datasource（/ Workbook）に分散し、1 本の Prep に巨大ロジックが詰まると解析も保守も辛い。これを層に切り分け・集約すれば、AI にも人間にも扱いやすくなる。
- この「全体を見て分解・最適化・集約する」作業こそ AI エージェントが得意。GUI 製品で手作業では辛い部分をエージェントが肩代わりできる。
- 公式も同じ方向に動いている（agentic analytics platform / Composable Data Sources / classic PDS の Next インポート）。だから「今やる意味」がある。
- 目的はあくまで **「何を・なぜやっているか」の共有**。技術 how の詳細は GitHub に委譲する。

## 読者像
- A：Tableau を日常的に使う実務者。Prep / Datasource（PDS）は触るが、REST/Metadata API はあまり叩かない層。
- dbt / analytics engineering / セマンティックレイヤー / MCP / text-to-SQL に必ずしも明るくない前提 → これらは記事内で軽く導入が要る。

## コアメッセージの方向性
- Tableau の agentic analytics 時代に効くのは「整ったセマンティックレイヤー」。それは Prep の層化と PDS のメタデータ整備で作れる＝**Tableau 版アナリティクスエンジニアリング**。
- Tableau は GUI ゆえ自動化しにくいが、API + MCP + AI エージェントでそのギャップは埋められる。
- これは公式ロードマップ（agentic analytics / Composable Data Sources）と同じ船で、**既存の Tableau 資産を「composable × agentic な未来」に耐える形へ作り替える前工程**でもある。
- ※「自走させつつ判断は人間が握る」設計上の軸は持っているが、今回は主軸にしない（共有に徹する）。

## アイデア・観点の一覧

### 出発点（なぜこの話か）
- agentic analytics = text-to-SQL が主軸 → セマンティックレイヤー的メタデータの質が成否を分ける
- Tableau ではロジックが Prep / Datasource に分散。長大 Prep は AI にも人間にも読みにくい
- 「分解して層ごとにロジックを集約」＝ AI フレンドリー化 かつ 保守性向上
- dbt で学んだデータモデリングの規律（staging/intermediate/marts）を Tableau に転用（dbt 自体は使わない）

### 実験1：変換/モデリング層（tableau-prep-architect）
- 長大 Prep（.tfl/.tflx）を extract→analyze→decompose→build→publish→compare で自律再構築する 6 Skill のエージェント
- mart 層は fct / dim / rpt の三本立て（Workbook で PDS 同士を Join できない制約への回避策。rpt = Prep 内物理 JOIN）
- 元フローと分解後フローの parity（列差分・行数差分）を Metadata API + Tableau MCP で自動比較
- 実証段階：手元サンプルで分解→依存維持して再構成→Publish→実行確認まで成功。実行は1フロー数十分、複数セッションで並列も
- 誠実な但し書き：本来 DWH 側でやるべき modeling を Prep で代替する道具ではない。DWH でできるならそちらが安い（Prep 出力は Hyper Extract で全行マテリアライズ）。効くのは「DWH を触れない／既に長大 Prep がある／Prep 固有処理がある」場合

### 実験2：セマンティックレイヤー層（tableau-datasource-steward）
- PDS を「セマンティックレイヤー」とみなす（公式：PDS は Tableau において semantic layer / semantic model に最も近い存在）
- inspect→列 description 草案→下流 Workbook の重複 calc 検出・PDS への hoist→augment（download→XML 編集→publish→検証）の 4 Skill
- 列の説明・デフォルト集計・フォルダ整理・計算フィールド注入を API で自動整備し再 publish
- 既定 CreateNew（非破壊）で別名 PDS を作る。破壊的反映（Overwrite/promote）は人間の承認ゲート
- 対象は classic PDS。Tableau Next の Semantic Model（Salesforce ブランド）は対象外（混同回避）

### 公式ロードマップとの接続（「なぜ今」）
- Agentic Analytics Platform（TC2026, 20260505）：data + business logic + metadata の一元化が前提。Tableau MCP は GA。→ 著者の見立てと同じ枠組み
- Composable Data Sources（2026 6〜7月ロールアウト, 2026.2〜）：複数 PDS を結合して統合モデル化、上流変更が下流に自動カスケード＝ネイティブな analytics engineering。fct/dim/rpt の物理 JOIN 回避策を公式が肩代わりする方向
- classic PDS は Tableau Next にインポートしてセマンティックモデル化できる → classic 資産への投資は将来へ引き継がれる

### ギャップ／これからの話（問題提起）
- 集計ロジックが Workbook 側にもある場合、データソースから上流 Prep をリネージュで辿る処理が必要になるはず（未実装＝今後／MCP に lineage 系ツールが欲しい）
- 下流 Workbook の共通 calc を PDS に集約する方向は実装済み（steward）。上流方向の追跡は未着手

## ストーリーラインの素案
1. **導入**：Tableau の agentic analytics 時代がきた（公式の旗）。でもその成否は「データソースの質＝セマンティックレイヤー」で決まる。ところが Tableau は GUI 製品で、その整備が手作業だと辛い。
2. **見立て**：dbt 由来の analytics engineering（層化・メタデータ整備）を Tableau に持ち込めば、AI にも人間にも扱える資産になる。API + MCP + AI エージェントなら GUI の自動化ギャップを埋められる。
3. **実験1（変換層）**：長大 Prep をレイヤ規律で分解・再構築するエージェント。目的・構成・実現したいゴールを語る（中身は GitHub）。誠実な但し書き（DWH が本筋）も置く。
4. **実験2（セマンティック層）**：PDS をセマンティックレイヤーとして自動整備するエージェント。下流 Workbook の共通 calc 集約まで。
5. **公式ロードマップと重ねる**：agentic analytics / Composable Data Sources / Next インポート。これらと同じ船で、既存資産を未来に耐える形へ作り替える前工程だと位置づける。
6. **結び**：これは見立て・実験の共有。詳細は GitHub（人にも AI にも）。残る課題（Workbook 上流追跡 / MCP の lineage）も正直に。

## カテゴリ
GenAI × Tableau（アナリティクスエンジニアリング / agentic analytics）

## 未整理・要検討
- **【要：著者の一次確認】**「PDS 編集機能が 2026.2 で」のバージョン/時期は本調査で裏取りできず（未確認）。Composable Data Sources の「2026.2〜」も community/検索要約由来＝確度中。記事で版・時期に言及するならリリースノート/coming-soon を著者が一次確認すること。
- **【要：著者の一次確認】** agentic platform 発表本文（tableau.com）は Akamai でブロックされ検索要約ベース。直接引用を使うなら原文確認を。
- 1記事完結 vs 連作の起点：俯瞰に徹する方針は確定。実際の分量が重くなるなら「起点記事＋各実験は別記事」に割る判断は outline 以降で。
- Composable Data Sources を「fct/dim/rpt 物理 JOIN 回避策を不要にするもの」とどこまで踏み込んで書くか（transitional だと正直に書くか、軽く触れるに留めるか）。
- タイトル確定（agentic / analytics engineering / GUI ギャップ のどれを前面に出すか）。

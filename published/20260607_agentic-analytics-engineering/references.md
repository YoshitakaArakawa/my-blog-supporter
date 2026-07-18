# 参考資料

## 参考記事・ブログ（公式）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Top Announcements from Tableau Conference 2026 | https://www.tableau.com/blog/top-announcements-tableau-conference-2026 | Agentic Analytics Platform 発表（20260505）。data+business logic+metadata の一元化、Tableau MCP GA | 「なぜ今・agentic の前提＝メタデータ整備」の公式裏付け。※本文ブロックで検索要約ベース、直接引用は要原文確認 |
| Tableau Unveils the Agentic Analytics Platform | https://www.salesforce.com/news/stories/tableau-agentic-analytics-platform-announcement/ | 同上の Salesforce 側プレス | agentic 方向性の一次寄り。※403 で未精読 |
| Agentic Analytics（製品ページ） | https://www.tableau.com/agentic-analytics | agentic analytics の製品コンセプト | 用語・公式定義の参照 |
| Understanding Salesforce and Data Cloud Terms | https://help.tableau.com/current/online/en-us/tableau_next_sf_datacloud_terms.htm | "A published data source is the closest equivalent Tableau has to a semantic layer or semantic model." | PDS＝セマンティックレイヤー相当の公式論拠（実験2の土台） |
| Tableau Next Overview | https://help.tableau.com/current/tableau-next/en-us/tableau_next_overview.htm | "Tableau Next has the ability to create a semantic model from a published data source (PDS)..." | classic PDS が Next へ引き継がれる資産であることの裏付け |
| Edit a Published Data Source | https://help.tableau.com/current/server/en-us/edit_datasources.htm | PDS の Web 編集（relationships/schema/folders/metadata）。計算フィールド編集は当該ページに明記なし、版表記なし | 「PDS 編集」言及の根拠。ただし「2026.2 で」は裏取り未了＝未確認 |
| Modular by Design: Scaling with Composable Data Sources（TC2026 セッション） | https://www.salesforce.com/plus/experience/tableau_conference_2026/series/learning_at_tableau_conference_2026/episode/episode-s1e1 | Composable Data Sources の TC2026 セッション | 記事の背骨：PDS を結合・層化、上流変更が下流にカスケード＝ネイティブ analytics engineering |
| Viewing Data Model for Published Data Sources | https://www.tableau.com/blog/viewing-data-model-published-data-sources | Composable への土台（PDS データモデル閲覧, 2024.3） | Composable の前提機能の経緯 |
| Coming Soon: New features in Tableau | https://www.tableau.com/products/coming-soon | 近日機能一覧（PDS 編集 / Composable の版確認用） | 版・時期の一次確認先。※403 で未取得、著者の確認が必要 |

## 参考記事・ブログ（dbt — 著者の発想源）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Semantic Layer vs. Text-to-SQL: 2026 Benchmark Update | https://docs.getdbt.com/blog/semantic-layer-vs-text-to-sql-2026 | 2026ベンチ：text-to-SQL 84-90% vs semantic layer 98-100%。"failure looks like a plausible but incorrect answer / an error message"。最小 modeling 追加で両者の精度が全面改善 | 観点1の核。semantic layer軸（直接）と data modeling軸（追跡可能性＋精度）の両方を dbt の言葉で裏付け。※数値はベンダーベンチ、記事では留保付き |
| How a semantic layer prevents AI hallucinations in analytics | https://www.getdbt.com/blog/how-a-semantic-layer-prevents-ai-hallucinations-in-analytics | semantic layer が AI のハルシネーションを防ぐ（2026-04） | 「なぜ semantic layer が要るか」の直球ソース |
| Bringing structured context to AI with dbt | https://www.getdbt.com/blog/bringing-structured-context-to-ai-with-dbt | 構造化コンテキスト（メタデータ）を AI に与える（2025-12） | メタデータ品質＝AI の成否、の補強 |
| Unify metrics ... dbt Semantic Layer（製品） | https://www.getdbt.com/product/semantic-layer | metrics を code で一元定義、lineage-aware、dashboard/app/agent 横断で一貫。Tableau 連携にも言及 | analytics engineering＝modeling＋semantic layer の二本柱の典拠 |

## 参考記事・ブログ（構造的課題 / headless / Pulse）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Tableau Data and Content Governance | https://help.tableau.com/current/blueprint/en-us/bp_data_and_content_governance.htm | "Data Source Management" の節で「埋め込みか publish して authoritative source にするか」を管理論点として扱う。※「scattered calculations problem」は Tableau 公式用語ではない（検索エンジンの言い換えだった。本文で公式用語として引かないこと） | 観点0（問題提起）の裏付けは "Data Source Management" の節を読む |
| Best Practices for Published Data Sources | https://help.tableau.com/current/pro/desktop/en-us/publish_datasources_about.htm | PDS に含める計算は選別せよ、の指針。ワークブックで作った calc はワークブックにローカルで PDS に保存されない（確立した挙動） | 「ワークブックの計算は PDS に残らない＝定義が分散」の根拠。引用可能 |
| About Tableau Pulse | https://help.tableau.com/current/online/en-us/pulse_intro.htm | Pulse の指標は PDS から作る。Insights platform が統計＋LLM で自然言語要約・Q&A。ワークブック無しで PDS を消費 | headless 消費の実例。「データソースに寄せる価値は今すでに現実」 |
| Headless BI（概念）| https://cube.dev/blog/headless-bi | 分析ロジックを可視化から分離し API で全 head に供給。定義は一度、consistency tax の解消 | データソース＝headless な製品、workbook/Pulse/agent は head、という記事のレンズ（軽く呼び名として使う）|

## 本文差し込み候補（日本語・読者A向け）
| タイトル | URL | 概要 | 差し込み先（どの主張に） |
|---|---|---|---|
| セマンティックレイヤー / Headless BIとは（たくまん, Zenn, 142 likes, 2023-07） | https://zenn.dev/takuman/articles/e779a733c5fb35 | セマンティックレイヤー＝「複雑なデータをビジネス概念に翻訳するレイヤー」。従来型の課題＝各ワークブックで独立に作り**定義が分散**（部署で売上定義がブレる）。Headless BI は LLM 時代の信頼性基盤。Tableau VDS を「既存 PDS を Headless BI として使う」と紹介。Kimball の逆説 | **観点0 の主柱**。読者 A 向けの semantic layer / Headless BI の定義リンク。「定義の分散」問題と「LLM 時代の信頼性」を日本語で裏付け。VDS＝headless 消費インターフェイスの接続点 |
| Tableau Conference 2024で発表されたデータソース回りの進化３選（たくまん, Zenn） | https://zenn.dev/takuman/articles/70cabec35abea6 | Shared Dimension / Composable Data Sources / VizQL Data Services。Composable で PDS 跨ぎの Relationship、フィールド説明・計算フィールドの再利用 | Composable の日本語解説リンク。※版予測（2025.1 等）は 2024 時点で古い → 版は本文に使わない、概念解説としてのみ |
| Snowflake×Tableau：パフォーマンス・コストの最適化（たくまん, Zenn） | https://zenn.dev/takuman/articles/f883335a5ac696 | Tableau×DWH のコスト/パフォ最適化 | #4「DWH 側が本筋・安い」一文の補強リンク（任意） |

## dbt（概念・視覚資料 / データモデリング・lineage）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| What is analytics engineering?（dbt） | https://www.getdbt.com/blog/what-is-analytics-engineering | AE＝データエンジニアとアナリストの「ギャップを埋める」営み。概念の読者向け解説 | 「Agentフレンドリーに」章 冒頭。読者 A への AE 概念導入。著者の「ギャップを埋める」スタンスと共鳴 |
| dbt explained（dbt） | https://www.getdbt.com/blog/dbt-explained | dbt と層分けの噛み砕いた概念解説。非エンジニア向け | データモデリング軸の読者向け平易リンク（本文の主役） |
| How we structure our dbt projects（dbt） | https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview | staging（素材）/ intermediate（目的別変換）/ marts（業務エンティティ）の層分けベストプラクティス | データモデリング軸の典拠・やや技術寄り |
| What is data lineage, and why do you need it?（dbt） | https://www.getdbt.com/blog/what-is-data-lineage | lineage を平易に解説。DAG ＝池の波紋の喩え | lineage の読者向け平易リンク（本文の主役） |
| dbt Explorer（lineage / DAG 可視化） | https://docs.getdbt.com/blog/dbt-explorer | column-level lineage を含む DAG の視覚化例・やや技術寄り | lineage の深掘り（references 保持） |

## Tableau（lineage / Metadata API / Data Management）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Introduction to Tableau Metadata API | https://help.tableau.com/current/api/metadata_api/en-us/index.html | ワークブック・データソース・フローのスキーマと lineage を横断取得 | 「追跡しやすさ」を支える土台。steward/architect の lineage 取得手段 |
| Use Lineage for Impact Analysis（Tableau Catalog / Data Management） | https://help.tableau.com/current/server/en-us/dm_lineage.htm | Catalog（Data Management アドオン）が DB テーブル・列・Prep フロー・ワークブックの関係を可視化。upstream/downstream フロー追跡 | 外部 DB まで含む fuller lineage の言及。※コンテンツ間 lineage は Metadata API 単体でも取得可、外部資産含む richer 版が Catalog という整理 |

## 参考資料（ローカル）
| ファイル | 概要 | 記事との関連 |
|---|---|---|
| references/x-threads.md | 著者 X スレッド 4 本（時系列）。アイデア編→着手→進捗→派生 | 記事の素材・動機の一次ソース |
| references/official-research.md | 公式裏取りメモ（agentic / PDS=semantic / Next import / PDS編集 / Composable）と確度・出典 | 事実主張の確度管理。未確認項目の明示 |
| tableau-prep-architect（公開） https://github.com/YoshitakaArakawa/tableau-prep-architect | Prep 分解・再構成エージェント（extract→analyze→decompose→build→publish→compare, dbt 流レイヤ規律, parity 比較, 自律回復） | 取り組み1の実体。本文に実装概要を箇条書き＋リンク |
| tableau-datasource-steward（公開） https://github.com/YoshitakaArakawa/tableau-datasource-steward | データソース整備エージェント（inspector→column-describer→workbook-calc-prospector→augmenter。列description草案・下流WB重複calcのhoist・CreateNew/承認ゲート） | 取り組み2の実体。本文に実装概要を箇条書き＋リンク |

## 関連する過去記事（yarakawa.com）
| タイトル | URL | 関連 |
|---|---|---|
| （未調査） | — | TC26 感想・AI 活用系の既存記事と接続可能か要確認（output/ に 20260512_tc26-impression, 20260331_ai-utilization あり） |

## メモ
- ローカルリポの絶対パスは記事本文・コミットに書かない（CLAUDE.md ガード）。公開時は公開リポ URL に置換。
- 数字・版・時期（2026.2 等）は未確認のまま記事に書かない。著者の一次確認後に確定する。

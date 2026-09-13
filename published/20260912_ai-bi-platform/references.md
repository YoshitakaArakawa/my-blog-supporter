# 参考資料

調査日: 20260912。詳細と裏取りの状況は `references/` 配下の3ファイルを正本とする。
ここには記事で実際に引用する可能性が高いものだけを抜いた。

**引用時の原則**: 「本文未読」と注記したものは検索スニペット経由であり、記事に書く前に本文を取り直す。定量値はすべて二次引用のため、一次ソースを取り直すか書かない。

## 一次ソース（本文精読済み・引用可）

| タイトル | 著者・媒体 | URL | 記事での使い方 |
|---|---|---|---|
| BI's Second Unbundling | Tristan Handy / dbt Labs（2026-05-03） | https://roundup.getdbt.com/p/bis-second-unbundling | 第二のアンバンドリングは可視化・操作・セマンティック定義・ホスティングをコードとエージェントの側へ移す。残るのは identity＝権限モデル・行レベルセキュリティ・SSO（誰に何を見せるか）。原文 "identity continues to be a persistent moat"（0913 WebFetch で照合済み。01 で引用） |
| The context layer | Benn Stancil | https://benn.substack.com/p/the-context-layer | 章1 の反対仮説。BI ベンダーは入口を手放さないという力学 |
| About Tableau+ Bundle | Tableau 公式 | https://help.tableau.com/current/online/en-us/to_tab_plus_features.htm | 章1 の核。Tableau Agent が premium 機能であることの根拠 |
| Tableau Next 製品概要 | Tableau 公式 | https://help.tableau.com/current/online/en-us/tableau_next_tableau_product_overview.htm | 「Tableau by Tableau」が公式呼称であることの確認 |
| Gate MCP-Apps tool registration, exclude claude.ai (PR #861) | tableau-mcp | https://github.com/tableau/tableau-mcp/pull/861 | 章2。Claude の描画不具合を理由にした除外。2026-09-02 マージ |
| Add render-interactive-viz MCP App tool (PR #625) | tableau-mcp | https://github.com/tableau/tableau-mcp/pull/625 | 章2。Head 方向への実装の代表例。2026-07-24 マージ |
| Add Tableau Knowledge MCP tools (PR #869) | tableau-mcp | https://github.com/tableau/tableau-mcp/pull/869 | 章3。セマンティックグラフを MCP に載せる動き。#784 の作り直し版 |
| Add describe-flow tool (PR #627) | tableau-mcp | https://github.com/tableau/tableau-mcp/pull/627 | 章2。ヘッドレス方向の並行進行。本調査時点で OPEN |
| SEP-1865: MCP Apps | Model Context Protocol | https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865 | 章2。MCP Apps 本体の仕様 |
| MCP 公式ブログ 2026-07-28 | Model Context Protocol | https://blog.modelcontextprotocol.io/posts/2026-07-28/ | 章2。MCP Apps が Extensions 傘下の正式拡張になった日付 |
| Salesforce Hosted MCP Servers Are Now GA | Salesforce Developers | https://developer.salesforce.com/blogs/2026/04/salesforce-hosted-mcp-servers-are-now-generally-available | 章1。2026-04-29 GA |
| Tableau Next Hosted MCP Servers リファレンス | Salesforce 公式 | https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/tableau-next.html | 章1。ChatGPT が名指しで外部 AI エージェントの例に挙がっている |

## 競合 BI の一次ソース（章1・章3 の業界文脈）

| 対象 | URL | 記事での使い方 |
|---|---|---|
| Power BI Copilot 概要 | https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction | ビルトイン AI の代表例 |
| Power BI MCP サーバー | https://learn.microsoft.com/en-us/power-bi/developer/mcp/mcp-servers-overview | 外部エージェント開放が業界標準であることの根拠 |
| Copilot とセマンティックモデル | https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-semantic-models | Copilot が読むのはメタデータで生データではない |
| Bringing Power BI Insights to Every Copilot User | https://community.fabric.microsoft.com/t5/Power-BI-Updates-Blog/Bringing-Power-BI-Insights-to-Every-Copilot-User/ba-p/5309360 | **最強の反例**。ダッシュボードを起点にしない設計思想。本文は403で未取得、要再取得 |
| Looker updates for agentic BI at Next '26 | https://cloud.google.com/blog/products/business-intelligence/looker-updates-for-agentic-bi-at-next26 | Dashboard Agents。ダッシュボードの中に AI を入れる方向 |
| Looker-managed MCP server | https://docs.cloud.google.com/looker/docs/mcp | OAuth 2.1 が事実上の標準であることの根拠 |
| Databricks MCP | https://docs.databricks.com/aws/en/generative-ai/agent-framework/mcp | Managed / External / Custom の3種構成 |
| Unity Catalog メトリックビュー | https://docs.databricks.com/aws/en/uc-semantics/metric-views/ | セマンティック層を基盤側に置く動き |
| Snowflake Cortex Agents MCP GA | https://docs.snowflake.com/en/release-notes/2025/other/2025-11-04-cortex-agents-mcp | 2025-11-04 GA |
| Getting Started with Cortex Analyst | https://www.snowflake.com/en/developers/guides/getting-started-with-cortex-analyst/ | ダッシュボード不要論に近いトーンの実例 |
| Why AI needs a semantic model | https://omni.co/blog/why-ai-needs-a-semantic-model | チャット UI 単体では不完全という指摘 |
| Omni MCP サーバー | https://docs.omni.co/ai/mcp | ChatGPT を含む7クライアント対応 |
| Sigma MCP サーバー | https://help.sigmacomputing.com/docs/use-sigma-mcp-server | 同上 |

## 公式 MCP サーバーの OSS 公開状況（章3 の機構。official-mcp-oss-status.md が詳細）

| ベンダー | リポジトリ | ライセンス |
|---|---|---|
| Tableau | https://github.com/tableau/tableau-mcp | Apache-2.0 |
| Microsoft Power BI Modeling | https://github.com/microsoft/powerbi-modeling-mcp | MIT |
| Microsoft Fabric | https://github.com/microsoft/mcp | MIT |
| Snowflake | https://github.com/Snowflake-Labs/mcp | Apache-2.0 |
| dbt Labs | https://github.com/dbt-labs/dbt-mcp | Apache-2.0 |
| Apache Superset | https://github.com/apache/superset | Apache-2.0 |
| Cube | https://github.com/cube-js/cube | Apache-2.0 / MIT |
| ThoughtSpot | https://github.com/thoughtspot/mcp-server | 独自 EULA（OSS ではない） |
| Databricks（旧版・非推奨） | https://github.com/databrickslabs/mcp | 制限ライセンス |

マネージドのみでリポジトリが確認できなかったのは Looker、Omni、Sigma、Qlik、Hex、および Power BI のリモート版。

## 反論の材料（/critique の入力）

| タイトル | 媒体 | URL | 注記 |
|---|---|---|---|
| MCP Security Crisis | Cloud Security Alliance | https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-security-crisis-20260504-csa-styled/ | 埋め込み認証の前提そのものへの反論。本文未読 |
| BI for Agents | Cube | https://cube.dev/agentic-ai | BI ベンダーが同じ主張を掲げている実例。本文未読 |
| ThoughtSpot Boundaryless Agentic Intelligence | ThoughtSpot | https://www.thoughtspot.com/press-releases/thoughtspot-redefines-analytics-with-boundaryless-agentic-intelligence | 入口を自社に囲い込む側の実例。本文未読 |
| Why text-to-SQL fails | Omni | https://omni.co/blog/why-text-to-sql-fails | セマンティック層の必要性の技術的裏付け。本文未読 |
| Is BI dead? | Hacker News (2021) | https://news.ycombinator.com/item?id=28580298 | 不要論が AI 以前からの再演であることの参照点 |
| Dashboards Aren't Dead | Mark Tossell | https://marktossell.com/2026/06/12/dashboards-arent-dead-they-arent-even-sick/ | 擁護論の同時代例。本文未読、要精読 |
| Designing Generative UI in an Agent-Native World | Builder.io | https://www.builder.io/blog/designing-generative-ui-in-an-agent-native-world | 第三極。埋め込み先が固定 UI でなく都度生成になる可能性 |

## 記事固有の一次素材（ローカル）

| ファイル | 概要 | 記事での使い方 |
|---|---|---|
| references/x-thread-2098567817755054404.md | 20260912 の宣言スレッド3件 | 記事の出発点。7トピックの原文 |
| references/x-recent-posts.md | 直近2か月（07-10〜09-12）の本人ポスト約70件 | 章2 の実験の時系列。8月上旬の MCP Apps 実験が中核 |
| references/tableau-status.md | Tableau MCP 改修履歴、MCP Apps、ChatGPT 連携、内蔵 AI とライセンス | 章1・章2 の裏取り |
| references/industry-opinions.md | BI 業界の類似議論。賛否の地図と独自性の切り分け | 章1・章3 の業界文脈、/critique の入力 |
| references/competitor-bi-landscape.md | 競合 BI 7社の AI 対応状況 | 章3 の業界横断の節 |
| （外部）tableau-mcp-apps-lab | 著者の自作フォーク。8月の実験の実装 | 章2 の導線 |
| （別ディレクトリ）output/20260801_tableau-mcp-apps/eas-implementation-spec.md | EAS / OAuth 実装の技術仕様 | 本記事では使わない。技術記事として別立て |

## 関連する過去記事（yarakawa.com / published）

| 記事 | 関連 |
|---|---|
| published/20260607_agentic-analytics-engineering | 本記事が更新する対象。「勝負どころは可視化でなくデータソースの質」に但し書きを足す |
| published/20260620_vizql-data-service-scale-concerns | 断定と推測をラベルで分ける作法の先例。VDS の理解の土台 |
| published/20260512_tc26-impression | Architect 像と境界拡張。「Tableau Classic」の呼称はここで使用。今回は「Tableau by Tableau」が公式である旨に注意 |
| published/20260606_ai-worldview | 脳と手。問いは人間が設計するという軸 |
| published/20260612_ai-adoption-motivation-culture | カルチャー論。本記事からは外し、続編があるならそちら側 |
| output/20260625_ai-immersion-fortune-misfortune | 未完。発信姿勢と自己言及のトピックはこちらへ合流させる |

## 追記（20260913 /deepen）

- Tableau Pulse リリースノート（公式）: https://help.tableau.com/current/online/en-us/pulse_intro.htm — 適用対象は Tableau Cloud のみ表示。Tableau+ 必須機能（Forecast、Pace to goal、enhanced Q&A、インライン可視化）の明記を確認。Server 非対応の明言は未確認。引用可（短く）
- VizQL Data Service（公式）: https://help.tableau.com/current/api/vizql-data-service/en-us/index.html — Tableau Server 2025.1 以降で利用可。workbook data sources も interactive session 中は照会可。ワークブック側のフィルタ・パラメータの扱いは記載なし。引用可（短く）
- 日本の Tableau コミュニティ調査（20260913、references/japan-tableau-community.md）— DATA Saber の師弟制（2022-08 時点 952 名）、属性別 TUG、Viz for Social Good 日本などを確認。ただし伝道師を表彰する制度は Qlik・Microsoft にもあり、Tableau だけのものではない。本文未取得 3 件あり
- 共有ダッシュボードの効果の一般パターン（20260913、references/shared-dashboard-effects.md）— 数字の正しさの議論から「なぜ」の議論へ移る、指標定義の食い違いが消える、部門間の共通言語になる。反対に、見る会議・人・目的を運用で決めないと形骸化する。「異常に複数人が同時に気づく」の事例は未発見。住友ゴム工業の事例は本文 403
  - 20260913 WebFetch で原文照合: Qiita「みんなに長く使われるダッシュボードで押さえるべき4つのポイント」（@IkuyaM、2024-02-06）https://qiita.com/IkuyaM/items/c109dc0870151595b278 — 形骸化の原因は「得られる情報がビジネスの改善や特定のアクションに結びつかないため」。「どの会議で・誰が・何を決めるために見るか」「数年で」「KPIオーナー」は原文に無い（検索結果の抜粋由来）。04 に原文の趣旨でリンク
- Tech-Verse 2026「AI時代の次世代認可標準「ID-JAG」：MCPとA2A連携における認可設計と実践」（LINEヤフー ID & Access Division、20260913 取得、本文で使う）: https://tech-verse.lycorp.co.jp/2026/ja/sessions/222.html — 著者が ID-JAG を知ったセッション。余談2で紹介する。スライド: https://speakerdeck.com/lycorptech_jp/id-jag-the-enterprise-ready-standard-for-ai-agent-authorization-in-the-mcp-and-a2a-era（中身は未取得）
- ID-JAG（IETF draft-04、2026-05-21、20260913、references/id-jag.md）: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant — IdP を介して他ドメインの API トークンを得る OAuth の拡張。トークンにユーザー（sub）とアプリ（client_id）が載り、IdP のポリシーで scope を絞れる。MCP の Enterprise-Managed Authorization が採用している。まだ RFC ではない
- Looker の BI 適性（20260913、references/looker-bi-fit.md）— 中間層は LookML の access_filter / access_grant で厚い。モバイル GA とタイルアラートあり。モデルがあればダッシュボードは User ロールが GUI で作れる。新しい共通指標は LookML 開発者が要る。データ文化の公式フレームワークは見当たらない。サブエージェントによる調査で、各行に一次 URL あり
- Snowflake の BI 適性（20260913、references/snowflake-bi-fit.md）— 行アクセス・マスキングのポリシーは semantic view と CoWork（旧 Snowflake Intelligence）の回答にも効く。Legacy Dashboards は 2026-06-22 から削除中で、移行先は Streamlit か外部 BI。業務ユーザーが GUI で作れるのは1枚単位の Artifact まで。文化の枠組みは技術者コミュニティ中心。サブエージェントによる調査
- Databricks の BI 適性（20260913、references/databricks-bi-fit.md）— AI/BI はライセンス料なし。metric view 由来のダッシュボード、購読、アラートあり。モバイルは Preview。ダッシュボードは GUI と自然言語で作れて全社公開も可能だが、作成権限は基盤チームの付与が前提。MVP など技術者中心で、業務ユーザーの文化フレームワークはない。サブエージェントによる調査
- Sam Altman の「経済には慣性がある」発言（20260913、references/altman-inertia.md）: David Senra のポッドキャスト 2026-08-23 https://www.youtube.com/watch?v=kG8AoExkX40 — 速度の見立ては誤りで、人は同じ会社・同じツールを使い続けると発言。本人は移行が遅いことを肯定的に語っている。タイムスタンプと一語一句は未確認
- Tableau Blueprint（公式ヘルプ、20260913、references/tableau-blueprint.md）: https://help.tableau.com/current/blueprint/ja-jp/bp_overview.htm — 「データに基づいた組織に変わるための手順を示すガイド」。3能力のうち、プロフィシエンシーは勘でなくデータで判断する人の状態、コミュニティは共有・コラボレーションするユーザーのネットワーク。公式の理想像であり実態の証拠ではない。生成 AI で目指す状態を書き換えた記述は見当たらず（全ページ未網羅）

## 追記（20260913 書く工程・著者持ち込み）

- Tableau 公式のデータカルチャー出典（20260913、references/tableau-data-culture.md、Sonnet サブエージェント調査）: Tableau Blueprint の概要（ja-jp）https://help.tableau.com/current/blueprint/ja-jp/bp_overview.htm — 「これはテクノロジーだけでは実現できません」。04 の入口に埋め込み（Qiita と Ramp の代わり）。候補は7件、tableau.com 配下（Data Culture Playbook 等）は 403 で未確認
- セマンティック層の入門リンク（20260913、references/semantic-layer-intro.md、Sonnet サブエージェント調査）: Zenn「セマンティックレイヤー / Headless BIとは」（churadata、2023-07-23、更新 2023-12-08）https://zenn.dev/churadata/articles/e779a733c5fb35 — 日本語・図解つき・対立見解も併記。03 §1 の「セマンティック層」初出に埋め込み。他候補: Tableau Semantics ヘルプ（実装リファレンス）、Trailhead、dbt「Semantic Layer: What it is and when to adopt it」（英語）

- The Scarce Resource is Consensus（Dan Poppy / dbt Analytics Engineering Roundup、Ian Macomber（Ramp）へのインタビュー、2026-07-16、逐語抜粋を references/ramp-consensus.md に保存 0913）: https://roundup.getdbt.com/p/the-scarce-resource-is-consensus — 分析とダッシュボード構築が安くなるほど希少になるのは全社的な合意（"the scarce resource is company-wide consensus"）。7/10 は「10点満点で7点の出来」（"it was a 7 out of 10"。CPO が5か月触られていないダッシュボードしか見つからず自作した逸話）。"7-out-of-10 data fails quietly"。速い人を champions にして全社会議・評価で称えるべきだった（"We were too empathetic"）。エージェントは生データに直接つながず抽象化層を通す。BI やダッシュボードの将来像への明示的な言及は無い。候補: 03 の合意の効果の出典、04 の入口（形骸化）と champions
- The Post-AI Data Stack（Ian Macomber、2026-08-30、著者持ち込み 0913、WebFetch 要約のみ・全文は未取得）: https://www.iandmacomber.com/blog/post-ai-data-stack/ — 節: Agent-Readable Artifacts（ダッシュボードは最終成果物ではなくなり、エージェントが消費して人に再包装する）／Agent-Operable Tools（"use your tools with my agent, not your agent"。API と MCP を一級の操作面に）／Agent-Agnostic Context（コンテキストとコネクタをできるだけ headless に。coworker・coding agent・BI・Slack bot のどれで聞いても同じ答え）／Agent-Testable Consensus（"Consensus ... can be engineered, asserted and measured"。インターフェース×モデルの組み合わせで同じ問いを投げ、答えや trace が違う割合を consensus divergence rate として追跡。役員資料は 0 を目指す）／Why Semantic Layers Are Mainstream Now（"A good semantic layer encodes all the tribal knowledge"）。使用: 02 の Headless（Agent-Operable Tools）、03 の合意（Agent-Testable Consensus）。未使用: Agent-Readable Artifacts（llms.txt 等）、Beyond SQL、evals は本記事の範囲外
- What is business intelligence?（Tableau 公式、著者持ち込み 0913、Browser pane で全文取得 references/tableau-what-is-bi.md。WebFetch と playwright-cli は 403）: https://www.tableau.com/business-intelligence/what-is-business-intelligence — "Much more than a specific 'thing', business intelligence is an umbrella term that covers the processes and methods of collecting, storing, and analyzing data"／cycle of analytics（access, discovery, exploration, information sharing）／SSBI = "IT managing the data (security, accuracy, and access), allowing users to interact with their data directly"／traditional BI = IT 主導のトップダウンと静的レポート。使用: 01 冒頭の定義（著者の「BI はプロセス」の出どころ）
- Tableau のライセンス価格 vs カルチャー面の価値（20260913、references/tableau-license-vs-culture.md）— 「コミュニティ・データ文化が Creator の価格を正当化する」という論はベンダーとその周辺にしか見当たらず、実務者の議論（Reddit・比較記事・TCO 記事）では価格の話にカルチャーが登場しないのが主流。Tableau Cloud の公式価格（Standard $75/$42/$15、Enterprise $115/$70/$35、Cloud+ 以上は非公開）と Forrester TEI（2026-05、ベンダー委託）の要点も収録

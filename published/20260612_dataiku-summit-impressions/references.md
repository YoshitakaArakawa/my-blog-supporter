# 参考資料

> 一次素材は `dataiku-summit-blog-source.md`（当日10会話＋Web調査の素材ノート）。本記事は技術詳細を深掘らない方針なので、以下は「公式メッセージの出典」と「論点の生きた実例」に絞って使う。出展社記事はマーケ目的なので、出典として使い論評と分ける。リンク・日付は引用前に再確認。

## 参考資料（ローカル）
| ファイル | 概要 | 記事との関連 |
|---|---|---|
| dataiku-summit-blog-source.md | サミット当日の10会話＋Web調査を整理した一次素材ノート（ノンDataikuユーザー視点） | 本記事の素材の正本。背骨・立ち位置・事実関係の出所 |
| discussion-root.md | ブレストで掘り当てた中心論点「オーケストレーション層の中心に人間かエージェントか」を、業界横断の発信＋時系列で裏づけた議論の根 | 背骨の鋭利化。deepen/outline が読む主張の燃料 |

## 参考記事・ブログ（公式メッセージ／論点の出典）
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Dataiku Summit イベント一覧 | https://www.dataiku.com/company/events/the-dataiku-summit-events | Tokyo 2026=6/9 を含む開催リスト。テーマ "unify people, orchestration, and governance" を確認できる | 公式テーマ（人＋オーケストレーション＋ガバナンス）の一次出典 |
| Dataiku Summit TOKYO 2025 公式ページ | https://meet.dataiku.com/dataiku-summit-tokyo-2025/ | 前年テーマ "From Chaos to Control" | テーマ取り違え防止の確認用。2025と2026を混同しないため |
| NTTインテグレーション（NI＋C）出展のお知らせ | https://www.niandc.co.jp/seminar/20260518_73402/ | テーマ「人＋オーケストレーション＋ガバナンス」を日本語で詳説 | オーケストレーション層の必要性の語られ方（公式メッセージ）の出典 |
| DCS 出展案内 | https://www.dcs.co.jp/event/2026/0609_DataikuSummitTOKYO2026.html | "AI Success, Delivered"、「AI活用の拡大とROI実現」という課題設定 | 価値の宛先が経営・ROI層に向く、を裏づける公式メッセージ |
| 「Dataiku×Claude Codeでデータ分析をやってみる」（キーウォーカー, 2026-06-02） | https://www.keywalker.co.jp/blog/dataiku-claudecode.html | Code Studio上でClaude CodeにDataiku APIでデータを理解させ分析。`SYNC FILES WITH DSS` で初めてDSS反映 | 「ガバナンスされたcoding agent」の生きた実例。実践者×ガバナンスの接点 |
| Dataiku Summit Tokyo 2026 キーノートレポート（キーウォーカー, 小林純一朗, 2026-06-11） | https://www.keywalker.co.jp/ai-solution/dataiku_summit_keynote2026_06.html | キーノート詳録。4発表（E2A/Cobuild/Agent Management/Reasoning Systems）、McGowan「推論プロセスを明示的・視覚的に定義しガバナンス」、People/Orchestration/Governance。※パートナー記事＝公式メッセージ出典として使う。テーマ表記 "The Platform for AI Success"（"AI Success, Delivered" と要照合） | 導入のキーノート紹介、展開1/2/3 の人間中心・視覚の建て付けの一次引用 |
| Dataiku Summit Tokyo 2026 参加記（Zenn, Taro/Vポイントマーケティング, 2026-06-09） | https://zenn.dev/taro_cccmkhd/articles/d644d016d3ba6b | 同業実践者の参加記。Cobuildに「探していた答えでは」と反応も「評価は仮説」と留保。CEO「コーディングアシスタントはコードが推論パスに埋もれ監査人が辿れない」。CCiD は CLI/Python/SDK/Git が要りアナリストに障壁→視覚の方が良い | 展開4の射程limited steelman（開いた土台＝技術者視点）の実在傍証。緊張が業界共有である証拠。CEO発言＝偽の二分法の実演 |

## プラットフォーム横断リサーチ（時期つき・断層線の出典）
> 「オーケストレーション層の中心に人間かエージェントか」「2025は capability、governance は2026の波」を裏づける出典。詳細な読みは discussion-root.md。
| 発信 | 時期 | URL | 記事との関連 |
|---|---|---|---|
| Dataiku「Agent orchestration explained」(Jed Dougherty) | 2026-05-22 | https://www.dataiku.com/stories/blog/agent-orchestration-explained | ①誰のため（経営語彙）②Human-in-the-Loopを設計上の選択として明示 |
| SiliconANGLE「Dataiku evolving into orchestration layer」(CEO/CTO談話) | 2026-03-09 | https://siliconangle.com/2026/03/09/dataiku-evolving-orchestration-layer-enterprise-grade-ai-agents/ | ①運用リスク語彙②CTO「人間の監督で制御」③Cobuild視覚承認 |
| Dataiku「Understanding AI Agents & Agentic Workflows」 | 無日付（恒常） | https://www.dataiku.com/stories/detail/ai-agents/ | ③視覚＋コードで非技術者を巻き込む |
| Douetteau LinkedIn「AI is a job-killer」 | 約2024-05 | https://www.linkedin.com/posts/fdouetteau_ai-work-different-activity-7199429312939188229-_G5L | ②雇用に断定回避＝2024は問いを開いていた |
| OpenAI「Introducing AgentKit / Agent Builder」 | 2025-10-06 | https://openai.com/index/introducing-agentkit/ | capability＋視覚GUIの代表。「エージェント版Canva」 |
| OpenAI Agent Builder 廃止（公式 Deprecations。2026-11-30 終了、2026-06-03 通知） | 2026-06-03 | https://developers.openai.com/api/docs/deprecations | 視覚ビルダーの約8か月寿命＝③懐疑の実例。移行先は Agents SDK（=コード側へ回帰） |
| Anthropic「Building effective agents」 | 2024-12 | https://www.anthropic.com/engineering/building-effective-agents | capability-first思想（過剰な足場を足すな） |
| Anthropic「multi-agent research system」 | 2025-06 | https://www.anthropic.com/engineering/multi-agent-research-system | orchestrator-worker＝作り方の議論 |
| Anthropic Managed Agents / multi-agent orchestration | 2026-04-08 / 05-06 | https://code.claude.com/docs/en/agent-sdk/overview | エージェント中心のorchestration（Planner/Generator/Evaluator）。断層線の対極 |
| Anthropic「harness design for long-running apps」 | 2026-03-24 | https://www.anthropic.com/engineering/harness-design-long-running-apps | Evaluator が人間QAを肩代わり／人間がループの上へ。"every component in a harness encodes an assumption about what the model can't do on its own" |
| Anthropic Managed Agents: dreaming / outcomes（The New Stack） | 2026-05-06 | https://thenewstack.io/anthropic-managed-agents-dreaming-outcomes/ | outcomes=自己採点ループ、dreaming=自己改善 "less human intervention"、"minimal steering" |
| Dify（LLMOps/視覚ビルダー） | 2026参照 | https://dify.ai/blog/open-source-llmops-platform-define-your-ai-native-apps | build寄り、governanceは後付けlayering |
| Futurum「Was 2025 really the year of agentic AI」 | 2025〜2026 | https://futurumgroup.com/insights/was-2025-really-the-year-of-agentic-ai-or-just-more-agentic-hype/ | 2025は能力→価値実現/ガバナンスへ重心移動、の言説 |

## Dataiku 製品史の出典（「オーケストレーション」のすり替わり）
> 詳細な読みは discussion-root.md「Dataiku 製品史の時系列」。
| 発信 | 時期 | URL | 記事との関連 |
|---|---|---|---|
| Dataiku（Wikipedia） | ── | https://en.wikipedia.org/wiki/Dataiku | 創業2013／DSS 2014／資金調達・評価額の年表 |
| The Dataiku Story（公式） | ── | https://www.dataiku.com/stories/detail/the-dataiku-story/ | 創業命題（アナリストとコーダーの橋渡し）の一次 |
| LLM Mesh 発表（GlobeNewswire） | 2023-09-26 | https://www.globenewswire.com/news-release/2023/09/26/2749580/0/en/Dataiku-Unveils-LLM-Mesh-and-Announces-LLM-Mesh-Launch-Partners-Snowflake-Pinecone-and-AI21-Labs.html | GenAI/ガバナンス層への転換点 |
| Generative AI in Dataiku（公式） | ── | https://blog.dataiku.com/generative-ai-in-dataiku | GenAI機能の歩み（公式視点） |
| Dataiku Agent Hub（SiliconANGLE） | 2025-10-07 | https://siliconangle.com/2025/10/07/dataikus-new-agent-hub-gives-businesses-full-control-agentic-ai-automation/ | エージェントが製品の中心になった時期の確認 |

## Agentの管制塔の業界収束（展開4の余談）
> 2025末→2026前半に主要プラットフォームが揃って「Agentの管制塔（control tower/command center）」を投入。全部「閉じたプラットフォーム×人間中心」の象限。展開4で Tableau を起点に触れる。
| 製品 | 時期 | URL | メモ |
|---|---|---|---|
| Tableau Agentic Analytics Command Center | TC26 2026-05発表 / GA 2026秋 | https://www.salesforce.com/news/stories/tableau-agentic-analytics-platform-announcement/ | Agentの健全性(Efficacy)監視・データ整合性自動検知・AIが提案し人間が承認。著者が普段使うTableauの管制塔（展開4の個人的な錨） |
| Tableau Agentic Analytics（公式） | 2026 | https://www.tableau.com/agentic-analytics | Command Center を含む6本柱。デモ録画 https://www.youtube.com/live/yh4rmD9OXyY |
| Microsoft Agent 365 | Ignite 2025-11発表 / GA 2026-05-01 | https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/ | Entra Agent IDで登録・棚卸し（shadow agent対象）、人間社員と同じ厳格さで統治するcontrol plane、他社クラウド横断 |
| ServiceNow AI Control Tower | Knowledge 2026 | https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-expands-AI-Control-Tower-to-discover-observe-govern-secure-and-measure-AI-deployed-across-any-system-in-the-enterprise/default.aspx | あらゆるAI Agentを統治する中央command center。kill switch付き（ https://www.theregister.com/software/2026/05/05/servicenow-adds-agent-kill-switches-to-ai-control-tower/ ） |

## 関連する過去記事（yarakawa.com）
| タイトル | URL | 関連 |
|---|---|---|
| （Tableau／データ可視化の既存記事 — 要特定） | （TODO） | 「可視化の人間向け価値はどこまで強いか」という本記事の問いと地続き。Tableauユーザーとしての立ち位置を補強する内部リンク候補 |

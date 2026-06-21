# 議論の根：オーケストレーション層の「中心に誰を置くか」という断層線

> 2026-06-14 のブレスト対話で掘り当てた、本記事の背骨を支える論点。brief.md の背骨（主体と時間軸のズレ）を、業界横断の事実で裏づけ・鋭利化したもの。deepen / outline はここを読んで主張を組むこと。
> 各記述に【事実】【解釈】【留保】のラベルを付ける。【事実】は出典の発信内容、【解釈】は筆者・対話での読み、【留保】は断定できない範囲。

## この論点が答えようとしている問い（筆者の引っかかり）

1. オーケストレーション層の必要性は分かる。でもその価値は「現場/実践者」より「経営・マネジメント」の課題意識に向いて感じた。なぜか。
2. その価値は「人間を多く巻き込んで組織普及させる」前提に立つ。でもAIエージェントの本流は人間の関与を減らす方向。この二つの整合がつかない。
3. 「人間が見るための視覚フロー」の価値は、この先どこまで強いのか（Tableauユーザーとしての自分の悩みと地続き）。

## 中心命題（背骨）

**「オーケストレーション層が要る」では業界はほぼ一致している。割れているのは"その層の中心に人間を置くか、エージェントを置くか"。**

- Dataiku＝**人間中心**（監査・承認・サインオフ・Human-in-the-Loop を設計上の選択として明示）。
- Anthropic 等の capability 陣営＝**エージェント中心**（Planner/Generator/Evaluator のエージェント分業。人間の目視ゲートをむしろ外す方向）。

筆者の引っかかり（②人間を巻き込む普及 vs ゴールまでエージェントに）は、個人の戸惑いに見えて、実は**2026年に業界が二手に分かれている断層線そのもの**を言い当てている。だから「分からないで終える」は弱さでなく誠実さになる ── 業界もまだ答えを出していない。

## 時系列：各プラットフォームが「何を」訴求したか

| 時期 | 発信 | 訴求の重心 | 陣営 |
|---|---|---|---|
| 2024-12 | Anthropic「Building effective agents」 | 作り方（過剰な足場を足すな、シンプルに） | capability |
| 2025-06 | Anthropic「multi-agent research system」 | 作り方（orchestrator-worker 分割） | capability |
| 2025-10-06 | OpenAI AgentKit / Agent Builder | 作りやすさ。Altman「エージェント版Canva」、ドラッグ&ドロップで数時間で本番化 | capability＋視覚GUI |
| 2026通年 | Dify | 作りやすさ＋基礎LLMOps。視覚ワークフロー＋RAG。ガバナンスは後付けで layering | build寄り |
| 2026-04-08 | Anthropic Managed Agents / multi-agent orchestration | 運用（Planner/Generator/Evaluator 分業）。ただしコード/エージェントネイティブ | capability→production |
| 2026-03〜05 | Dataiku（サミット前後の発信） | 統制・運用リスク（監査・承認・ガバナンス死角） | governance |
| 2026-06-03 | OpenAI、Agent Builder 廃止を発表（11/30 終了） | 視覚ビルダーからの撤退 | ── |

### 時系列から読めること
- 【事実】2024〜2025のLLMネイティブ側（OpenAI/Anthropic/Dify）の主旋律は「どう作るか（capability）」。Anthropic は「過剰な足場を足すな」という capability-first 思想。
- 【事実】「ガバナンス・運用リスク・value realization」を第一の語り口にしたのはアナリスト言説でも2025後半→2026に重心が移ってから（Futurum/Gartner系）。
- 【解釈】Dataiku の2026サミットは、この新しい波の先端で、かつ最も強く governance に振り切った側。
- 【解釈】筆者の違和感の一部は「フェーズのズレ」だけでなく「陣営のズレ」。筆者が日々触れるのは capability 陣営（Anthropic 等）で、そこでは2026年でも主旋律は「賢いモデル＋薄い足場でどこまで自律できるか」。同じ「エージェント」の語の下で見ている地平が違う。

## Dataiku 自身の発信（自分の問いに何と答えているか）

### ① 誰のためか
- 【事実】「86%の組織がAIエージェントを日常業務で使うが、大半は管理基盤を欠く」「誰も端から端まで監査できない出力」（agent-orchestration-explained, 2026-05-22）。
- 【事実】CEO Douetteau「重複・ガバナンス死角・許容できない運用リスク」「全員を構築プロセスに巻き込まなければAI施策は受け入れられない」（SiliconANGLE, 2026-03-09）。
- 【解釈】痛点の語彙（重複・監査不能・運用リスク）は明確に経営/リスク側。Dataiku は「実務家にも価値」と橋を架けるが、痛点の出所は上位、という筆者の読みは彼らの言葉自体が裏づける。

### ② 人間 vs 自動化
- 【事実】「Human-in-the-Loop を設計上の選択として」を章立て。「エージェントは専門作業を担うが、人間が重要分岐の意思決定者であり続ける」（agent-orchestration-explained）。CTO Stenac「ビジネスルールと人間の監督で制御」（SiliconANGLE）。
- 【事実】CEO は雇用には断定回避：「AIはjob-killer、というのがよくある認識」と置いた上で「だが仕事は消えるのか、ただ大きく変わるだけか」とゼロサムを否定（Douetteau LinkedIn, 約2024-05）。
- 【解釈】Dataiku は「人間を意思決定者として構造的に残す」を価値判断・賭けとして打ち出している。筆者とは「人間がループに残るべきか」で思想が割れている。
- 【解釈・時系列】2024年のCEO投稿は雇用＝未来の問いに正面から向き合い保留していたが、2026年の製品メッセージでは Human-in-the-Loop が「未来予測」でなく「設計上の選択」＝確定した前提として語られる。筆者は「彼らが一度開き、いま閉じた問いを、まだ開いたまま持っている」とも書ける。
- 【留保】これは公開発信4本からの推定。内部の思想変遷を直接示す証拠ではなくサンプルも少ない。「立場が変わった」と断定せず「公開発信を時系列で見ると論点の重心がこう動いて見える」と書く。

### ③ 視覚フローの価値
- 【事実】Cobuild は「段階的にレビューし前提と意思決定ロジックを検証、本番前に承認できる構造化視覚フロー」。視覚＋コードで技術者・非技術者双方が貢献し採用を加速（ai-agents detail / SiliconANGLE）。
- 【解釈】彼らの視覚フローの価値は「非技術者を巻き込む」「人間が承認する」に依存。つまり③は②と同じ前提の上に立つ。②に懐疑なら③のGUI価値も同じ根で揺らぐ。Dataiku 側でも①②③が一本に繋がるが、筆者と符号が逆。

## 記事の燃料になる二つの実例

### (1) OpenAI Agent Builder の約8か月寿命
- 【事実】Dataiku の視覚フロー訴求に最も近い同型物（ドラッグ&ドロップの視覚エージェントビルダー）を OpenAI は 2025-10 に出し 2026-06 に廃止発表（11/30 終了）。
- 【解釈】「視覚フローの人間向け価値はどこまで強いか」という筆者の懐疑に、市場が一つの実例で答えを出しつつある。
- 【留保】撤退理由は公式にはβ整理・統合で、「視覚が無効だから」とは断定できない（素材ノートの Agent Builder 留保と同じ）。

### (2) Anthropic「managing agents」は orchestration なのに正反対の作法
- 【事実】Managed Agents / multi-agent orchestration（2026-04-08）も orchestration をやるが、Planner/Generator/Evaluator のエージェント分業＝コード/エージェントネイティブ。人間が見る視覚フローでも人間の承認ゲート前提でもなく、Evaluator という別エージェントに評価させる＝人間の目視を外す方向。
- 【解釈】「オーケストレーション層が要る」は両陣営一致。割れるのは"中心に人間かエージェントか"。Dataiku＝人間（監査・承認）、Anthropic＝エージェント（Evaluator）。これが中心命題の最も鋭い実例。

## Anthropic のエージェント観の時系列 ── 人間確認の「薄まり」（center軸を時間軸に格上げ）

> 筆者スタンス（point 2）：「人間による確認の価値・必要性を*薄める*方向に、AIエージェントの論調は動いている」。harness / long-run / loop が証拠。直近半年（2026-03〜05）の Anthropic 発信で裏づく。Managed Agents（2026-04-08）を境に、人間の位置が「ループの中→上→外」へ動く。

### フェーズA：人間はループの中（2024-12〜2025-06）
- 【事実】「Building effective agents」(2024-12)：エージェントは "can pause for human feedback at checkpoints or when encountering blockers"、"human review remains crucial"。workflow（predefined code paths）と agent（LLMs dynamically direct their own processes）を区別。シンプル第一・足場は本番で剥がせ。
- 【事実】「multi-agent research system」(2025-06)：LLM judge で評価を自動スケール。だが "Even in a world of automated evaluations, manual testing remains essential." "People testing agents find edge cases that evals miss." ＝人間はまだ代替不能。

### フェーズB：Evaluator が人間QAを肩代わり、人間はループの上へ（2026-03）
- 【事実】「harness design for long-running apps」(2026-03-24)：GAN着想の Planner/Generator/Evaluator。"tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work." Evaluator が Playwright で人間QAを直接肩代わり（27項目検証、4-6h 自律）。"Human intervention shifted from continuous oversight to configuration and post-hoc refinement rather than real-time guidance." 足場＝一時物を明言："every component in a harness encodes an assumption about what the model can't do on its own."
- 【留保・重要】人間は消えていない、上に移った。"the tuning loop was to read the evaluator's logs... and update the QA's prompt." 人間は「確認する人」→「確認役（Evaluator）を調律する人」。

### フェーズC：人間はループの外へ（2026-04 Managed Agents → 2026-05）
- 【事実】Managed Agents (2026-04-08)：Anthropic がハーネス/サンドボックス/セッションログをホスト、アプリは events を送り results を受け取る＝人間がハーネスの外側へ。SDK でプロトタイプ→本番は Managed Agents へ graduate。
- 【事実】Code with Claude (2026-05-06)：outcomes="a self-grading loop in which an evaluator agent scores work against a written rubric"（自己採点）、dreaming=自己改善 "with less human intervention"、狙いは "minimal steering"。

### この時系列の意味（解釈）
- 【解釈】筆者スタンスは裏づく：人間確認の*薄まり*は harness（Evaluator が QA 肩代わり）・long-run（4-6h 自律）・loop（outcomes 自己採点・dreaming 自己改善）に現れ、last 6 months に集中。
- 【留保】「薄める（thin）」が正確で「消す（eliminate）」ではない。人間はルーブリックを書き Evaluator を調律する役で残る。筆者の語「薄める」は当たり。「消す」と書くと反証される。
- 【解釈】薄まりは思想だけでなく実務的強制でもある（4-6h 自律では人間が張り付けない→確認役をエージェントへ）。autonomy を伸ばした下流で human confirmation が薄まる、という因果。「足場は一時物」と地続き。
- 【解釈・記事の山場】center 軸が静的な二分から*方向性のある時間軸*に格上げ：capability 陣営は人間確認の価値を時間をかけて薄めつつある。同じ2026年に Dataiku は逆に人間確認を「アーキテクチャ要件」として太らせている（CEO Douetteau）。**二陣営が人間確認をめぐって正反対に動いている**＝最も鋭い対比。

## Dataiku 製品史の時系列 ── 「オーケストレーション」の中身がすり替わっている

| 時期 | 出来事 | プロダクトの重心 |
|---|---|---|
| 2013-01 | 創業（Douetteau, Stenac ら4名、パリ） | ── |
| 2014 | DSS（Data Science Studio）launch | データサイエンスの民主化。同画面でコーダーはPython/R、非コーダーは視覚no-code |
| 2015〜2021 | 米国進出、Series B〜E、ユニコーン化(2019)→評価額46億ドル(2021) | "Everyday AI"。MLOps／データパイプライン（視覚Flow=DAG）でスケール |
| 2023-06 | 生成AI機能を導入 | GenAI参入 |
| 2023-09-26 | LLM Mesh 発表（NY、partner Snowflake/Pinecone/AI21） | 複数LLMを束ねる安全なゲートウェイ＋ガバナンス |
| 2024 | LLM Mesh 拡張（Claude 3, GPT-4o 等）、PII/コスト/監査 | ガバナンス強化 |
| 2025 | AIエージェントが中心に。Agent Hub(2025-10)、Universal Agent Creation（視覚＋コード） | AIエージェント・オーケストレーション |
| 2026 | サミット "AI Success, Delivered"／人＋オーケストレーション＋ガバナンス | エージェント運用・統制 |

- 【解釈】「オーケストレーション」の中身がすり替わっている。創業以来の本体は**データパイプラインのオーケストレーション**（視覚Flow=DAG、2014年からのコア資産）。2025〜2026に売る「オーケストレーション」は**AIエージェントのオーケストレーション**＝同じ視覚DAGの作法を対象だけ向け直したもの。筆者の「最近じゃないか」という直感は当たり。エージェント文脈は最新の上塗りで骨格は2014年製。素材ノートの「脱皮」「right church, wrong pew」の正体。
- 【steelman・重要】「人間中心・視覚フロー・非技術者の巻き込み」は2025年に都合よく選んだ姿勢ではなく、2014年の創業命題「ビジネスアナリストとコーダーを一つの画面で橋渡し」そのもので12年一貫。だから批判の角度は「彼らがブレている」ではなく「**一貫した思想がエージェント時代にどこまで通用するか**」。日和見ではなくDNAだと認める方が公平＝リスペクトのトーンと噛み合う。
- 【解釈・断層線との接続】capability陣営（Anthropic等）は2024-2025にゼロからエージェントの作法を組んだ（足場を足すな）。Dataikuは既存の視覚オーケストレーション資産の上にエージェントを載せた。出発点が逆だから同じ「エージェントオーケストレーション」でも形が違う。筆者の好みのズレは、この出自のズレまで遡れる。

## 筆者のレンズ（バイアス開示）── 記事で正直に出す

【筆者の主張】プラットフォームに閉じたAI（GUIワークフロー／ChatGPT・GeminiのようなWeb UIチャット）は、**人間ができることの天井を、プラットフォームの設計に絞らせる**。コードベースのエージェント（Codex/Claude Code）は、AIそのものを素材として扱えるので天井が高く、可能性をプラットフォームに先取りされない。作り直し（build-and-scrap）もやりやすい。Dataiku の視覚フローへの懐疑は、この一本のレンズから派生している。

- 重要な訂正：これは「GUIワークフローが肌に合わない」という taste ではない。Web UI への違和感も含めて、すべて「**プラットフォームが人間の可能性を狭める**」という一つの実質的主張の現れ。記事では taste ではなく主張として書く。
- これは断層線のどちら側に立っているかの告白：筆者は**エージェント中心・capability 陣営の側**に立っている。Dataiku を評価する前に「自分はこっち側の人間だ」と先に開示するのが、最もフェアな順序。

### 開示の運用注意（これを外すとトーンが崩れる）
- バイアス開示は、放置すると自己正当化に化ける（「GUIが苦手→だからDataikuは刺さらない」）。**開示と相手陣営の最強の地点を本気で認めることをセットにする**：「自分はコード派だ。だが規制業種・非技術者の巻き込み・監査証跡という一点では、人間中心・GUIの方が明らかに強い」。バイアス開示＋steelman＝信頼が上がる／バイアス開示＋切り捨て＝開示しないより悪い。
- Anthropic の capability-first との「同じ思想」断定は借り物の権威づけになりうる。筆者は "Building effective agents" を**既読（2026-06-14）**。deepen で筆者自身の読後の所感（自分のレンズと「同じ」か「似て非なる」か）を一次の言葉で言語化し、それを記事に使う。capability-first は筆者の整理ラベルでありAnthropicの自称ではない点は本文で断る。
- 関連事実：OpenAI Agent Builder（視覚ビルダー）は公式 Deprecations に従い 2026-11-30 終了、移行先は **Agents SDK＝コード側**。視覚→コードへの回帰の実例として使える。

### deepen で詰める緊張（今は未解決のまま保持）
筆者は「人間の可能性を狭めるな」と言う一方、②では「ゴールまでエージェントにやらせるべき＝人間の関与を減らす」も支持していて、一見ぶつかる。仮の整合：**守りたいのは"操作者（人間）の行動空間の広さ"であって、人間の作業量ではない**。開いたコードでエージェントを指揮すれば操作者の天井は高いまま作業はエージェントに渡せる。閉じたGUIキャンバスはその指揮の幅を先に削る。この整合が本当に立つかは、書きながら確かめる。

## deepen / outline への引き継ぎメモ
- 背骨は「主体と時間軸のズレ」のままでよいが、この断層線（人間中心 vs エージェント中心）で一段鋭くできる。
- リスペクトのトーンは保つ：「Dataiku が間違い」ではなく「彼らは明確にこう賭けた、自分はまだ乗り切れない、どちらが正しいか分からないから観測し続ける」。
- 比喩（right church, wrong pew／上下から挟まれている）は依然として脇に置く判断のまま。使うなら断層線の補強として一言。
- steelman は自然に内蔵される：Dataiku の人間中心は規制業種では実価値、という反論を断層線の片側として公平に置ける。

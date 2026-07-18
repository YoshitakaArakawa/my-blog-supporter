# TC26 思索 — 「Architect」を本気で受け取れば、生息地は Tableau の外に広がる（仮）

> brief.md は素材整理として残す。本ファイルは別アンカーとして、書く動機・コアメッセージ・主要論点を改めて立て直したもの。執筆時はこちらを優先する。

---

## テーマ

TC26 (Tableau Conference 2026) の Keynote と各種セッションを浴びた上で、**生成AI / AI Agent の世界に取り組んできた立場から何を考え、何を感じたか** の思索メモ。

機能紹介や発表まとめではない。Tableauの新機能を解説する記事でもない。一次情報を踏まえた上で、「Tableauユーザーは / データに関わる人は、これから何を考え、どこに向かうべきか」をめぐる、現時点の思考のスケッチ。

---

## 書く動機

- TC26 現地参加 + Keynote録画視聴を経て、頭の中で動き続けている思索を書き留めておきたい
- Xスレッドで一連の感想は流したが、短文では言いきれなかった構造的な議論を残したい
- 「Architect」というKeynoteのキーワードに同意する一方で、それを本気で実現しようとすれば、Tableauに閉じたキャッチアップでは明らかに足りない、という感覚を共有したい
- 「AI実践者の視点」は前面には出さず、論じる切り口・引き寄せる文脈・参照する記事 (dbt roundup、Stanford論文、Skills/ハーネス/コンテキストエンジニアリング etc.) の中で自然に滲ませる

---

## 読者像

- yarakawa.com の通常読者層: Tableau ユーザー、データ分析実践者
- 「3つのArchitect」と言われても、自分が何をすべきか/組織として何を準備すべきか、まだピンと来ていない人
- ダッシュボードの作り方より、データ分析と AI のこれから、組織の中でのアナリストの立ち位置に関心がある層
- TC26 に行けなかった人 / 行ったけれど消化中の人

---

## コアメッセージ

> TC26 Keynote が提示した「Architect」という世界観 (Knowledge / Decisions / Agentic を設計する人) は妥当だし歓迎する。
> ただし、それを本気で受け取って実現しようとすると、**Tableau の内側に閉じたキャッチアップでは明らかに足りない。境界を、両側から広げる必要がある。**
>
> - **Tableau 側の境界拡張**: Tableau Classic から Tableau Next へ。そして Tableau Next もまた、Salesforce / Headless 360 / MCP / 外部エージェントと接続することで初めて Architect の道具になる
> - **AI / Agent 側の境界拡張**: プロンプトの工夫だけでは Architect にならない。Skills、ハーネスエンジニアリング (狭義/広義)、コンテキストエンジニアリング、Managed Agents、Claude や OpenAI のリリース動向 — Tableau や BI、可視化よりも先にある領域に踏み込まないと、Agentic を本当には設計できない
>
> そしてこれは Tableau コミュニティに閉じた話ではない。Tristan Handy が "BI's Second Unbundling" や "Five things I believe about the future of analytics" で書いている通り、業界全体が「アナリストをテック側・上流側に押し上げる」方向に動いている。TC26 のメッセージは、その大きな潮流の一断面。
>
> **TC26 の発表を本気で受け取れば受け取るほど、我々の生息地 — 学ぶべき領域、触るべきツール、接続するべきコミュニティ — は Tableau の外に広がっていく。** そしてそれは、Tableau 社が促してくれる種類の話ではなく、ユーザー側が自分で境界を引き直していく話。

---

## 主要論点

### 論点A: Keynoteの「Architect」メッセージは妥当で歓迎する

- Knowledge / Decisions / Agentic の3つの Architect は、データに関わる人の役割拡張として正しい
- "Help people see and understand data" の世界観に閉じなかったことを歓迎する
- 可視化やダッシュボードを前面に出さなかったKeynoteへの評価
- このメッセージ自体は、AI/データ業界の流れを踏まえれば「ようやく Tableau もここに来た」という追認に近い

### 論点B: 「Architect」を本気で実現するには Tableau 側で境界拡張が必要

- 既存 Tableau (Classic) の構造的限界: バイナリアセット、GUI内ブラックボックス、API-first非対応、エージェント呼び出しに不向き
- Tableau Next の不可避性: Agentic を本格的に設計するなら Next の世界観が必要
- ただし Next も Next で完結しない: Salesforce / Headless 360 (4月15日発表)、Tableau Next MCP (4月GA)、Agentforce、Data 360 が前提として絡む
- TC26 のセッション体験から得た立体的な感覚:
  - **Tristan (Handy) のセッション** — 変化を embrace するマインドセット、BI/データ業界全体の文脈
  - **Will (Tableau Keynote 2026: Go from Seeing to Doing with Agentic Analytics)** — Keynote のメッセージそのものが境界拡張を要請している
  - **Adrian (5 Things Tableau Developers Should Know About Tableau Next, Community / Theater)** — Tableau Developer 目線で「Tableau (Classic) Developer の前提を Next ではアップデートしないと通用しない」(semantic layer / agent orchestration / zero copy data / composable embedded analytics 等) という、境界拡張を Developer 側から実感させるセッション
  - **10x Your Tableau Workflow with AI and Claude Code (Community / Advanced)** — Tableau の API・embeddings を Claude Code から触る、ノンエンジニアでもプロトタイプ・自動化・拡張が作れるという実証
- これらを横断すると、Tableau の枠だけで完結しない議論が立体化されて見えてくる

### 論点B-補: Tableau / Salesforce 側も、本当はもっと話したかったように見えた

- Keynote や横断的メッセージングでは、Tableau Next / Agentforce / Headless 360 のアーキテクチャや関連製品との接続を深く語る場面が、思っていたより少なかった
- しかしそれは、語る材料がなかったわけではない。TC という場の性格 — 既存 Tableau ユーザー (Tableau Cloud / Server / Desktop ユーザー) への配慮、ブランドのジレンマ — に応じて、Tableau / Salesforce 側が **意識的に抑制していた印象** を受けた
- 実際、**個別の Tableau Next 製品機能紹介セッション (例: 5 Things Tableau Developers Should Know About Tableau Next, The End of Busywork: Agentic Prep, Modeling, and Viz, Custom AI Architectures: Fueling Agents with Tableau 等) では、その限りではなかった** — Salesforce エコシステムや関連アーキテクチャの話も自然に展開されていた
- つまり「Keynote / 横断メッセージング」と「個別 Next セッション」の間に温度差があり、それは TC が "Tableau" Conference という枠で立っていることに由来する構造的なもの
- これは批判ではなく、「Tableau / Salesforce 側の言いにくさ」への共感的な観察。**だからこそ**、その温度差を読み取れる側のユーザーが、自分から境界を引き直していく必要がある (→ 論点D への架け橋)

### 論点C: 「Architect」を本気で実現するには AI/Agent 側でも境界拡張が必要

- プロンプトに閉じない世界の語彙を持つ必要:
  - **Skills** (Claude Skills、Anthropic の流儀)
  - **ハーネスエンジニアリング (狭義/広義)** — どの情報を保持・取得・提示するか、というLLMシステムの周辺コードの設計
  - **コンテキストエンジニアリング** — どの文脈を注入するか
  - **Managed Agents** — 自律的に動くエージェントの設計と運用
- Claude / OpenAI のリリース・アナウンスを一定見ること
- 業界全体の根拠 (Tristan Handy "Five things I believe about the future of analytics", 2026-04-19):
  - **Thing 1**: アナリストはテクニカル化している (CLI / IDE への移行)
  - **Thing 4**: エージェント発起クエリが人間発起クエリを超える (12ヶ月以内)
  - **Thing 5**: Stanford論文 *Meta-Harness* — ハーネスを変えるだけで6倍の性能差。ドメイン特化ハーネスが汎用ハーネスを大きく超える
- そして Tristan Handy "BI's Second Unbundling" (2026-05-03) — BI がフロントエンドエンジニアリング化していく流れ
- 「Architect」を本気でやるならBIや可視化より先にある領域 (これらの語彙) に踏み込まないと、Agentic は設計できない

### 余談E: 「Tableau MCP で何ができるの?」「AIで何ができるの?」と聞かれたら

現地・SNS の振り返りコメントで「Tableau MCP が何ができるのかもっと知りたい」「AI がどのようなことができるのかもっと知りたい」という声を散見した。これに対して伝えたい2点:

**(1) 一次情報を読む。読みづらければ AI と対話しながら読む**
- Tableau MCP に関しては公式ドキュメントが既にある。まずそれを当たる
- AI 一般の話も、OpenAI / Anthropic などのブログ・リリースが一次情報
- 英語だから / 技術的だから読みづらい、というのも今は障害にならない。Claude や ChatGPT に読ませて対話的に理解する方法がある (むしろこれをやらないのは勿体ない)

**(2) 「AI で何ができる / できない」という観点は基本的に捨てて良い**
- 代わりに「**どうさせるか**」「**できるようにするために何を設計するか**」という、実現可能性を模索し設計する思考に早く切り替えた方が良い
- Keynote でも「89%が AI のデータ利用不正確性に悩んでいる」系の数字が出ていた。あれは現代では基本的に設計の問題だと自分は思っている (モデルの能力の問題ではなく、ハーネス・コンテキスト・Skills・データ整備の問題)
- この設計観点を持つには、今の AI Agent 動向 (OpenAI / Anthropic のブログ・リリース等) を一定見ておいた方が良い

これは論点D (生息地を変える) の具体的アクション示唆としても機能する。

### 論点D: 結局「生息地を変える / 広げる」話に帰着する

- これは Tableau 社が促してくれる種類の話ではない
- Tableau Community に閉じない、AI実践コミュニティ・データエンジニアリングコミュニティ・他ベンダーエコシステムへ
- 業界全体がこの方向に動いているのだから、Tableauユーザーだけが追いつかないわけにはいかない
- アイデンティティの再定義: 「Tableauユーザー」から「データを使って意思決定をデザインする人」へ

### TC26 全体への感想 (個人的な振り返り、3点)

本論の議論からは少し離れて、TC26 というイベントそのものを浴びての率直な振り返り。

**1. ユーザーとの交流は文句なしに最高だった**
- Datafam は常に最高で、元気と刺激を与えてくれる
- このネットワークには値段がつけられない。疑いようがない
- TC に来る一番の理由はここにある、と改めて思う

**2. コンテンツや雰囲気については正直、疑問が残った**
- Agentic Analytics Platform を目指すと宣言する製品のカンファレンスなら、Keynote 等の Tableau 主導コンテンツに、もっと Agentic の vibes を感じたかった
- 今は技術的な観点が、意図的に隠されているように見える (→ 論点B-補で書いた「場の制約への観察」の体感そのもの)

**3. 自分の中で二層に分かれる感覚があった**
- **長年の Tableau ユーザーとしての自分**は、無限大に楽しめた。そこに大きな興奮があった
- 一方で**、Agentic Analytics を模索し悩む自分**としては、もっとコアな話題に触れたいと思った
- そのコアな議論を求める自分は、実は Salesforce 系のイベントを探した方が良いのかもしれないし、Snowflake / dbt / Claude といった別の製品コミュニティも模索すべきなのかもしれない
- これは前段 (論点D) で語った「生息地を広げる」の体感そのもの。自分自身が、TC26 を浴びてその必要性をリアルに感じた

---

## 引きたい根拠（一次情報）

### TC26セッション（現地体験）
- Tableau Keynote 2026: Go from Seeing to Doing with Agentic Analytics (Main Keynote)
- Tristan (Handy) のセッション (TC26 セッションカタログ ID: 1766152403453001fSLS)
- Adrian のセッション = **5 Things Tableau Developers Should Know About Tableau Next** (Community / Intermediate / Theater, 2026-05-07 12:10-12:30 PDT)
- 10x Your Tableau Workflow with AI and Claude Code (Community / Advanced)
- 論点B-補 の根拠として個別 Next セッション群: The End of Busywork: Agentic Prep, Modeling, and Viz / Custom AI Architectures: Fueling Agents with Tableau / 5 Things Tableau Developers Should Know About Tableau Next 等
- 必要に応じて: Beyond the Boundaries of Tableau / We Broke Tableau MCP (In a Good Way) / The Action Layer: CyberAgent's Roadmap to Agentic BI

### Tristan Handy 記事 (dbt Labs / The Analytics Engineering Roundup)
- **BI's Second Unbundling** (2026-05-03) — BIがフロントエンドエンジニアリング化、Knowledge as Code、ベンダー横断
- **Five things I believe about the future of analytics** (2026-04-19) — Thing 1/4/5 を特に引きたい

### 周辺の発表（時系列で背景を補強）
- 2025年6月: Agentforce 3 + ネイティブMCP対応
- 2026年4月15日: Salesforce Headless 360 発表 (TDX 2026)
- 2026年4月: Tableau Next MCP GA
- 2026年5月初旬: TC26 — この一連の流れの「結実」

---

## ストーリーライン素案

1. **導入** — TC26 現地参加、Keynote録画も含めて浴びた感想であることの宣言。要約や機能紹介ではないこと、自分が AI / Agent の世界に取り組んできた立場から書いていること (※明示はせず、後段の論じ方で滲ませる)
2. **Keynote の核 (簡潔に)** — 「Tableau as agentic analytics platform」と「3つの Architect」というメッセージ。これは妥当で歓迎する
3. **ただし「Architect」を本気で受け取ると** — Tableau の内側に閉じたキャッチアップでは足りない、境界を両側から広げる必要がある (論文の宣言)
4. **Tableau 側の境界拡張** — Tableau Classic の構造的限界、Tableau Next の不可避性、Next も Next で完結しない (Headless 360 / MCP / Agentforce)。TC26 の Tristan / Will / Adrian / Claude Code 系セッション体験から立体化された感覚として
4.5. **場の制約への観察 (共感的に)** — Tableau / Salesforce 側も本当は Next やアーキテクチャの話を Keynote レベルでもっと前面化したかったのでは? という印象。ただし TC という場の制約 (既存 Tableau ユーザーへの配慮) で抑制していたように見える。個別の Next セッションでは抑制が効いていなかったことが、その温度差の証左。だからこそ「ユーザー側が境界を引き直す」必要性 (→ 論点D) に接続する
5. **AI / Agent 側の境界拡張** — プロンプトに閉じない、Skills / ハーネス / コンテキストエンジニアリング / Managed Agents / Claude や OpenAI の動向。Tristan Handy "Five Things" の Thing 5 (ハーネス) をハイライトして引く。Thing 1 (テクニカル化) で接続
6. **業界全体の文脈** — "BI's Second Unbundling" を引き、Tableau 単独の話ではなく業界全体がアナリストを上流・テック側に押し上げている流れの一断面であることを示す
7. **結論的に: 生息地は Tableau の外に広がる** — Tableau 社が促してくれる話ではない、ユーザー側が境界を引き直していく話。アイデンティティ再定義
7.5. **余談: 「もっと知りたい」へのヒント** — 「Tableau MCP / AI で何ができるか?」というコメントに対し、(1) 一次情報を読む / AI に読ませて対話する (2) 「何ができる」より「どうさせるか / 何を設計するか」に思考を切り替える、という2点を示す。Keynote の "89% が AI 不正確性に悩む" 系の数字は設計問題、という観点も入れる
8. **TC26 全体への感想 (3点)** — (1) Datafam・ユーザー交流は文句なしに最高 (2) Tableau 主導コンテンツの Agentic vibes 不足、技術観点が意図的に隠されて見える (3) Tableau ユーザーとしては無限大に楽しめた / Agentic 模索者としては別コミュニティ (Salesforce / Snowflake / dbt / Claude) も探したい
9. **最後に** — Tristan のセッションから受けたインスピレーション、自分は「初心者に戻ることを楽しむ」姿勢で行きたい。読者にも問いかける形で締める。最後はサインオフ (voice-style に従う)

---

## 文体・トーン

- yarakawa.com の通常文体 (一人称「自分」、敬体だが柔らかい、ヘッジ多用、「」での強調)
- 批判記事ではなく「歓迎しつつ問いかける」スタンス
- 構造的な議論は厳しく書きつつ、断定は避ける ("〜のように見えます" "〜のような気がしています" 等)
- 「AI実践者である自分」を冒頭で宣言しない (にじませる)
- 立場は「視点・引き寄せる文脈・引用する記事」の中で自然に伝わる構造にする

---

## 未整理・要検討

- **記事の長さ** — 論点A〜D + B-補 を全部入れるとかなりの長さになる。可能なら1本で書く (yarakawa.com の通常記事はある程度長くてもOK)。長すぎる場合は「論点D は次回」のような形で分割も検討
- **「Architect」の3分類** — Knowledge / Decisions / Agentic の3つを記事内で紹介するか、それとも「Architect という言葉」で抽象化するか。3つの図解はあると親切だが、Keynote画像の使用権限を要確認
- **Headless 360 / Tableau Next MCP の図解** — 文章だけだと伝わりにくい可能性。簡易な概念図 (4層構造など) を自前で用意するかも
- **過去記事との接続** — yarakawa.com で「Vibe Analytics」「アナリストの役割拡張」系の過去記事があれば、自己参照したい
- **「ハーネスエンジニアリング」の説明深度** — 読者の AI 語彙レベルに応じて、ハーネス/コンテキストエンジニアリングのminimum解説が必要かも。深入りせず、Tristan の "Five Things" 記事と Stanford論文 *Meta-Harness* へのリンクで補強する形が現実的
- **英語LinkedIn投稿との関係** — 既に LinkedIn 英語版を投稿済み。日本語ブログ記事は単純な翻訳ではなく、ロングフォーム化・構造的議論を加えた別物として書く

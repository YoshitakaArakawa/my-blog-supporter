# 参考資料

記事テーマ: なぜ自分が AI Agent に楽しく意欲的に取り組めるのか／どう向き合うか／何を AI に任せるべきか、という価値観。加えて「人に推薦する動機・インセンティブをどう伝えればいいか分からない」「結局は文化でゴリ推すしかないのか」という問い。
導入方針: これはあくまで自分の考え方であり、読者それぞれが自身の向き合い方・価値観を身につけるとよい、というスタンスを明示する。

---

## 1. Moving Up the Stack — Analytics Engineering（Jason Ganz, dbt roundup）
URL: https://roundup.getdbt.com/p/moving-up-the-stack-analytics-engineering
公開日: 20260405（ページ表記 "Apr 05, 2026"）
取得日: 20260612（WebFetch 要約ベース／引用は要約からの再引用、原文照合は未確認）

### 主旨
AI エージェント時代における analytics engineer の役割変化。自動化は職を奪うのではなく、より創造的で価値の高い仕事へのシフトをもたらす。

### 主要論点
- dbt 創業時（2016）からの中核価値観: チーム全員が「自分の仕事を置き換えるプロセス」を作るべき。それは脅威ではなく成長機会。
  - "doing so creates growth opportunities for the individual and the team"
- 著者の実体験: 手作業の SQL 作成 → 自動化。「積み上げたスキルが全部自動化された。でも自分はより価値が高くなっていた」
  - "Years of accumulated skills...all of it, automated. But...I had become more valuable."
  - 仕事がレポート作成 → データドリブンな実験へと質的に変化。
- 現状の変化: Hex は新規セルの 50% 超がエージェント生成、dbt MCP サーバーは月 40% 成長。
- 残る問い: "What does an analytics engineer actually do in a world where AI writes SQL?"
- 人間が担うべき役割: AI エージェントの管理・開発、制度的知識（institutional knowledge）の保全、組織横断の変化管理。
- キーメッセージ: "The goal of moving up the stack is not ominous...It's to empower them, to allow them to solve creative problems in new ways."
- コメント欄（Salim Kaplan）: 単なる技術導入でなく、組織全体の意識変革＝企業文化の転換が成功の鍵。

### 本テーマとの接続
- 「自動化しても自分はより価値が高くなった」= なぜ楽しく取り組めるかの燃料（成長機会フレーム）。
- 「文化の転換が鍵」= 「結局は文化でゴリ推すしかないのか」の論点に真正面から触れる唯一の箇所。

---

## 2. 完全情報ゲーム vs 非完全情報ゲーム（takoratta はてなブログ）
URL: https://takoratta.hatenablog.com/entry/2026/06/03/120535
公開日: 20260603（URL のパス日付）
取得日: 20260612（WebFetch 要約ベース／引用は要約からの再引用、原文照合は未確認）

### 主旨
AI は「完全情報ゲーム」（ルールが閉じて正解が定まった領域）では人間を超えたが、「非完全情報ゲーム」（ルール・情報が不完全な現実）では人間の役割が残る。Google I/O 2026 で AI が 12 時間で OS を開発したデモを契機に、自らの予測を修正した思考過程の記録。

### 主要引用
- AI が強い領域: 「完全情報の側にあるのは、コンパイラや OS の中核のように、ルールや仕様がはっきりしていて、正解がほぼ定まっている領域だ」
- 人間に残る役割（完全情報領域）: 「人間に残るのは、ルールとゴールを正しく定義することだ」
- 人間に残る役割（非完全情報領域）: 「採否の意思決定と、倫理・境界線の管理」
- 倫理: 「AI が KPI の最大化のために勝手にダークパターンを生み出さないよう、誰かがガードレールを引く仕事」
- フロンティア: 「正解のない場所で、何を作るべきかを決めることだ。新しい用途を切り拓く領域」

### 著者の姿勢
- 謙虚な修正主義: 一年前の「AI には OS が書けない」発言を撤回。
- 分別ある楽観主義: 技術進化を直視しつつ「視座を引いて眺める」。
- 倫理的責任の強調: 能力拡張と同時に人間の「ガードレール」設定・価値判断が重要。

### 本テーマとの接続
- 「何を AI に任せるべきか」の境界線設計に直結（ルール/ゴール定義・意思決定・倫理ガードレールは人間、定型は委譲）。

---

## 3. AIで浮いた時間で何をする？ 2026春（konifar, Developers Summit 2026）
URL: https://speakerdeck.com/konifar/aide-fu-itashi-jian-de-he-wosuru-2026chun-number-devsumi
公開日: 20260220（スライド表記 "February 20, 2026"。発表は Developers Summit 2026, 20260218 想定）
取得日: 20260612（WebFetch 要約ベース／スライド本文の逐語照合は未確認）

### 主旨
AI は時間を「加速」させる増幅器。人間がそれに「適応」することが重要。浮いた時間の使い方を 4 テーマで提示。

### 4 テーマ
- 学習（まなび）: AI 出力の確認に時間をかけすぎる現状。浮いた時間を「AI をより使いこなす学習」へ（技術/ドメイン知識、AI の仕組み、PM、論理思考）。
- 盆栽（ぼんさい）: ニンゲン-AI 協業の前提整備（ワークフロー形式化、スラッシュコマンド整備、データ整備）を一気にでなく「毎日少しずつ育てる」＝複利。チーム資産として共有。
- 問い（とい）: 「シュッと作れる」ためのビルドトラップ化に警戒。ユーザー理解→課題定義→解決策のステップを飛ばさない。AI の説得力ある出力を疑い、理解できるまで聞き続ける。前提を問い直す。
- 禅（ぜん）: 加速度への焦り・FOMO への対処。余白を作り、自分の脳を経て思考するプロセスを残す。思考まで AI に外注しない。心と感性を磨く。

### 根本原則・キーメッセージ
- 「実は本質的には新しくない」— 変わったのは顕在化の速度だけ。専門職が学び続ける、ビルドトラップ回避は昔からの課題。
- AI は「増幅器」— ニンゲンの能力がなければ生産力は上がらない。
- 意思決定・最終責任は人間に。思考を外注しすぎない。
- 提言: 組織的に週休を増やす方向でなく、個々人が適応し続けることを楽しむスタンスへ。

### 本テーマとの接続
- 「適応を楽しむ」= なぜ楽しく意欲的に取り組めるかの燃料。
- 「問い・禅」= 思考を外注しない＝向き合い方の規律。
- 「個々人が各自のスタンスを」= 導入方針（読者それぞれが自分の価値観を持つとよい）と整合。

---

## 4. Tableau Conference 2026 レポート（Salesforce ブログ, Rintaro Sugimura）
URL: https://www.salesforce.com/jp/blog/jp-tableau-conference-report-2026/
公開日: 20260525（ページ表記「2026年5月25日」）
著者: Rintaro Sugimura（Tableau Japan, プロダクトマーケティングマネージャー）
取得日: 20260612（playwright 経由で本文取得。WebFetch は 403 のため）

### 主旨
「Agentic Analytics（エージェント型分析）」の時代に、分析が「見る（See）」から「意思決定を実行する」へ移る、という Tableau の世界観。中心メッセージは「AI にできないことが1つある＝分析への"信頼"を作ること」。

### 主要論点・引用
- 信頼は人が作る: 「人が Tableau を開き、ダッシュボードや指標を信頼するのには理由がある。誰かがその正しさを担保しているからだ」（CPO サウサード・ジョーンズ）。Join の正しさ、KPI 定義の統一、集計ロジック等の「見えない努力」。
- AI の限界: 「89% のリーダーが、不正確または誤解を招く AI の出力を経験している」。背景は AI が企業固有の指標定義・業務文脈を理解できないこと。"Data alone is not enough"。
- 知識(Knowledge)が競争優位: Metrics / Data logic / Calculated Fields / Published data sources / Prep flows / Business preferences。DataFam が20年で築いた3300万超のセマンティック資産＝AI 時代の競争優位の源泉。Knowledge Graph は既存資産を AI が推論できる形へ再活用する発想。
- 二層構造: Decision Engine（Actions・Insights）＋ Knowledge Engine（Semantics・Data）。
- 「見る」から「実行」: 「This era is no longer about insights decoupled from actions.」 デモ（架空企業 Bolt Bikes）では需要予測→「500台を西海岸へ移送すべき」推奨→実行までエージェントが自動化。
- 場所の変化: 分析は「見に行くもの」から「仕事の流れ（Slack/Teams/Salesforce）の中で使うもの」へ。ただし「ダッシュボードが不要になる話ではない」。目的に応じて使い分け。

### Decision Framework（画像 img06）※本記事で言及したい図
画像 URL: https://www.salesforce.com/jp/blog/wp-content/uploads/sites/10/2026/05/jp-tableau-conference-report-2026-img06.jpg
（第三者素材のためリポジトリには取り込まない。20260612 に一時取得して内容のみ確認。記事掲載時は出典明記＋直リンク/引用の可否を要確認）
「A simple way to decide what to build」= 何を作るべきかの2×2マトリクス:
- 横軸: Ad Hoc ←→ Repeated／縦軸: Signal（下）←→ Explanation（上）
- Agent（Ad Hoc × Explanation）: "Ask follow-up questions and understand why" 単発で「なぜ」を掘る
- Dashboard（Repeated × Explanation）: "Explore trends and compare performance" 繰り返し探索
- Metric（Repeated × Signal）: "Track performance and get alerted on change" 繰り返し監視
- It Depends ❓（Ad Hoc × Signal）: "Not everything needs to be built" 作らない選択

### 本テーマとの接続
- 章 B「何を AI に任せ何を握るか」を BI の道具選びに落とした実例。特に「It Depends＝作らない選択」は konifar の問い・ビルドトラップに直結。
- 「ダッシュボードは死なない、ただし Agent が勝つのは単発×説明の象限」という、BI is dead への nuance ある応答。Agentic Analytics 時代の BI 考として使う。
- 「信頼・知識は人が担保する」は、takoratta「人間がルール/ゴール/倫理を握る」と整合し、C「専門性の希釈」への反証材料（人が積んだ知識資産が AI の前提になる）。

---

## 5. 追加採用した参考資料（原則 2025年9月以降）
本文・日付は 20260612 に確認（取得手段は WebFetch、403 のものは playwright）。各記事の主張の逐語照合は未確認。

| 著者/媒体 | URL | 言語 | 公開日 | トピック圏 / 接続 |
|---|---|---|---|---|
| Jason Ganz（dbt Roundup）「The computers talk to us now」 | https://roundup.getdbt.com/p/the-computers-talk-to-us-now | 英 | 20260510 | BI/データ実務者視点。「置換でなく role transformation」。章C/Dに接続 |
| 及川卓也（takoratta）「アイデンティティシフトを生きる」 | https://takoratta.hatenablog.com/entry/2026/05/22/083000 | 日 | 20260522 | AI 時代の人間の付加価値・アイデンティティ。導入/章Cに接続 |
| Tableau 公式「Dashboards Aren't Dead, They're Evolving」 | https://www.tableau.com/blog/dashboards-arent-dead-theyre-evolving-and-so-is-tableau | 英 | 20251211 | 「BI is dead」へのポジティブ再定義＝人間のガバナンス/意思決定層へ。※ベンダーのポジショントーク前提。章E/B |
| DataCouch「Why Tableau Alone is Dying: Agentic AI…」 | https://datacouch.io/blog/tableau-vs-agentic-ai-analytics-transformation/ | 英 | 20260311 | 「飲まれる側」言説の代表サンプル＝反論の的。章E。※媒体/著者の知名度は未確認 |
| Inc.（Andrea Olson）「How AI Automation Is Quietly De-Skilling White-Collar Workers」 | https://www.inc.com/andrea-olson/how-ai-automation-is-quietly-deskilling-white-collar-workers/91316067 | 英 | 20260323 | 「自動化＝専門性の希釈/脱スキル化」懸念の正面論。章Cが応答すべき相手 |
| メルカリ AI 推進体制の分析（AI Native, 田中慎） | https://www.ai-native.jp/blog/mercari-ai-organization-structure | 日 | 20251002 | AI を組織文化として広める実例（100名タスクフォース）。章Dに接続。※媒体の知名度は未確認 |
| DeNA Engineering「育てるほど楽になる AI 開発体制を作っている話」 | https://engineering.dena.com/blog/2026/01/ai-driven-develop/ | 日 | 20260106 | AI 導入の定着・前提整備の実務知見。章B'（盆栽）/Dに接続 |
| サイボウズ Inside Out「AIエージェントと協業するチームの始め方」 | https://blog.cybozu.io/entry/2026/03/02/080000 | 日 | 20260302 | enabler としての AI を「協業相手」に。章B/Dに接続 |

### 採用候補（2024年以降・普遍的内容として要判断）
原則の 2025年9月 より前だが「普遍的なら 2024 以降まで許可」枠。採否はユーザー判断待ち。
| 著者/媒体 | URL | 言語 | 公開日 | 採用したい理由 / 留意 |
|---|---|---|---|---|
| Ethan Mollick「I, Cyborg: Using Co-Intelligence」 | https://www.oneusefulthing.org/p/i-cyborg-using-co-intelligence | 英 | 20240314 | Centaur/Cyborg フレームは「何を任せ何を握るか」の理論的背骨。古いが普遍的・原典格。採用推奨 |
| Benn Stancil「No, really, everything becomes BI」 | https://benn.substack.com/p/no-really-everything-becomes-bi | 英 | 20250509 | BI が AI に飲まれる言説の批評。2025前半。BI 論として普遍寄り |
| Simon Willison「How I use LLMs to help me write code」 | https://simonw.substack.com/p/how-i-use-llms-to-help-me-write-code | 英 | 20250311 | 「人間が舵を握る使い方」の現場版。2025前半・ツール論なので陳腐化に留意 |

### 対象外（日付・性質の理由で不採用）
- Benn Stancil「BI is dead」 https://benn.substack.com/p/bi-is-dead — 20211015。AI 以前の構造論で、本記事の Agentic 文脈と前提が違う。歴史的文脈としてのみ言及可。
- CBT Nuggets「Why You'll Never Automate Yourself Out of a Job」 — 20170628。古すぎ。除外。
- konifar ブログ本体は AI 専用記事が確認できず（AI 論は登壇資料側）。Tristan Handy の個別記事は URL 未確認のため保留。深津貴之 fladdict（note）は媒体として有用だが、採用するなら 2025年9月以降の個別記事を選定してから。

---

## 横断メモ：本記事のオリジナリティの核
3 記事はいずれも「唯一解」でなく姿勢・向き合い方を語る点で足並みが揃う（導入方針と整合）。
ただし 3 記事とも「推薦の動機・インセンティブをどう"伝えるか"（how）」には踏み込んでいない。
dbt のコメント欄が「文化の転換が鍵」と触れるのみ。よって「どう伝えるか／結局文化でゴリ推すしかないのか」は本記事固有の問いであり、ここが最も掘る価値のある核になりうる。

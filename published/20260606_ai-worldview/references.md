# 参考資料

## 参考記事・ブログ
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| Scaling Managed Agents (Anthropic Engineering) | https://www.anthropic.com/engineering/managed-agents | Managed Agentsのアーキテクチャ解説。根本原理は「脳（Claude＋ハーネス）と手（サンドボックス＋ツール）の分離」。`The harness leaves the container`、ステートレスなハーネス、セッション＝context object、資格情報をサンドボックスから隔離、等。 | テーマ③の主柱。「脳・手・環境の設計が全て」を権威ある実装例で裏づける。Tableau MCP＝“手”の一部、と位置づける足場。 |
| 完全情報ゲーム/非完全情報ゲームでAIと人間の役割を分ける（takoratta / 及川卓也） | https://takoratta.hatenablog.com/entry/2026/06/03/120535 | Google I/O 2026でAIが12時間でOSコアを開発したデモを起点に、AIが得意な領域＝完全情報（ルールが閉じ正解が外にぶれない）、人間が握る領域＝非完全情報（制約とゴールの定義・採否の判断・フロンティア）と整理。 | **補足扱いに格下げ**（critique #01 指摘3／著者判断）。完全情報ゲームは背骨の看板にしない。残すなら支柱③で軽い概念紹介として一言触れる程度。背骨の実説明はドリフト＝盤面を閉じる（福島記事側）に寄せる。※「相互増幅(較正)」記事とは別物。 |
| エージェントハーネスとAIマネージドサービス（福島良典 / LayerX CEO） | https://note.com/fukkyy/n/n1d8fce44e67a | エージェントハーネスの定義（シェフ＝AI／調理場＝ハーネス）。長時間実行の「ドリフト問題」（終了条件の誤認・品質の過信・累積的ズレ）と、外部チェックリスト・視覚的検証・決定論的フックによる対処。 | **今回不使用**（著者方針）。記事はAIプロバイダー（Anthropic/OpenAI）の一次情報に引用を統一するため、シェフ/調理場の比喩・ドリフトの説明は Managed Agents（脳/手の分離）＋ Harness engineering（環境・意図・フィードバックの設計）に置き換えた。記事自体は良質、別記事では参照候補。 |
| AIエージェントの"ハーネス"に関わる混乱と私見（watany） | https://zenn.dev/watany/articles/d8b692bbca65a3 | ハーネスの**広義/狭義・内部/外部**の整理。内部ハーネス（狭義）＝LLMモデル以外の実装、作り手側（LangChain "Agent = Model + Harness"）。外部ハーネス（広義）＝AIにフィードフォワード/フィードバックを与える環境、使い手側が構築。著者は用語の混乱を指摘。 | **ライト引用**。本記事で「広義のハーネスエンジニアリング」と言う理由＝Tableauユーザーが整えるのは外部ハーネス（使い手側）だから、を一言補足する出典。Ch1で軽く差し込む。 |

## AIエージェント領域の標準化（展開1の根拠リンク・2025年8月以降）
「生成AIへの向き合い方の基準点＝ハーネス（環境/意図/フィードバックループ）を設計すること」が、この半年でAIエージェント議論のメインになった、を裏づける**一般公開ブログ/エッセイ**の一次ソース（開発者ドキュメント・SDKリファレンスは外す）。「人間が考えるのは設計」の最強の援軍は OpenAI のハーネスエンジニアリング記事。日付は要確認を含む（リンク先で確認可）。

| タイトル | URL | 記事との関連 | 日付（要確認） |
|---|---|---|---|
| Harness engineering: leveraging Codex in an agent-first world（OpenAI） | https://openai.com/index/harness-engineering/ | **本記事の核の援軍**。「Humans steer. Agents execute.」「仕事はコードを書くことから**環境を設計し・意図を規定し・フィードバックループを作る**ことへ」＝脳・手・環境＝人間が考えるのは設計。AGENTS.md/docs構成にも言及（Ryan Lopopolo） | 2026-02-11 |
| Scaling Managed Agents（Anthropic Engineering、上掲・支柱③の主柱と同一） | https://www.anthropic.com/engineering/managed-agents | 「脳（Claude＋ハーネス）と手（サンドボックス＋ツール）の分離」。AIエージェント議論のメインがハーネス設計に寄っている傍証 | 2026 |
| Introducing Agent Skills（Anthropic） | https://www.anthropic.com/news/skills | スキル＝指示・スクリプト・リソースを動的ロード（脳の整備）。オープン標準として公開 | 2025-12-18 |
| Effective context engineering for AI agents（Anthropic Engineering） | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | コンテキスト設計＝環境/脳の整備が規律として確立 | 2025後半 |

## 自分の発信・資料
| 資料 | 場所 | 概要 | 記事との関連 |
|---|---|---|---|
| Tableau Now! 登壇資料（自作スライド、Public表記あり） | references/TableauNow_荒川発表.pdf | p15「自律＝AIがTableauデータを起点に自律分析」／p16「Tableau MCP×Coding Agent」実リポ構成（.agents/skills, rules-bank, AGENTS.md）／p17「問いと判断に集中」／p18「ドメインエキスパート＝業務知識がAI分析品質を決める」／p19「3アプローチ：補助=GPTs/RAG・統合=Extensions・自律=MCP+エージェント」 | **一次資料**。p19＝「1.5年前フレームvs今」の骨格。p16＝Tableauハーネスの具体例（批判4を埋める）。p17＝人間の役割＝問いと判断（批判1・3を埋める）。p18＝環境・コンテキスト設計の核。 |
| ブログネタのメモ（X / @yoshi_datavizjp, 2026-05-29 JST） | （X投稿） | ①Defend/Extend/Upend ②ハーネスを整えた人と整えてない人で見ている世界が違う ③脳と手と環境（Managed Agents引用）④話を聞くより手を動かす | 本記事のタネ。今回は②③を主、④を結びに。①は不使用。 |

## 参考資料（ローカル・追加候補）
| ファイル | 概要 | 記事との関連 |
|---|---|---|
| Tableau MCPユーザー会のデモ例・スクショ等（あれば） | references/ に追加 | 「1.5年前のフレーム」の具体描写に使える |

## 関連する過去記事（本リポジトリ output）
| 記事 | 場所 | 関連 |
|---|---|---|
| AI活用（テーマ） | output/20260331_ai-utilization/ | 過去のAI活用論。重複を避け、今回は「ハーネス込みで考える」に焦点を絞る |
| TC26 所感 | output/20260512_tc26-impression/ | Tableau Conference文脈。Tableau×生成AIの読者層が重なる |

## 今回 範囲外（記録）
| 対象 | 理由 |
|---|---|
| 及川卓也「相互増幅 ― AIに考えを明け渡さないための較正」 | ユーザー指示により本件では不使用。較正/認知的降伏の軸は別記事候補（※同著者の「完全情報ゲーム」記事は採用、混同しない） |
| 「AIは増幅器」「ソフトウェア品質特性をスケール」系のRT | 同上。本記事は「②ハーネスで見える世界が変わる」に一本化 |
| Defend / Extend / Upend（メモ①） | 今回の背骨から外す。必要なら別記事 |
| サブエージェント設計 | 話を簡単にするため今回は単一/メインエージェントに焦点。別記事候補 |
| AIマネージドサービスの商材論・内製vsマネージド（福島記事の後半） | ビジネス論でB寄り。本記事の軸外 |

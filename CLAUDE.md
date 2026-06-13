# My Blog Supporter

yarakawa.com のブログ記事を対話的に執筆するプロジェクト。

## ワークフロー

1. `/brainstorm [テーマ]` - テーマの議論・言語化 → brief.md, references.md
2. `/deepen [テーマ]` - 思考を掘る・問い直す（動機・主張・コアメッセージ）→ thinking.md
3. `/critique [テーマ]` - 掘った主張に批判レビュー（想定反論・前提の穴）→ critique/critique_NN.md
4. `/outline [テーマ]` - 記事の見出し構成・展開順序・資料接続を著者と対話で設計 → outline.md
5. `/check-drift [テーマ] outline` - thinking→outline の点検（縮約で背骨が落ちていないか）→ drift/drift_NN.md
6. `/write [テーマ]` - 記事執筆・推敲 → draft.md (+ 空白 draft_user.md)
7. `/check-drift [テーマ] draft` - outline→draft の点検（散文化で背骨が落ちた／無根拠に足したか）→ drift/drift_NN.md
8. ユーザーが draft_user.md を執筆 — AI版を参考に、独自の言葉・構成で記事を書き上げる
9. `/review-author-draft [テーマ]` - 著者の下書き(draft_user.md)を初見の読者視点で編集レビュー → review/review_NN.md
10. `/compare-drafts [テーマ] [公開URL]` - draft.md と公開Web記事（原則／無ければ draft_user.md）を比較 → comparison/comparison.md (改善FB)

**2〜3 はループ。** `/brainstorm`（発散）⇄ `/deepen`（掘る）を往復する。**`/critique`（叩く）は `/deepen` の既定の後続工程**として自動で走る ― deepen が thinking.md を書いたら、著者に戻す前に critique を自動実行し、指摘のうち**著者固有でないもの**は AI が自答してループを回し（thinking.md に `[AI回答]` で provenance を残す）、**著者固有のもの**（体験・立場・固有の判断が要る点）だけ著者に戻す（content-typed gate、critique 最大3周のキャップ付き）。「AI の自走を入れつつ、記事の中身が静かに AI のものにすり替わるのを防ぐ」設計＝記事の主張「問いと判断は人間が握る」の工程への適用。掘る・叩く工程は thinking.md を更新し続ける（最新が正）。critique は時系列で残す（critique/ 配下に連番）。

ループが落ち着いたら 4 の `/outline` で構成を一度固める。

`/deepen` は `/brainstorm` の次に進む**標準工程**。brief.md だけで主張・コアメッセージが固まることはまずないので、原則 `/brainstorm` → `/deepen` と掘ってから書く（`/brainstorm` → `/write` の直行はしない）。`/critique` は `/deepen` 内で自動実行されるが、単独で叩き直したい時は手動でも呼べる（著者が「critique 不要」と明示した時のみ deepen はループを飛ばす）。`/outline` 以降は任意。`/outline` は構成を別ファイルで固めたい時に使う（thinking.md だけで write に進んでもよい）。`/check-drift` は、**AI が成果物を生成する工程（`/outline`・`/write`）の直後それぞれに挟む承認ゲート**。`/outline` 後に `/check-drift outline`、`/write` 後に `/check-drift draft` を回し、書いた当人から切り離した fork が「進む／前段に戻して直す」の判断材料を著者に返す（`/outline` を飛ばす運用なら `draft` の1点だけ）。2点で挟む理由＝ドリフト発生箇所（縮約か散文化か）の局所化は check-drift スキルを参照。`/simulate-readers`（初見読者シミュレーション）は **`/write` の推敲工程の既定の一部**として fork 実行される（単独でも呼べる）。離脱点・SNS/コメント欄の反応・行動変化・炎上経路の予測を推敲材料として返し、指摘の採否は「主題を深めるか、鎧を増やすだけか」で仕分ける（防御的挿入の累積はトーンを防御文書化するため、鎧系は本文に入れずドラフト冒頭の引き継ぎメモに残置。詳細は write スキル）。`/review-author-draft` も任意。公開前に著者の下書きを初見の読者視点で編集レビューしたい時に使う。`/compare-drafts` も任意。AI生成を次回以降ユーザー版に近付けたい時に実行する。**critique＝主張の批判（thinking.md）、check-drift＝AI成果物の段階間整合（前段から落とした／湧いた）、simulate-readers＝読者の受け取られ方の予測（AI生成ドラフト）、review-author-draft＝原稿の編集レビュー（draft_user.md）、compare-drafts＝AI版↔著者の公開記事（原則／無ければ draft_user.md）の比較**、と役割が分かれる。compare-drafts は公開 URL をチャットで受け取り、公開記事を取得して比較する（取得スナップショットは comparison/published.md に保存）。

`/critique`・`/review-author-draft`・`/check-drift`・`/simulate-readers` は `context: fork`（隔離コンテキスト）で動く。会話履歴を持たないため対象をファイルから読み、指摘を連番ファイルに書き出して実行サマリだけメインに返す。critique は thinking.md を読み critique/critique_NN.md へ。review-author-draft は draft_user.md を読み review/review_NN.md へ。check-drift は前段の正（既定では thinking.md＋outline.md＋references.md）と target（draft.md）を読み比べ drift/drift_NN.md へ。simulate-readers は AI生成ドラフト（既定 draft.md）と brief.md の読者像を読み readers/readers_NN.md へ。「引き出す deepen」と「叩く critique／整合を診る check-drift／読者として読む simulate-readers」をコンテキストごと分離する設計。

## ディレクトリ構成

```
output/{yyyymmdd}_{テーマ}/           記事ごとの出力（日付プレフィックス付き）
  brief.md                           テーマブリーフ（/brainstorm 生成、最新が正）
  brief_deepen.md                    主張を立てた版のbrief（任意、対話中に手動作成）
  references.md                      参考資料の整理（/brainstorm 生成、/deepen /outline で追記）
  references/                        記事固有の raw 参考資料
  thinking.md                        掘った思考・主張メモ（/deepen 生成、ループで更新／最新が正）
  critique/                          批判レビューの記録（/critique 生成、ループで時系列に蓄積）
    critique_01.md                   ループ1回目の指摘
    critique_02.md                   ループ2回目の指摘 …
  outline.md                         記事の見出し構成・資料接続（/outline 生成、最新が正）
  draft.md                           記事本文（/write 生成、AI版）
  drift/                             段階間ドリフト点検の記録（/check-drift 生成、点検ごとに時系列に蓄積）
    drift_01.md                      1回目の点検（落とした背骨／無根拠 add）
    drift_02.md                      2回目の点検 …
  readers/                           初見読者シミュレーションの記録（/simulate-readers 生成、実行ごとに時系列に蓄積）
    readers_01.md                    1回目の読者反応予測（離脱点・反応・行動変化・炎上経路）…
  draft_user.md                      記事本文（ユーザー推敲版。/write 完了時に空白で作成）
  review/                            下書きレビューの記録（/review-author-draft 生成、推敲ごとに時系列に蓄積）
    review_01.md                     1回目のレビュー指摘
    review_02.md                     2回目のレビュー指摘 …
  comparison/                        AI版とユーザー版の比較（/compare-drafts 生成。過去記事は直下 comparison.md のままでよい）
    published.md                     公開Web記事の取得スナップショット（原則の比較対象。毎回上書き／URL 取得時のみ）
    comparison.md                    比較・改善FB

.claude/skills/write/references/     /write スキル付属の文体ガイド
  voice-style.md                     著者の文体・語り口・構造パターン・チェックリスト
                                     ルール17-21は AI 的傾向への対抗ガイド
```

## 参考資料の配置ルール

- **記事固有**: `output/{yyyymmdd}_{テーマ}/references/`
  Xスレッド転記、関連記事MD、データCSV等。記事ごとに集める raw 資料。
- **文体ガイド**: `.claude/skills/write/references/voice-style.md`
  /write スキルが文体一貫性のために参照する。

対応フォーマット:
- **PDF**（推奨） - テキスト・図表をAIが直接読み取れる
- **画像**（PNG, JPG, WebP） - 図表やスクリーンショット
- **テキスト**（.md, .txt, .csv） - データや原稿

## Web取得 (fetch-page スキル)

参考URLの内容取得は基本 WebFetch を使う。SPA/JSレンダリング必須サイトや、X (旧Twitter) ポストなどログイン必須のページは `fetch-page` スキル (playwright-cli ラッパー) を使う。

**Xの利用は会話セッション単位でログイン**: 認証Cookieはディスクに残さない方針。ClaudeがXのURLを取得しようとした時、未ログインを検知したらClaude自身が `playwright-cli -s=x open https://x.com/login --headed` を実行してブラウザを起動する。ユーザーは出たウィンドウで手動ログインし、「ログインした」とClaudeに返答するだけで良い。

会話終了時に `playwright-cli -s=x close` で Cookie ごと消える。

`.playwright-cli/` は作業ファイル置き場 (gitignore済み)。

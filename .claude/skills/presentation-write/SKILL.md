---
name: presentation-write
description: 登壇資料の中身を、著者と対話しながら Markdown で作る。主催の規定（event.md）、段ごとの流れ（storyline.md）、見出しだけで話が通るゴーストデッキと台詞（deck.md）を書く。登壇・発表・LT の資料を作りたい、主催の規定を整理したい、話の流れを組みたい、スライドの見出しや台詞を考えたい、持ち時間に収まるか見たい、と言われた時に使う
argument-hint: "[テーマ] [event|storyline|deck](任意)"
---

# 登壇の場・組む・書く

core.md と thinking.md を土台に、登壇の中身を **場 → 組む（任意）→ 書く** の順で Markdown に固める。見た目は組まない。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が工程 `event` / `storyline` / `deck`。どちらも任意）。`$OUTPUT_DIR` は `output/{yyyymmdd}_{テーマ}/` で、既存フォルダを優先する（決め方は core と同じ）。

## 登壇で守ること

- **印**: 著者の言葉は `（著者）`、AI の言い回しは `（仮）`（見出しは末尾に付ける）。AI が `（著者）` に替えるのは、著者が会話でその言葉を採ると言った時だけで、ℹ️ メモの著者判断に日付つきで残す。著者が口で言ったことから AI が言い回しを起こした台詞は `（仮）` のまま、`メモ: 著者の口述（{yyyymmdd}）` と書く（不変条件6）
- **言葉の規範は [references/deck-spec.md](references/deck-spec.md)**。ブログの voice-style.md は当てない

## 起動と現在地

起動したら、まず `$OUTPUT_DIR/core.md`・`$OUTPUT_DIR/thinking.md` を読む。無くても、場（event.md）だけは先に進めてよい。組む・書くに進む前に、どちらかが無い時、または core.md の `形式:` が登壇でない時は、`Skill` ツールで `core` を起動して戻す。

読めたら **現在地を3行で報告し、必要な問いを返す（無ければ返さない）**。

- 核: core.md の問いと形式
- 進捗: event.md・storyline.md・deck.md の有無。deck.md があれば枚数、`秒:` の合計と持ち時間、`（仮）` の残り
- 未決: thinking.md か deck.md 冒頭の ℹ️ メモの未決から1件

工程は2つ目の引数があればそれにする。無ければ、event.md が無ければ **場**、著者が流れを組みたいと言えば **組む**、見出しや台詞に進みたいと言えば **書く**。

## 工程1: 場

主催の規定を `$OUTPUT_DIR/event.md` に書く。主催の資料（案内の PDF・メール・フォーム）は `$OUTPUT_DIR/references/` に置き、そこから AI が起こし、著者が確かめる。骨格と書き方は [templates/event-template.md](templates/event-template.md) にある。規定と講演概要の約束が食い違う時（例: 概要は「デモを見せる」と約束し、提出はデモなし）は、ℹ️ として著者に返す。

## 工程2: 組む（任意）

段ごとの流れ（何を言い、観客がどうなるか）を `$OUTPUT_DIR/storyline.md` に書く。何を・どの順で語るかは著者が決める。手順と書式は [references/phase-storyline.md](references/phase-storyline.md) にある。LT のように短い登壇は、この工程を飛ばして deck.md から始めてよい。

## 工程3: 書く

`$OUTPUT_DIR/deck.md` を書く。書式は [references/deck-spec.md](references/deck-spec.md) にある。

**内部の呼び出し順**（著者はこの順序を意識しなくてよい）:

1. 見出しだけの並び（ゴーストデッキ）を先に出す。著者が並べ替え・削除・言い換えをして固める
2. 各スライドの `役割:`・`見せる:`・`秒:`・`核:` と台詞を埋める。台詞は `（仮）` で起こす
3. lint とストーリーボード（hook が deck.md を書くたびに回す。手で回すなら `node scripts/lint-deck.mjs` と `node scripts/render-deck.mjs` に deck.md を渡す）。NG がゼロになるまで直す
4. 自己点検: 見出しだけで話が通るか、1枚1主張か
5. 隔離レビュー: `Skill` ツールで `review` を、引数 `"{日付付きのフォルダ名} audience"` と `"{日付付きのフォルダ名} drift deck"` で起動する
6. 指摘を反映して著者と磨きこむ
7. 著者がゴーストデッキ（deck.md）を承認したら、書く工程を終える

著者に返すのは、deck.md とストーリーボード（preview サーバー経由で `/output/{登壇}/preview/deck.html`）へのパスと3行の要約（流れ／時間と lint の残件／フィードバックがほしい箇所）。全文を会話に貼らない。進捗と、会話で決まった著者判断は deck.md 冒頭の ℹ️ メモに持たせる。

## 他スキルへの受け渡し

| 著者の発言 | 渡す先 |
|---|---|
| 「Google スライドに組んで」「スライドに反映して」 | 未実装。著者にそう伝えて止まる |
| 「図を作って」 | `/illustrate`。既定はブログ用なので、出力先 `$OUTPUT_DIR/figures/` とスライドに貼る大きさを指定して呼ぶ |

## セッションの区切り

storyline.md の確定後と、deck.md の初回提示後は、新しいセッションで続けるかを著者に提案する。提案の前に、会話でだけ決まったことが core.md（改訂行）・thinking.md・storyline.md・deck.md 冒頭の ℹ️ メモに書かれているかを確かめる。引き継ぎプロンプトは会話にコードブロックで出し、`/presentation-write {テーマのフォルダ名} {次の工程}` の起動行と次にやること1行に絞る。新しいセッションはリポジトリのルートで開く（worktree には gitignore の `output/` が無い）。

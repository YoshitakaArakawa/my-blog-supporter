---
name: presentation-write
description: 登壇資料の中身を、core.md と thinking.md から著者と対話しながら作る。主催の規定（event.md）、段ごとの流れ（storyline.md）、見出しだけで話が通るゴーストデッキと台詞（deck.md）を書き、lint とストーリーボードで点検する。登壇・発表・LT の資料を作りたい、話の流れを組みたい、スライドの見出しや台詞を考えたい、持ち時間に収まるか見たい、と言われた時に使う。工程はファイルの有無で自動判定し、引数でも指定できる。core.md か thinking.md が無ければ core に戻す。Google スライドに組むのは presentation-slides
argument-hint: "[テーマ] [event|storyline|deck](任意)"
---

# 登壇の場・組む・書く

core.md と thinking.md を土台に、登壇の中身を **場 → 組む（任意）→ 書く** の順で Markdown に固める。見た目は Google スライドで一度だけ組む（presentation-slides）ので、ここでは組まない。原則と不変条件は CLAUDE.md が正で、ここでは工程として適用する。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が工程 `event` / `storyline` / `deck`。どちらも任意）。`$OUTPUT_DIR` は `output/{yyyymmdd}_{テーマ}/` で、既存フォルダを優先する（決め方は core と同じ）。

## 登壇で守ること

- **台詞の印**: 著者の言葉は `（著者）`、AI の言い回しは `（仮）`。AI は `（著者）` を書かない。著者の口頭メモから言い回しを起こした行も `（仮）` にし、出どころを `メモ:` に書く（不変条件6）
- **見出しは著者が決める**: AI が起こした見出しは末尾に `（仮）` を付けて出し、著者が採ったら外す。AI が点検するのは形（主張の一文か、長さ、見出しだけで話が通るか）だけ
- **言葉の規範を分ける**: 画面の文字（見出し・本文）は、組み込みの google-workspace スキルの slide copy の規範を日本語に読み替えて使う。台詞は著者の声を優先し、規範で均さない。ブログの voice-style.md はどちらにも当てない（詳細は [references/deck-spec.md](references/deck-spec.md)）
- **storyline.md に時間配分とスライドの作り方を書かない**: 何を言い、観客がどうなるかだけを書く。枚数・時間・見せ方は deck.md で決める
- **Google スライドへは書かない**: 組上は presentation-slides が、著者の承認を得てから行う

## 起動と現在地

起動したら、まず `$OUTPUT_DIR/core.md`・`$OUTPUT_DIR/thinking.md` を読む。core.md か thinking.md が無い時は、`Skill` ツールで `core` を起動して戻す。core.md の `形式:` が登壇でない時（記事から登壇を起こす時を含む）も `core` に戻す。登壇の核は新しいフォルダで承認するため。

読めたら **現在地を3行で報告し、必要な問いを返す（無ければ返さない）**。

- 核: core.md の問いと形式
- 進捗: event.md・storyline.md・deck.md の有無。deck.md があれば枚数、`秒:` の合計と持ち時間、`（仮）` の残り。Google スライドに組んだか（`slides.json` の有無）
- 未決: thinking.md の未決、または deck.md 冒頭の ℹ️ メモの未決から1件

工程は2つ目の引数があればそれにする。無ければ、event.md が無ければ **場**、著者が流れを組みたいと言えば **組む**、見出しや台詞に進みたいと言えば **書く**。

## 工程1: 場

主催の規定を `$OUTPUT_DIR/event.md` に書く。主催の資料（案内の PDF・メール・フォーム）は `$OUTPUT_DIR/references/` に置き、そこから AI が起こし、著者が確かめる。骨格は [templates/event-template.md](templates/event-template.md) を読む。

- 資料に無いことは `未確認` と書き、推測で埋めない
- スクリプトが読むのは `時間:`・`最小文字:`・`画面比:`・`提出:` の4行。`key: value` の形を崩さない
- 規定と講演概要の約束が食い違う時（例: 概要は「デモを見せる」と約束し、提出はデモなし）は、ℹ️ として著者に返す

## 工程2: 組む（任意）

thinking.md の主張から、段ごとの流れ（何を言い、観客がどうなるか）を著者と対話で決め、`$OUTPUT_DIR/storyline.md` に書く。詳細な手順と書式は [references/phase-storyline.md](references/phase-storyline.md) を読む。

**何を・どの順で語るかの最終判断は著者が握る**。AI が thinking.md から段の叩き台を先に出し（各段に根拠の観点を添える）、著者の並べ替え・削除を受けて固める。確定後に隔離レビューの `drift storyline` を提案する。

LT のように短い登壇は、この工程を飛ばして deck.md から始めてよい。

## 工程3: 書く

`$OUTPUT_DIR/deck.md` を書き、lint とストーリーボードと隔離レビューを通してから著者と磨きこむ。書式と書き方の規範は [references/deck-spec.md](references/deck-spec.md) を読む。

**内部の呼び出し順**（著者はこの順序を意識しなくてよい）:

1. 見出しだけの並び（ゴーストデッキ）を先に出す。著者が並べ替え・削除・言い換えをして固める
2. 各スライドの `役割:`・`見せる:`・`秒:`・`核:` と台詞を埋める。台詞は `（仮）` で起こす
3. 機械 lint（`node scripts/lint-deck.mjs $OUTPUT_DIR/deck.md`）とストーリーボード（`node scripts/render-deck.mjs $OUTPUT_DIR/deck.md`）。hook があれば deck.md を書くたびに自動で走る。NG がゼロになるまで直す
4. 自己点検: 見出しだけで話が通るか、1枚1主張か、画面の文を台詞で読み上げていないか、`（仮）` のままの見出しはどれか
5. 隔離レビュー: `audience` と `drift deck`
6. 指摘を反映して著者と磨きこむ
7. **著者がゴーストデッキ（deck.md）を承認したら**、presentation-slides へ渡す

著者に返すのは、deck.md とストーリーボード（preview サーバー経由で `/output/{登壇}/preview/deck.html`）へのパスと3行の要約（流れ／時間と lint の残件／フィードバックがほしい箇所）。全文を会話に貼らない。

進捗（手順ごとのチェックリスト）と、会話で決まった著者判断は deck.md 冒頭の ℹ️ メモに持たせ、手順を終えるたびに更新する。

## 隔離レビューの呼び出し

`Skill` ツールで `review` を起動し、引数を `"{テーマ} {lens} {対象}"` の形で渡す。

| lens | 対象 | いつ |
|---|---|---|
| `critique` | thinking.md | 著者が「叩いて」と言った時だけ（提案はしてよい） |
| `drift storyline` | storyline.md | storyline.md 確定後に提案する |
| `drift deck` | deck.md | 書く工程の既定 |
| `audience` | deck.md | 書く工程の既定 |

戻ってきた指摘は3件まで。反映する時は修正ごとに「この修正は主題を深めるか、鎧を増やすだけか」を問い、後者は deck.md に入れず ℹ️ メモへ送る（不変条件5）。

## 他スキルへの受け渡し

| 著者の発言 | 渡す先 |
|---|---|
| 「Google スライドに組んで」「スライドに反映して」「Slides から取り込んで」 | `presentation-slides`（書き込みは著者の承認後） |
| 「図を作って」「この関係を1枚の図にしたい」 | `/illustrate`（スライドに貼る寸法で作る） |
| 「核を変えたい」「もう一度掘りたい」 | `core` |

## セッションの区切り

次の地点では、新しいセッションで続けるかを著者に提案する。切るかは著者が決める。

| 地点 | 理由 |
|---|---|
| storyline.md の確定後（`drift storyline` まで済んだ時） | 書く工程に要るのはファイルだけで、掘る対話の履歴は要らない |
| deck.md の初回提示後 | 磨きこみは deck.md と review の結果から始められる |

提案の前に、会話でだけ決まったことが core.md（改訂行）・thinking.md・storyline.md・deck.md 冒頭の ℹ️ メモに書かれているかを確かめる。引き継ぎプロンプトは会話にコードブロックで出し（ファイルには書かない）、`/presentation-write {テーマのフォルダ名} {次の工程}` の起動行・次にやること1行・会話にしか無い注意点（あれば）に絞る。新しいセッションはリポジトリのルートで開く（worktree には gitignore の `output/` が無い）。

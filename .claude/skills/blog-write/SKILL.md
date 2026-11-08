---
name: blog-write
description: ブログ記事の構成（outline.md）と本文（draft.md）を、core.md と thinking.md から著者と対話しながら作る。記事の構成や見出しを考えたい、どの話から入るか迷っている、本文を書いてほしい・書き直してほしい、ドラフトを起こして、導入だけ書き直して、と言われた時に使う。登壇資料の構成と台詞は presentation-write
argument-hint: "[テーマ] [outline|write](任意)"
---

# ブログ記事の組む・書く

core.md と thinking.md を土台に、記事を **組む → 書く** の順で仕上げる。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が工程 `outline` / `write`。どちらも任意）。`$OUTPUT_DIR` は `output/{yyyymmdd}_{テーマ}/` で、既存フォルダを優先する（決め方は core と同じ）。

## 起動と現在地

起動したら、まず `$OUTPUT_DIR/core.md`・`$OUTPUT_DIR/thinking.md` を読む。どちらかが無い時、または core.md の `形式:` がブログでない時（行が無ければブログとして扱う）は、`Skill` ツールで `core` を起動して戻す。

読めたら **現在地を3行で報告し、必要な問いを返す（無ければ返さない）**。

- 核: core.md の問い
- 進捗: 構成・ドラフトの有無と公開状態（Wix は `published.md` の有無、リポの公開層は `published/{記事}/` の有無）。draft.md があれば冒頭 ℹ️ メモの「書く工程の進捗」と「著者判断」も読み、現在の手順を含める
- 未決: thinking.md の未決から1件

工程は2つ目の引数があればそれにする。無ければ、著者が構成を固めたいと言えば **組む**（任意）、書くと言えば **書く**。

叩く・点検する仕事は、`Skill` ツールで `review` を引数 `"{日付付きのフォルダ名} {lens} {対象}"` で起動し、隔離コンテキストへ出す。

## 他スキルへの受け渡し

| 著者の発言 | 渡す先 |
|---|---|
| 「Wix に流し込んで」「Wix から取り込んで」「Wix の最新に揃えて」 | `/blog-wix-sync`（push は著者の承認後。pull は `draft_user.md` を上書き） |
| 「下書きを見て」 | `review` の `author`（Wix で書いているなら、先に `/blog-wix-sync` で `draft_user.md` を取り込む） |
| 「公開記事を取ってきて」 | `/blog-wix-sync` の `pull --published`（`published.md` を取る） |
| 「固まった」「ここから細かく直したい」「公開後に一節足したい」「差分で見せて」 | `/blog-revise`（固めた時点からの差分だけを色付きで見返しながら直す。`$OUTPUT_DIR/revision/baseline.md` があれば、書く工程ではなくこちらを案内する） |
| 「図を入れたい」 | `/illustrate` |
| 「サムネイル（カバー画像）を作って」 | `/blog-thumbnail` |
| 「地図を見たい」「全体像を見たい」 | `core`（引数 `"{テーマ} map"`） |
| 「過程を共有して」「GitHub に上げて」「公開層に反映して」、または現在地で「Wix ○／リポ ×」が出た時 | `/blog-promote`（commit は著者承認後。Wix での公開は著者が画面で行う） |

## 組む（任意）

thinking.md の主張と参考資料から、見出し構成・展開順序・資料接続を著者と対話で設計し `$OUTPUT_DIR/outline.md` に書く。詳細な手順と outline.md のテンプレートは [references/phase-outline.md](references/phase-outline.md) を読む。

**何を・どの順で語るかの最終判断は著者が握る**。著者は掘る対話の全量を覚えていないため、AI が thinking.md から構成の叩き台を先に出し（各章に根拠の観点を添える）、著者の並べ替え・削除を受けて固める。確定後に `core` を引数 `"{テーマ} map"` で起動して地図を更新し、`drift outline` を提案する。

この工程は飛ばしてよい。

## 書く

`$OUTPUT_DIR/draft.md` を書き、機械 lint・点検を通してから著者と磨きこむ。詳細な執筆規範・採否基準・完了時の案内は [references/phase-write.md](references/phase-write.md) を読む。文体の正本は [references/voice-style.md](references/voice-style.md)、緩急の規範は [references/cognitive-rhythm.md](references/cognitive-rhythm.md)。

**内部の呼び出し順**（著者はこの順序を意識しなくてよい）: 層と章の設計の承認（outline.md を省いた時も必ず。thinking.md の深掘りリストの順を章順にしない）→ draft.md の生成 → 機械 lint（`node scripts/lint-draft.mjs $OUTPUT_DIR/draft.md`。NG がゼロになるまで最大3周）→ プレビュー生成（`node scripts/render-preview.mjs $OUTPUT_DIR/draft.md`。hook があれば draft.md を書くたびに自動）→ 自己レビュー → 読者シミュレーション（`readers`）→ 段階間ドリフト点検（`drift draft`）→ 指摘を反映して著者と磨きこむ → 空の `$OUTPUT_DIR/draft_user.md` を作る。

著者に返すのは、本文とプレビュー（`$OUTPUT_DIR/preview/index.html`）へのパスと3行の要約（全体の流れ／lint の残件と直さなかった理由／フィードバックがほしい箇所）と図の一覧。全文を会話に貼らない。

進捗（手順ごとのチェックリスト）と、会話で決まった著者判断は draft.md 冒頭の ℹ️ メモに持たせ、手順を終えるたびに更新する。

## セッションの区切り

outline.md の確定後（`drift outline` まで済んだ時）と、draft.md の初回提示後は、新しいセッションで続けるかを著者に提案する。切るかは著者が決める。

提案の前に、会話でだけ決まったことが core.md（改訂行）・thinking.md・outline.md・draft.md 冒頭の ℹ️ メモに書かれているかを確かめる。引き継ぎプロンプトは会話にコードブロックで出し（ファイルには書かない）、`/blog-write {テーマのフォルダ名} {次の工程}` の起動行と次にやること1行に絞る。ファイルを読めば分かることは書かず、注意点はファイルに書けなかったことが残った時だけ足す。新しいセッションはリポジトリのルートで開く（worktree には gitignore の `output/` が無い）。

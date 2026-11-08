---
name: blog-write
description: ブログ記事の構成（outline.md）と本文（draft.md）を、core.md と thinking.md から著者と対話しながら作る。記事の構成や見出しを考えたい、どの話から入るか迷っている、本文を書いてほしい・書き直してほしい、ドラフトを起こして、導入だけ書き直して、と言われた時に使う。工程はファイルの有無で自動判定し、引数でも指定できる。core.md か thinking.md が無ければ core に戻す。登壇資料の構成と台詞は presentation-write
argument-hint: "[テーマ] [outline|write](任意)"
---

# ブログ記事の組む・書く

core.md と thinking.md を土台に、記事を **組む → 書く** の順で仕上げる。原則と不変条件は CLAUDE.md が正で、ここでは工程として適用する。outline.md の確定後と draft.md の初回提示後は、新しいセッションで続けるかを提案する（「セッションの区切り」）。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が工程 `outline` / `write`。どちらも任意）。`$OUTPUT_DIR` は `output/{yyyymmdd}_{テーマ}/` で、既存フォルダを優先する（決め方は core と同じ）。

## 起動と現在地

起動したら、まず `$OUTPUT_DIR/core.md`・`$OUTPUT_DIR/thinking.md` を読む。core.md か thinking.md が無い（核を決めていない、掘っていない）時は、`Skill` ツールで `core` を起動して戻す。core.md の `形式:` が登壇なら `presentation-write` へ渡す。

読めたら **現在地を3行で報告し、必要な問いを返す（無ければ返さない）**。

- 核: core.md の問い
- 進捗: 構成・ドラフトの有無と公開状態（Wix は `published.md` の有無、リポの公開層は `published/{記事}/` の有無）。draft.md があれば冒頭 ℹ️ メモの「書く工程の進捗」と「著者判断」も読み、現在の手順を含める
- 未決: thinking.md の未決から1件

工程は2つ目の引数があればそれにする。無ければ、著者が構成を固めたいと言えば **組む**（任意）、書くと言えば **書く**。

## 隔離レビューの呼び出し

叩く・点検する仕事は隔離コンテキストへ出す。`Skill` ツールで `review` を起動し、引数を `"{テーマ} {lens} {対象}"` の形で渡す。`{テーマ}` には `$OUTPUT_DIR` の決定に使ったテーマ（日付プレフィックス付きのフォルダ名でもよい）を渡す。

| lens | 対象 | いつ |
|---|---|---|
| `drift outline` | outline.md | outline.md 確定後に提案する |
| `drift draft` | draft.md | 書く工程の既定 |
| `readers` | draft.md | 書く工程の既定 |
| `author` | draft_user.md | 著者が「下書きを見て」と言った時 |

戻ってきた指摘は3件まで。各指摘に効く core 行が付いている。反映する時は修正ごとに「この修正は主題を深めるか、鎧を増やすだけか」を問い、後者は本文に入れず ℹ️ 引き継ぎメモへ送る（不変条件5）。

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

**何を・どの順で語るかの最終判断は著者が握る**。著者は掘る対話の全量を覚えていないため、AI が thinking.md から構成の叩き台を先に出し（各章に根拠の観点を添える）、著者の並べ替え・削除を受けて固める。確定後に `core` を引数 `"{テーマ} map"` で起動して地図を更新し、隔離レビューの `drift outline` を提案する。点検が済んだら、新しいセッションで書く工程に進むかを提案する（「セッションの区切り」）。

この工程は飛ばしてよい。飛ばす場合も、書く工程の冒頭で章の設計（層と章の表）を著者に承認してもらってから本文に入る（phase-write.md 手順0）。

## 書く

`$OUTPUT_DIR/draft.md` を書き、機械 lint・点検を通してから著者と磨きこむ。詳細な執筆規範・採否基準・完了時の案内は [references/phase-write.md](references/phase-write.md) を読む。文体の正本は [references/voice-style.md](references/voice-style.md)、緩急の規範は [references/cognitive-rhythm.md](references/cognitive-rhythm.md)。

**内部の呼び出し順**（著者はこの順序を意識しなくてよい）: 層と章の設計の承認（outline.md を省いた時も必ず。thinking.md の深掘りリストの順を章順にしない）→ draft.md の生成（core.md 必須。無ければ core へ戻す）→ 機械 lint（`node scripts/lint-draft.mjs $OUTPUT_DIR/draft.md`。NG がゼロになるまで最大3周）→ プレビュー生成（`node scripts/render-preview.mjs $OUTPUT_DIR/draft.md`。hook があれば draft.md を書くたびに自動）→ 自己レビュー → 読者シミュレーション（`readers`）→ 段階間ドリフト点検（`drift draft`）→ 指摘を反映して著者と磨きこむ → 空の `$OUTPUT_DIR/draft_user.md` を作る。

著者に返すのは、本文とプレビュー（`$OUTPUT_DIR/preview/index.html`）へのパスと3行の要約（全体の流れ／lint の残件と直さなかった理由／フィードバックがほしい箇所）と図の一覧。全文を会話に貼らない。

進捗（手順ごとのチェックリスト）と、会話で決まった著者判断は draft.md 冒頭の ℹ️ メモに持たせ、手順を終えるたびに更新する。

## セッションの区切り

会話が長くなると入力コンテキストが重くなり、却下した案や古い版が雑音として残る。次の2つの地点では、新しいセッションで続けるかを著者に提案する。切るかは著者が決める。

| 地点 | 理由 |
|---|---|
| outline.md の確定後（`drift outline` まで済んだ時） | 書く工程に要るのはファイルだけで、掘る対話の履歴は要らない |
| draft.md の初回提示後（書く工程の手順5） | 磨きこみは draft.md と review の結果から始められる |

提案の前に、会話でだけ決まったことがファイルに書かれているかを確認する。書く先は core.md（改訂行）・thinking.md・outline.md・draft.md 冒頭の ℹ️ メモ（著者判断・進捗）。書かれていないことは次のセッションに渡らない。

提案と一緒に、次のセッションにそのまま貼れる引き継ぎプロンプトを、会話にコードブロックで出す（ファイルには書かない）。中身は次の4つに絞り、状態の説明はファイルに任せる。

- `/blog-write {テーマのフォルダ名} {次の工程}` の起動行
- 次にやること1行
- 会話にしか無い注意点（あれば）
- 新しいセッションはリポジトリのルートで開くこと。worktree で開くと gitignore の `output/` が無い

ファイルを読めば分かることは書かない。本文・ℹ️ メモ・thinking.md にある方針や用語、起動時にこのスキルが必ず読むもの（core.md、ℹ️ メモの進捗と著者判断）、ファイルが置き換わるまでの経緯がそれに当たる。注意点は、ファイルに書けなかった・書くべきでないことが残った時だけ置く。既定は注意点の無い3行。

例:

```
/blog-write 20260101_example-theme write
draft.md を通しで読み直し、磨きこみを再開して。
新しいセッションはリポジトリのルートで開くこと（worktree には gitignore の output/ が無い）。
```

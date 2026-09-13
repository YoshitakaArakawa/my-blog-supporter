---
name: compare-drafts
description: 公開後の Web 記事（原則。実ブラウザで取得）または draft_user.md と、draft.md（AI 生成）を定量・定性で比較し、AI 生成を次回以降著者に近付けるための改善フィードバックを comparison/comparison.md に、voice-style.md と lint 設定への具体的な変更案を comparison/voice-style-patch.md に生成する。著者の承認があればパッチを適用する。記事を公開した後、AI 版と公開版の差を振り返りたいときに使う
argument-hint: "[テーマ] [公開URL(任意)]"
---

# ドラフト比較・改善フィードバック生成

`draft.md`（AI 生成）と「著者の最終形」を比較し、次回以降の AI 生成を著者に近付けるフィードバックを `$OUTPUT_DIR/comparison/` に出力する。

**著者側の比較対象は公開後の Web 記事を原則とする**。公開記事が著者の確定した声であり、draft_user.md（とくに Wix からの抽出版）は公開前の版や体裁ノイズを含みうる。公開 URL が無い場合のみ draft_user.md にフォールバックする。

**フォルダ命名規則**: 出力先は `output/{yyyymmdd}_$ARGUMENTS/`。既存フォルダがあればそれを使う。`$ARGUMENTS` に日付プレフィックス付きのフォルダ名が直接渡された場合はそのまま使う。以降 `$OUTPUT_DIR` はこのディレクトリを指す。比較成果物は `$OUTPUT_DIR/comparison/` 配下に置く。

**実行形態（inline）**: 公開 URL をチャットで受け取り、実ブラウザ取得を挟むため、隔離コンテキストでは完結しない。

## このスキルの目的

「著者が最終的に納得した記事」に、AI が次回以降の生成でより近付けるようにすること。差分を観察するだけでなく、**voice-style.md / lint 設定への変更案を適用可能な形まで書き、承認後に適用する**ところまでが役割。提案止まりで放置されると次の記事に効かない。

設計原則:
- voice-style.md に既にあるルールに最初は縛られない。まず両版を素直に見比べる。voice-style.md はフェーズ3 で初めて読む
- 著者版の論理破綻・明らかな文章ミスは対象外（AI が真似るべき特徴ではない）。`review/author_NN.md` に著者側の改善余地として指摘済みのものも学習対象から外す

## 手順

### 1. 比較対象の確定

**AI 側**: `$OUTPUT_DIR/draft.md`（必須。なければ「先に `/article $ARGUMENTS` の書く工程を回してください」と案内して中断）。

**文脈**: `$OUTPUT_DIR/core.md`（あれば読む。記事の問い・読者・読後を把握して差分の意味づけに使う）。

**著者側**: 次の優先順で 1 つに確定する。

1. **公開 Web 記事（原則）**: 公開 URL（チャットまたは `$ARGUMENTS` 第 2 引数）があれば、**実ブラウザで取得する**。yarakawa.com は Wix の SPA で、WebFetch は要約・見出しの誤生成を起こす。
   ```
   playwright-cli open <URL>
   playwright-cli eval "el => el.innerHTML" "[data-hook='post-description']" > .playwright-cli/post.html
   node scripts/wix-html-to-md.mjs .playwright-cli/post.html --source <URL> > $OUTPUT_DIR/comparison/published.md
   playwright-cli close
   ```
   `[data-hook='post-description']` が取れない場合は `article` で試す。取得後、`published.md` の見出し・段落数が公開ページと一致しているかを目視で 1 度確認する（見出しの数と末尾の段落）。playwright-cli が使えない環境でのみ WebFetch にフォールバックし、その場合は published.md 先頭に「WebFetch 取得（要約の可能性あり）」と記す
2. **フォールバック**: `$OUTPUT_DIR/draft_user.md`。URL が無い、または取得が失敗した場合。空または極端に短ければ「比較対象が見当たりません」と案内して中断

どちらを使ったかを手順 6 の provenance に明記する。

**この時点では voice-style.md を読まない**。

### 2. フェーズ0: 定量比較

```
node scripts/lint-draft.mjs --metrics $OUTPUT_DIR/draft.md $OUTPUT_DIR/comparison/published.md
node scripts/lint-draft.mjs --metrics $OUTPUT_DIR/draft.md $OUTPUT_DIR/comparison/published.md --csv
```

1 行目の表を comparison.md の「0. 定量比較」に貼る。2 行目の CSV は `output/_metrics/history.csv` に追記する（ファイルが無ければヘッダごと作る。2 回目以降はヘッダ行を除いて追記）。この履歴が「ルールが効いたか」を次回以降に数値で判定する材料になる。

### 3. フェーズ1: 素直な単純比較（voice-style.md なし）

両版を見比べて差分を観察する。柱の例（縛られず、見えたものを書く）:

- 全体構造（見出し数・粒度）、冒頭の入り方、結びの設計
- 文体・トーン（語尾の多様性、共感語尾、括弧書き、体温の出し方）
- 抽象/具体の順序、固有名詞・一次情報の量、数字 vs 原文引用
- 製品論 vs ユーザー主体性、余談の使い方
- 論証の畳み方（反論を回収するか、認めたまま開くか）、保険文の有無
- 参考リンクの位置、メタファー・キーフレーズの反復

各観察に「AI 版で起きていたこと」「著者版で行われていたこと」「近付くために必要なパターン」の 3 点を記録する。

### 4. フェーズ2: AI の傾向を帰納

観察を集約し、AI が陥っていた一般的傾向を 5〜10 個に整理する。過去の comparison.md に引きずられず、今回の比較から見えたものを優先する。

### 5. フェーズ3: voice-style.md と lint 設定への変更案

ここで初めて `.claude/skills/article/references/voice-style.md` と `scripts/draft-lint.config.json`・`scripts/prh.yml` を読む。

観察を照合して分類する:
- **既存ルールでカバー済みだが効いていない**: 「〜しすぎない」「任意」の書き方が原因なら、**既定＋例外条件**に書き換える案を出す。数えられる差分（語の出現・段落文数・字数）なら **lint の禁止句・閾値**に落とす案を出す（ルール文の追記より効く）
- **既存ルールにない**: 新規ルール案。実例（voice-style「1.」）に著者版の段落を 1 つ足す案も検討する（実例は 8 個まで。増やすなら入れ替える）
- **既存ルールが過剰反応の原因**: 緩和案
- **著者側の改善余地**（`review/author_NN.md` で指摘済み、または voice-style から外れる著者の癖）: 学習対象から除外し、メタコメントに記す

### 6. 出力

`$OUTPUT_DIR/comparison/comparison.md`:

```markdown
# Draft 比較・改善フィードバック

- 比較対象: `draft.md` (AI生成) vs {published.md（取得元 URL・取得日・取得手段）/ draft_user.md}
- 生成日: {YYYY-MM-DD}
- 記事テーマ: {core.md の「問い」行から}

## 0. 定量比較
{--metrics の表}

## I. 差分の解釈（フェーズ1）
### 1. {観察の柱}
- AI版: ... / 著者版: ... / 観察: ...

## II. AI が改善すべきパターン（フェーズ2）
1. {パターン名}: {説明}

## III. 変更案の要約（フェーズ3。本文は voice-style-patch.md）
- {ルール N / lint 禁止句 / prh}: {一行要約}

## IV. メタコメント
- 著者側の改善余地として除外したもの、より根本的な観察
```

`$OUTPUT_DIR/comparison/voice-style-patch.md`（適用可能な形で書く）:

```markdown
# voice-style / lint への変更案（{YYYY-MM-DD}）

## voice-style.md
### ルール {N}（{タイトル}）
- 現行: > {現行の文をそのまま引用}
- 変更後: > {置き換える文}
- 根拠: {observation の番号}

### 実例の追加・入れ替え（任意）
- 追加: > {著者版の段落}（見るところ: ...）
- 入れ替え対象: 実例 {M}

## scripts/draft-lint.config.json
- bannedPhrases に追加: { "pattern": "...", "group": "...", "hint": "..." }
- thresholds の変更: {キー}: {現行} → {変更後}（根拠: 公開版の実測 ...）

## scripts/prh.yml
- expected: ... / patterns: [...]
```

### 7. 著者への案内と適用

- comparison.md と voice-style-patch.md を生成したこと、published.md の取得手段を伝える
- パッチの要約を提示し、**適用するか著者に確認する**。承認された項目だけを voice-style.md・draft-lint.config.json・prh.yml に反映する。閾値を変えた時は voice-style「0. 数値仕様」の表も同期させる
- 反映後、`node scripts/lint-draft.mjs $OUTPUT_DIR/draft.md` を 1 度回し、設定が壊れていないこと（実行エラーが無いこと）を確認する
- `output/_metrics/history.csv` が 3 記事分以上溜まっていれば、指標の推移（縮んだもの／縮まないもの）を 1〜2 行で添える

## 注意事項

- 著者版を無条件に正解にしない。`review/author_NN.md` で著者側の改善余地と指摘された差分（章数過多・長い見出し等）は学習対象から外す
- 比較対象が同一の章立て・同一の長さである必要はない。構造が違うこと自体が観察対象
- 取得で使ったブラウザは `playwright-cli close` で閉じ、`.playwright-cli/` の中間ファイルは残さない（fetch-page の規約と同じ）

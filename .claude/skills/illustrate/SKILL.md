---
name: illustrate
description: ブログ記事の概念やアイデアを、構造を保ったまま視覚的に主張する図を作図し PNG として書き出す。記事に挿絵・概念図を入れたいとき、箇条書きやボックス＆矢印では伝わらない関係（対比・プロセス・階層・一対多・トレードオフ・分離・before/after 等）を1枚の図で示したいときに使う。外部画像 API を使わず、SVG または HTML/CSS を導入済み playwright-cli で PNG にレンダリングし、自己レビューで仕上げる。1枚だけでなく、別々のデザイン方針で複数案を並列生成して選ぶ「複数案モード」も持つ。
argument-hint: [図にしたい主張と見せたい関係／対象記事ディレクトリ／案の数]
allowed-tools: Bash(playwright-cli:*) Bash(bash:*) Bash(rm:*) Bash(mkdir:*) Read Write Glob Grep Agent Task
---

# illustrate（概念図の作図 → PNG 書き出し）

記事の「言葉では説明しにくい関係」を図にし、SVG（ソース）と PNG（成果物）で保存するスキル。raster 画像生成モデルは使わない。コード（SVG / HTML+CSS）を手で組み、Chromium（playwright-cli）でレンダリングし、**描いて自分で見て直す**ループで凡庸さを排除する。

既定は**単一案モード**（1 枚を作る）。著者が「複数案」「N 案」「いくつか方針を変えて」等と求めた時だけ [references/variants-mode.md](references/variants-mode.md) を読み、並列生成に切り替える。

## 入力の確定

進捗:

- [ ] **対象記事ディレクトリを特定する**：引数で指定があればそれ。無ければ `output/{yyyymmdd}_{テーマ}/` の中から判断する。**「昨日の記事」等の曖昧指定は日付を取り違えやすい**——ディレクトリ名の日付プレフィックスと本文で照合し（`output/` は gitignore なのでコミット履歴からは辿れない）、確信が持てなければ著者に 1 問確認する。
- [ ] **図にする主張を 1 つに絞る**：引数を起点に `core.md` / `thinking.md` / `outline.md` / `draft.md` の該当箇所を読んで正確に把握する。事実・固有名詞は記事本文に合わせる（図で新事実を創作しない）。
- [ ] **見せたい関係を 1 つ決める**：対比／プロセス／階層／一対多／トレードオフ／分離 など。複数あるなら図を分ける。
- [ ] **要素の意味対応を確定する**：例「脳＝判断／手＝実行」のように、図中の各要素が何を指すかを言語化する。これが全案で固定する“内容”。
- [ ] **ラベルの語彙を本文から取る**：図中の語は、本文の該当段落の語をそのまま使う（本文が「ダッシュボード」なら図も「ダッシュボード」。本文の語が変わったら図も同名上書きで追随させる）。本文に無い評価軸（製品差・優劣・順位）を図で足さない。

## 品質の原則

[references/design-philosophies.md](references/design-philosophies.md) の「純コード描画で質を上げる技法」に従う。要点：

- **philosophy-first**：描く前に美学を 1 段落で言語化する。
- **medium を選ぶ**：図・幾何は SVG、gradient/影/リッチなタイポが要るなら HTML/CSS（同じ描画パイプで撮れる）。
- **実フォント**：同梱の Zen Kaku Gothic New（`references/fonts/`）を使う。レンダリングスクリプトが base64 で `@font-face` にインラインする。Web からの `@import` は使わない（ネットワーク依存・無言フォールバック・file:// での CORS 失敗）。
- **構図・余白・抑制**：整列、十分な余白、2〜3色＋ニュートラル、最小テキスト。
- **second-pass**：自己レビュー後にバグ修正でなく「もう一段良くする」推敲を 1 回入れる。

## 手順（単一案モード）

進捗:

- [ ] **philosophy を 1 段落で書く**（design-philosophies.md 参照）。
- [ ] **視覚形を選ぶ**：[references/visual-rhetoric.md](references/visual-rhetoric.md)。ボックス＆矢印はプロセス/依存以外では採らない。
- [ ] **作図する**：`output/{記事}/images/src/{図名}.svg`（SVG）または `{図名}.html`（HTML medium）に保存。HTML は**フラグメント**で書く——ルート要素に `id="fig"`、`font-family:"Zen Kaku Gothic New"`、レイアウト用 `<style>` 同梱。
- [ ] **PNG にレンダリングする**：下記スクリプトを実行する。
- [ ] **自己レビュー＋second-pass**：PNG を Read し [references/anti-bland-rubric.md](references/anti-bland-rubric.md) で採点。❌ があれば作図に戻る（最大 3 周）。合格後に磨きの一手を入れる。
- [ ] **後始末**：`rm -rf .playwright-cli/` で作業ファイルを掃除する（gitignore 済みだが残さない）。

## レンダリング（自由度：低）

リポジトリルートで実行する:

```bash
bash .claude/skills/illustrate/scripts/render-figure.sh <セッション名> <入力 .svg|.html> <出力 .png>
```

セッション名は単一案なら `fig`。成功時に `OK png=... clip=... fonts=...` を返し、フォントが読めていない場合は撮影せずに止まる。

- **このスクリプトを改変しない**。Windows / playwright-cli で検証済みの 4 つの制約（ベア絶対パスで open・フォントの base64 インライン・base64 のストリーム出力・`document.fonts.ready` の確認）をまとめて満たしており、外すと無言でフォントが化けるかハングする。理由はスクリプト冒頭のコメントにある。
- 撮影対象は内容にクリップされる（SVG はルート、HTML は `#fig`）。見切れ／余白過多が出たら viewBox かルート要素のサイズを直して再実行する。
- 追加の書体が要るときは `references/fonts/` に .ttf を置き、スクリプトに `@font-face` 行を 1 行足す（[references/fonts/README.md](references/fonts/README.md)）。monospace アクセントは決定的に使える `ui-monospace, monospace` で足りる。
- レンダリング後は必ず PNG を Read して**見た目を確認**する（コードを読んだだけで合格にしない）。

## 出力契約

- **必ずファイルとして書き出す**。inline で図やコードを返さない。
  - `images/src/{図名}.svg` / `.html` … ソース（gitignore 済み。修正・再描画はここを編集する）
  - `images/{図名}.png`（複数案は `variant_{kk}.png`）… 成果物。`images/` 直下にはブログへ載せる PNG だけを置く
- **改訂は上書き**。同じ図を直す時は同じファイル名の `.svg` と `.png` を上書きし、`_v2` や `_old` のような版名ファイルを直下に増やさない。旧版を残すのは著者が見比べを求めた時だけで、その時は `images/_archive/` へ移す
- **draft.md のプレースホルダーを置き換える**：作図が済んだら、本文の `<!-- 画像: ... -->` を `![{キャプション}](images/{図名}.png)` の1行に置き換える。記事のプレビュー（`scripts/render-preview.mjs`。Edit のたびに hook で再生成される）は、この形だけを図として出す。呼び出し側が「draft.md は編集しない」と指示した時は、置き換え用の1行を戻り値で返す
- どの図が本文のどこに入るかは記事のプレビュー（`preview/index.html`）で確認する。記事専用のプレビュースクリプトや図の一覧表は作らない
- **戻り値は実行サマリのみ**。生成物の全文やコードを戻り値に詰めない。サマリに含める：保存パス、philosophy、図のキャプション（主張を 1 文で）、自己レビュー周回数／未解決の ❌、記事に貼る markdown 行（例 `![{alt}](images/{図名}.png)`）。
- Write に失敗したら inline で代替せず、エラーを返して止める。

## 命名

- 単一案：内容を示す kebab-case（連番でなく）。例 `brain-and-hand.svg`。
- 複数案：`variant_01`, `variant_02`, … と連番。採用案は後で内容名にリネームしてよい。

---
name: illustrate
description: ブログ記事の概念やアイデアを、構造を保ったまま視覚的に主張する図を作図し PNG として書き出す。記事に挿絵・概念図を入れたいとき、箇条書きやボックス＆矢印では伝わらない関係（対比・プロセス・階層・一対多・トレードオフ・分離・before/after 等）を1枚の図で示したいときに使う。外部画像 API を使わず、SVG または HTML/CSS を導入済み playwright-cli で PNG にレンダリングし、自己レビューで仕上げる。1枚だけでなく、別々のデザイン方針で複数案を並列生成して選ぶ「複数案モード」も持つ。
argument-hint: [図にしたい主張と見せたい関係／対象記事ディレクトリ／案の数]
allowed-tools: Bash(playwright-cli:*) Bash(rm:*) Bash(mkdir:*) Read Write Glob Grep Task
---

# illustrate（概念図の作図 → PNG 書き出し）

記事の「言葉では説明しにくい関係」を図にし、SVG（ソース）と PNG（成果物）で保存するスキル。raster 画像生成モデルは使わない。コード（SVG / HTML+CSS）を手で組み、Chromium（playwright-cli）でレンダリングし、**描いて自分で見て直す**ループで凡庸さを排除する。

2つのモードがある：

- **単一案モード**：1枚を作る（既定）。
- **複数案モード**：別々の design philosophy を割り当てた**独立サブエージェント N 体**を並列に走らせ、N 枚の候補を出して人間が選ぶ。デザインの良し悪しは著者の主観が正なので、judge は人間。

## 入力の確定（両モード共通）

進捗:
- [ ] **対象記事ディレクトリを特定する**：引数で指定があればそれ。無ければ `output/` 配下から対象を判断。`output/{yyyymmdd}_{テーマ}/` の形。**「昨日の記事」等の曖昧指定は日付を取り違えやすい——コミット日や本文を確認し、確信が持てなければ著者に1問確認する。**
- [ ] **図にする主張を1つに絞る**：引数を起点に `thinking.md` / `outline.md` / `draft.md` / `brief.md` の該当箇所を読んで正確に把握する。事実・固有名詞は記事本文に合わせる（図で新事実を創作しない）。
- [ ] **見せたい関係を1つ決める**：対比／プロセス／階層／一対多／トレードオフ／分離 など。複数あるなら図を分ける。
- [ ] **要素の意味対応を確定する**：例「脳＝判断／手＝実行」のように、図中の各要素が何を指すかを言語化する。これが全案で固定する“内容”。

## 品質の原則（両モード共通）

[references/design-philosophies.md](references/design-philosophies.md) の「純コード描画で質を上げる技法」に従う。要点：

- **philosophy-first**：描く前に美学を1段落で言語化する。
- **medium を選ぶ**：図・幾何は SVG、gradient/影/リッチなタイポが要るなら HTML/CSS（同じ描画パイプで撮れる）。
- **実フォント**：HTML medium では Web フォントを `@import`/`@font-face` で読む。日本語は Noto Sans JP / Zen Kaku Gothic 等。
- **構図・余白・抑制**：整列、十分な余白、2〜3色＋ニュートラル、最小テキスト。
- **second-pass**：自己レビュー後にバグ修正でなく「もう一段良くする」推敲を1回入れる。

## 単一案モードの手順

進捗:
- [ ] **philosophy を1段落で書く**（design-philosophies.md 参照）。
- [ ] **視覚形を選ぶ**：[references/visual-rhetoric.md](references/visual-rhetoric.md)。ボックス＆矢印はプロセス/依存以外では採らない。
- [ ] **作図する**：`output/{記事}/images/{図名}.svg`（SVG）または `{図名}.html`（HTML medium）に保存。
- [ ] **PNG にレンダリングする**（下記コマンド）。
- [ ] **自己レビュー＋second-pass**：PNG を Read し [references/anti-bland-rubric.md](references/anti-bland-rubric.md) で採点。❌ があれば作図に戻る（最大3周）。合格後に磨きの一手を入れる。
- [ ] **後始末**：playwright-cli を閉じ、作業ファイルを掃除する。

## 複数案モードの手順（オーケストレータ＝メイン文脈で実行）

著者が「複数案」「N 案」「いくつか方針を変えて」等と求めたとき。

進捗:
- [ ] **共通ブリーフを1つ書く**：上で確定した「主張・見せたい関係・要素の意味対応・記事の事実」をまとめる。これは全案で固定する内容。
- [ ] **N と philosophy を割り当てる**：design-philosophies.md のレンズから N 個選び、各案に1つ割り当てる（重複させない）。既定 N=3。
- [ ] **N 体の独立サブエージェントを並列起動する**（`Task` / agent、general-purpose）。各エージェントに渡す：共通ブリーフ＋割当 philosophy＋**変種インデックス k**＋**固有の playwright セッション名 `-s=ill{k}`**＋**固有の作業ファイル名**。各エージェントは単一案モードの手順を実行し、`output/{記事}/images/variant_{kk}.svg`（または `.html`）と `variant_{kk}.png` を書き、`{path, philosophy, 自己採点, 一言}` を返す。
- [ ] **N 枚を著者に提示する**：各 PNG を届け、philosophy と狙いを1行で添える。**選定は著者**。
- [ ] **（任意）統合**：著者が選んだ案を基に、他案の良い所を接いだ最終案をもう1枚作る。

### 並列実行の衝突回避（重要）

playwright-cli は同一セッションを並列で使うと壊れる。各サブエージェントは必ず：

- **固有セッション**：全コマンドに `-s=ill{k}`（例 `-s=ill1`）を付ける。
- **固有の作業ファイル**：ラップ用 HTML は `.playwright-cli/_render_ill{k}.html` のように名前を分ける。
- **自分のセッションだけ閉じる**：`playwright-cli -s=ill{k} close`。`close-all` は他案を巻き込むので使わない。
- 作図ファイル名（`variant_{kk}.*`）が異なるので出力の衝突はない。worktree は不要。

## レンダリングコマンド（自由度：低・この手順を守る）

`file:` プロトコルは playwright-cli にブロックされるため使わない。**作図物を data URL として開く**（検証済み手順）。`<S>` はセッション名（単一案は既定セッションで可、複数案は `-s=ill{k}`）。`<TMP>` は作業 HTML（複数案は案ごとに固有名）。`<OUT_PNG>` は出力先。

SVG を描いた場合（余白ゼロの HTML に包む）:

```bash
printf '<!doctype html><meta charset=utf-8><style>html,body{margin:0}</style>' > <TMP>
cat output/{記事}/images/{図名}.svg >> <TMP>
URL="data:text/html;base64,$(base64 -w0 <TMP>)"
playwright-cli <S> open "$URL"
playwright-cli <S> screenshot "svg" --filename=<OUT_PNG>
playwright-cli <S> close
```

HTML/CSS を直接描いた場合（ルート要素を撮る。Web フォント読込を待つ）:

```bash
URL="data:text/html;base64,$(base64 -w0 output/{記事}/images/{図名}.html)"
playwright-cli <S> open "$URL"
playwright-cli <S> eval "document.fonts.ready.then(()=>document.fonts.size)"   # フォント読込待ち
playwright-cli <S> screenshot "#fig" --filename=<OUT_PNG>                       # ルートに id="fig" を付ける
playwright-cli <S> close
```

- 撮影対象は内容にクリップ（SVG なら `"svg"`、HTML なら撮りたいルート要素の id）。見切れ/余白過多が出たら viewBox / ルート要素のサイズを直して再実行する。
- レンダリング後は必ず PNG を Read して**見た目を確認**する（コードを読んだだけで合格にしない）。

### 後始末

playwright-cli は作業ファイルを `.playwright-cli/`（gitignore 済み）に書く。作図が一段落したら、自分が開いたセッションを閉じ、作業ファイルを掃除する（複数案では各エージェントが自分のセッション・作業ファイルのみ。最後にオーケストレータが `rm -rf .playwright-cli/` で一掃してよい）。

## 出力契約

- **必ずファイルとして書き出す**。inline で図やコードを返さない。
  - `images/{図名}.svg` / `.html` … ソース（git にコミットされる＝後で修正・再描画できる）
  - `images/{図名}.png`（複数案は `variant_{kk}.png`）… 成果物（`*.png` は gitignore 済み。Wix へ手動アップロード前提）
- **戻り値は実行サマリのみ**。生成物の全文やコードを戻り値に詰めない。サマリに含める：保存パス、philosophy、図のキャプション（主張を1文で）、自己レビュー周回数／未解決の ❌、記事に貼る markdown 行（例 `![{alt}](images/{図名}.png)`）。
- Write に失敗したら inline で代替せず、エラーを返して止める。

## 命名

- 単一案：内容を示す kebab-case（連番でなく）。例 `brain-and-hand.svg`。
- 複数案：`variant_01`, `variant_02`, … と連番。採用案は後で内容名にリネームしてよい。

---
name: fetch-page
description: 実ブラウザ（Chromium／playwright-cli）を起動して、JS レンダリング後のページ本文やログイン必須ページを取得する。WebFetch が失敗した・要約しか返さないとき、ユーザーが playwright やブラウザ経由の取得を明示的に指示したとき、X（旧 Twitter）などログイン必須サイトや既知の SPA を読むとき、公開済みの自分の記事（yarakawa.com）を Markdown で取り直すとき、著者が Wix の編集画面で書いている下書きを draft_user.md に取り込むときに使う。通常の公開ページ・静的サイトでは WebFetch が先で、このスキルはその代替手段
allowed-tools: Bash(playwright-cli:*) Bash(node:*) Bash(rm:*) Bash(cat:*) Read
---

# Web ページ取得（playwright-cli 経由）

## 使う条件

**以下のいずれかに該当する時だけ使う。それ以外は WebFetch を使う。**

1. **WebFetch が失敗した** — エラー応答、要約しか返らない、本文が取れない、403 / JS ブロック等
2. **ユーザーが明示的に指示した** — 「playwright で」「ブラウザで」「実ブラウザで」等
3. **ログイン必須のページ** — X（旧 Twitter）、Salesforce、その他認証必須サイト
4. **既知の SPA / JS レンダリング必須サイト** — WebFetch を試すまでもなく取れないことが明らか

普通の公開記事・静的サイトは **必ず WebFetch を先に試す**。

## 基本フロー（公開ページ）

```bash
playwright-cli open <URL>
playwright-cli eval "document.body.innerText"   # innerText が一番素直
playwright-cli close
```

`open` の出力末尾に `.playwright-cli/page-<timestamp>.yml` というスナップショットのパスが出る。要素を細かく見たい時だけ Read で参照する（普段は `eval` の結果で足りる）。

複数 URL を連続で読むときは、同じセッションを使い回して `open` ではなく `goto` を使う（高速。最後の `close` を忘れない）:

```bash
playwright-cli goto <次のURL>
playwright-cli eval "el => el.innerText" "article"   # 特定要素だけなら第 2 引数にセレクタ
```

## yarakawa.com の公開記事

自分のブログ（Wix の SPA）の公開記事を Markdown で取る時の手順。WebFetch は本文を要約し見出しを誤生成するので、ここは最初から実ブラウザで取る。保存先は記事の作業ディレクトリ直下の `published.md`（毎回上書き）。

```bash
playwright-cli open <URL>
playwright-cli eval "el => el.innerHTML" "[data-hook='post-description']" > .playwright-cli/post.html
node ${CLAUDE_SKILL_DIR}/scripts/wix-html-to-md.mjs .playwright-cli/post.html --source <URL> > output/{記事}/published.md
playwright-cli close
```

`[data-hook='post-description']` が取れない場合は `article` で試す。取得後、`published.md` の見出しの数と末尾の段落が公開ページと一致しているかを 1 度確認する。用途は、公開後の改訂を `/revise` で差分にする時に本文を Wix の最新へ揃えることと、`/publish-article` の slug 重複確認。

## Wix の編集画面の下書き

著者が Wix のエディタで書いている途中の本文を `draft_user.md` に取る手順。エディタは要ログインなので、著者が普段使う Chrome に Playwright Extension（Chrome Web Store の「Playwright Extension」、Microsoft 提供）を入れ、`attach --extension=chrome` で接続する。取得は本文をファイルへ直接書くので、会話にはほぼトークンを使わない。DOM の読み取りだけを行い、クリック・入力・保存・公開には触れない。

前提: 著者が Chrome で対象記事の編集画面（`manage.wix.com/dashboard/.../blog/.../edit`）を開いていること。接続時に拡張側でタブの許可を求められることがある。

```bash
playwright-cli attach --extension=chrome
playwright-cli --s=chrome eval "el => el.outerHTML" ".ProseMirror" > .playwright-cli/wix-editor.html
playwright-cli --s=chrome eval "el => el.value" "textarea[data-hook='post-form__title-input']" > .playwright-cli/wix-editor-title.txt
node ${CLAUDE_SKILL_DIR}/scripts/wix-html-to-md.mjs .playwright-cli/wix-editor.html --source "<編集画面のURL>" --title-file .playwright-cli/wix-editor-title.txt --note "Wix 編集画面の下書き（fetch-page の Wix 下書き手順）。毎回上書き。" > output/{記事}/draft_user.md
playwright-cli --s=chrome detach
```

`attach` の出力の Page URL が編集画面でなければ、著者にタブを前面にしてもらって取り直す。`.ProseMirror` が取れない時は `[contenteditable="true"]` で試す。取得後、`draft_user.md` の見出しの数と末尾の段落がエディタと一致しているかを 1 度確認する。画像はエディタ内では `<!-- 画像: キャプション -->` のプレースホルダーになり、直後にキャプションの行が続く。`draft_user.md` が既に非空でも上書きしてよい（Wix 側が正のため）。用途は `/revise` で著者の直しを差分にする時と、`/review` の author レンズの入力。編集画面を .mhtml で保存して `review` の抽出スクリプトに渡す経路は、拡張が使えない時の予備。

## X（旧 Twitter）

ログインが要るので手順が別。[references/x-login-flow.md](references/x-login-flow.md) を読んでから実行する。

## 作業ファイルとクリーンアップ

playwright-cli の作業ファイル（スナップショット、コンソールログ、中間データ）は `.playwright-cli/`（プロジェクトルート、gitignore 済み）に溜まる。このスキルが書く一時ファイルもそこに集約し、他のディレクトリに散らかさない。

取得作業が一段落したら、Claude が自分で実行する:

```bash
playwright-cli close-all   # 全セッション終了（Cookie/メモリも消える）
rm -rf .playwright-cli/    # 作業ファイルを一掃
```

`attach` で接続した Chrome は `close-all` の対象にせず `detach` で切る（著者のブラウザを閉じないため）。タイミングの目安は、ユーザーが「ブラウザはもういい」「閉じて」と伝えた時、記事執筆の一段落（`/article` の掘る工程・書く工程を終えた時）で取得が一通り済んだ時、会話の終わりが近いと判断できる時。中間ファイルを残す特別な理由が無い限り、上の 2 コマンドを実行する。

## 注意

- 全コマンドは headless 既定。ユーザー操作が必要な時だけ `--headed`
- スクリーンショットは `playwright-cli screenshot --filename=output/<dir>/<name>.png` のように **`.playwright-cli/` の外**へ明示的に保存する（クリーンアップで消えないように）
- 永続プロファイル（`--profile=...`）は使わない。Cookie はディスクに残さない方針

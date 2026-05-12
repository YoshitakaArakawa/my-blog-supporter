---
name: fetch-page
description: WebFetchが失敗または要約しか返さなかった時、もしくはユーザーがplaywright/ブラウザ経由での取得を明示的に指示した時に使う、実ブラウザ経由のWebページ取得スキル。Xポストなどログイン必須サイトにも対応。通常のURL取得ではまずWebFetchを試すこと
allowed-tools: Bash(playwright-cli:*) Bash(rm:*) Read
---

# Webページ取得 (playwright-cli経由)

実ブラウザ（Chromium）を起動して、JSレンダリング後のページ本文やログイン必須ページを取得するスキル。

## このスキルを使う条件

**以下のいずれかに該当する時のみ使う。それ以外は WebFetch を使うこと。**

1. **WebFetchが失敗した** — エラー応答、要約しか返らない、本文が取れない、403/JSブロック等
2. **ユーザーが明示的に指示した** — 「playwrightで」「ブラウザで」「実ブラウザで」等
3. **ログイン必須のページ** — X (旧Twitter)、Salesforce、その他認証必須サイト
4. **既知のSPA/JSレンダリング必須サイト** — WebFetchを試すまでもなく取れないことが明らか

普通の公開記事・静的サイトは **必ず WebFetch を先に試す**。

## 基本フロー (公開ページ)

```bash
# 1. ブラウザ起動 + URL遷移
playwright-cli open <URL>

# 2. 本文抽出 (innerTextが一番素直)
playwright-cli eval "document.body.innerText"

# 3. 終了
playwright-cli close
```

`open` の出力末尾に `.playwright-cli/page-<timestamp>.yml` というスナップショットファイルのパスが出る。要素を細かく見たい時のみ Read で参照する (普段は `eval` の結果で十分)。

### 既にブラウザが開いている場合

同じセッションを使い回すなら `open` ではなく `goto` を使う:

```bash
playwright-cli goto <次のURL>
playwright-cli eval "document.body.innerText"
```

複数URLを連続で読むときはこの方が高速。最後に `close` を忘れない。

### 特定要素だけ取りたいとき

```bash
playwright-cli eval "el => el.innerText" "article"
playwright-cli eval "el => el.innerText" "main"
```

## X (旧Twitter) フロー

Xはログイン必須。**Cookieをディスクに残さない方針**として、永続プロファイルは使わない。ブラウザプロセスのメモリ上にだけCookieを保持し、close時に完全消去する。

named session `-s=x` でブラウザを起動しっぱなしにし、その間Claudeが命令を投げる構成。

### 会話の開始時 (Claudeがブラウザを起動 → ユーザーがログイン)

ClaudeがXのURLを取得しようとして未ログインを検知したら、Claudeが以下を実行する:

```bash
playwright-cli -s=x open https://x.com/login --headed
```

これでユーザーの画面にChromiumウィンドウがポップアップする。コマンドは即座に返るので、Claudeはユーザーに以下を依頼する:

> 「ブラウザを起動しました。画面のウィンドウでXにログインしてください（2FA含む）。完了したら『ログインした』と教えてください。ウィンドウは閉じないでください」

ユーザーが手動ログイン後、「ログインした」と返答すれば取得フェーズに進む。

### Claudeからの利用 (ログイン中)

ブラウザは起動したままなので、メモリ上のCookieでログイン状態が維持されている:

```bash
playwright-cli -s=x goto https://x.com/<user>/status/<id>
playwright-cli -s=x eval "document.querySelector('[data-testid=\"tweetText\"]')?.innerText || document.body.innerText"
```

`-s=x` を必ず指定する (これがないと別のブラウザに飛んでログインしていない状態になる)。
複数ポストを連続で読む場合は `goto` → `eval` を繰り返す。

### Xアクセスが失敗した時

- ログインページにリダイレクトされていたら、ユーザーがブラウザを閉じてしまった可能性が高い → 上記「会話の開始時」手順を再実行依頼
- レート制限を疑ったら無理に再試行せず、ユーザーに報告する

## 作業ファイルとクリーンアップ

### 作業ファイル置き場

playwright-cli はコマンド実行のたびに作業ファイル（スナップショット、コンソールログ、中間データ）を **`.playwright-cli/`**（プロジェクトルート、gitignore済み）に書き出す。

このスキルが書く一時ファイル（抽出スクリプト、中間JSON等）も **`.playwright-cli/`** に集約する。他のディレクトリには散らかさない。

### タスク完了時の必須クリーンアップ

このスキルでのWeb取得作業が一段落したら、**Claudeが自分で以下を実行する**:

```bash
# 1. すべてのブラウザセッションを終了 (Cookie/メモリも消える)
playwright-cli close-all

# 2. 作業ファイルを一掃
rm -rf .playwright-cli/
```

タイミングの目安:
- ユーザーが「ブラウザはもういい」「閉じて」「終了」等を伝えた時
- ブログ執筆の一段落（例: `/brainstorm` 完了時、`/write` 完了時）でWeb取得が一通り済んだ時
- 会話の終わりが近いと判断できる時

中間ファイルを残したい特別な理由がない限り、上記2コマンドを忘れずに実行する。

## 注意

- 全コマンドはheadless既定。ユーザー操作が必要な時のみ `--headed`
- スクリーンショットが必要なら `playwright-cli screenshot --filename=output/<dir>/<name>.png` のように **`.playwright-cli/` 外** に明示的に保存する（クリーンアップで消えないように）
- Xに対する大量アクセス・短時間連投はBOT検知リスクがあるため、必要最小限のページのみ取得する
- 永続プロファイル (`--profile=...`) は使わない。Cookieはディスクに残さない方針

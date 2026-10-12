---
name: fetch-page
description: WebFetch で取れないページ本文を実ブラウザ経由で取得する。公開 SPA は playwright-cli（headless Chromium）で、X などログイン必須のページは Claude in Chrome（著者の Chrome のログイン状態）で読む。WebFetch が失敗した・要約しか返さないとき、著者が「ブラウザで」「playwright で」「Chrome で」と取得経路を指示したとき、X（旧 Twitter）など要ログインのページを読むときに使う。通常の公開ページ・静的サイトは WebFetch が先。自分の Wix ブログの記事・下書きの取り込みは wix-sync が担うので対象外
allowed-tools: Bash(playwright-cli:*) Bash(rm:*) Read
---

# Web ページ取得（playwright-cli／Claude in Chrome）

## 使う条件

普通の公開記事・静的サイトは **必ず WebFetch を先に試す**。このスキルを使うのは、WebFetch が失敗した（エラー・要約しか返らない・403 / JS ブロック）時、著者が「ブラウザで」「playwright で」「Chrome で」と指示した時、X（旧 Twitter）などログイン必須のページを読む時だけ。自分の Wix ブログの記事・下書きは wix-sync で取る。

## 公開ページ（headless）

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

## ログイン必須ページ（著者の Chrome）

Claude in Chrome（`mcp__claude-in-chrome__*`）で著者の Chrome を操作し、そのログイン状態のまま読む。

1. ツールが deferred なら、ToolSearch を1回で `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp` のようにまとめて読み込む
2. `tabs_context_mcp` で状況を見て、`tabs_create_mcp` で新しいタブを作り、`navigate` で URL を開く
3. `get_page_text` で本文を読む。構造や特定要素が要る時は `read_page`
4. 読み終えたら、自分が開いたタブだけを `tabs_close_mcp` で閉じる

**読むだけに限る。** 投稿・いいね・フォロー・フォーム送信・設定変更は一切しない。著者がもともと開いていたタブは閉じない。未ログインなら著者に Chrome でのログインを頼んで待つ。Claude in Chrome が無い環境（CLI 等）では「Claude in Chrome が無いので取得できない」と伝えて止め、playwright-cli でログイン手順を自作しない。

## 作業ファイルとクリーンアップ

playwright-cli の作業ファイル（スナップショット、コンソールログ、中間データ）は `.playwright-cli/`（プロジェクトルート、gitignore 済み）に溜まる。このスキルが書く一時ファイルもそこに集約し、他のディレクトリに散らかさない。

取得作業が一段落したら、Claude が自分で実行する:

```bash
playwright-cli close-all   # 全セッション終了
rm -rf .playwright-cli/    # 作業ファイルを一掃
```

タイミングは、著者が「ブラウザはもういい」と伝えた時、`/article` の掘る工程・書く工程を終えて取得が一通り済んだ時、会話の終わりが近い時。Claude in Chrome 側は著者の Chrome なので対象外（閉じるのは自分が開いたタブだけ）。

## 注意

- playwright-cli は headless 既定。`--headed` は描画を目で確かめる時だけ
- スクリーンショットは `playwright-cli screenshot --filename=output/<dir>/<name>.png` のように **`.playwright-cli/` の外**へ明示的に保存する（クリーンアップで消えないように）
- 永続プロファイル（`--profile=...`）は使わない。Cookie はディスクに残さない方針

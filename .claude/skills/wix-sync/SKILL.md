---
name: wix-sync
description: 記事の Markdown（draft.md・draft_user.md）と Wix ブログの下書きを Wix Blog API で行き来させる。draft.md を画像込みで Wix の下書きとして作る（push）、著者が Wix で直した下書きや公開版を draft_user.md・published.md に取り込む（pull）。「Wix に流し込んで」「Wix に下書きを作って」「Wix に反映して」「Wix から取り込んで」「Wix の最新に揃えて」「公開版を取ってきて」と言われた時に使う。公開そのものはしない
argument-hint: "[テーマ] [push|pull|update|published](任意)"
allowed-tools: Bash(node:*) Read
---

# Wix との同期

記事の作業層（`output/{yyyymmdd}_{テーマ}/`、以降 `$OUTPUT_DIR`）と Wix ブログの下書きを、Wix Blog API で行き来させる。手作業の転記・画像の差し込み・ブラウザ経由の取り込みを置き換える。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が操作。どちらも任意）。操作が無ければ著者の発言から決める。スクリプトは `node ${CLAUDE_SKILL_DIR}/scripts/wix-sync.mjs <コマンド>` で実行し、使い方はスクリプト冒頭のコメントにある。

## 規範

- **Wix に書くのは著者の承認を得てから**。push（新規・更新とも）の前に、何をどの下書きへ流すかを示して承認を取る。pull は Wix を読むだけなので承認は要らない。
- **流す元は著者が選ぶ**。`draft.md`（AI 版）を流すと、AI の文が Wix 上の初期値になる。承認を取る時に「自分の言葉で書き直す下地として流す」ことを一言添える。`draft.md` から作った下書きのタイトルには `[AI下書き]` が付く。外すのは著者。
- **公開はしない**。公開・公開予約、および公開済み記事の書き換えは、Wix の画面で著者が行う。スクリプトにもその経路は無い。
- **Wix 側が正**。著者が Wix で書き始めたら、ローカルからの更新（`push --update`）は次の順でだけ行う: pull → 差分を著者に見せる（`/revise` の show）→ 承認。
- **スクリプトが止まったら著者に返す**。止まるのは、前回の同期以降に Wix 側かローカル側で直しが入った時。理由をそのまま伝え、どちらを正にするかを著者が決める。`--force` は著者の指示がある時だけ付ける。
- **全文を会話に貼らない**。返すのは、スクリプトの出力の要約（字数・見出し数・図の数）と編集画面の URL。

## 手順

### 準備（初回だけ）

1. `check` で認証を確かめる。失敗したら README「Wix 連携」の手順で `.env` を置いてもらう。
2. 記事が Wix の投稿に結び付いているかを見る（`$OUTPUT_DIR/wix.json` の `draftPostId`）。
   - 結び付いておらず、著者が Wix で既に書き始めている、または公開済みの場合: `list` で最近の投稿を出し、著者にどれかを確かめてから `link $OUTPUT_DIR <postId>` を実行する。
   - これから下書きを作る場合: 結び付けは push が行う。

### 下書きを作る（push）

1. `push $OUTPUT_DIR/draft.md --dry-run` で変換を試し、構造の要約（見出し・図の数）と、未作図のプレースホルダーの有無を確かめる。
2. 著者に「何を流すか・図の数・タイトルに付く印」を示して承認を取る。
3. `push $OUTPUT_DIR/draft.md` を実行し、出力の編集画面の URL を著者に返す。

### 取り込む（pull）

- 下書きの最新: `pull $OUTPUT_DIR` を実行する。`draft_user.md` が上書きされる。
- 公開版: `pull $OUTPUT_DIR --published` を実行する。`published.md` が上書きされ、出力に slug が出る。

取り込みの後、見出しの数と末尾の段落が Wix の画面と合っているかを1度確かめる。

画像は次のように戻る。

- push で上げた画像: `![キャプション](images/...)`
- 著者が Wix で入れた画像: `<!-- 画像: キャプション -->` とキャプションの行（fetch-page と同じ形）。どの画像かは `wix.json` に控えてあり、次の push で同じ画像に戻る。

### ローカルの直しを Wix に送る（update）

`/revise` の apply などで `draft_user.md` を直し、Wix へ反映したい時に使う。

1. 著者に送る差分を示して承認を取る。
2. `push $OUTPUT_DIR/draft_user.md --update` を実行する。置き換わるのは本文だけで、タイトルは Wix 側のまま。
3. Wix 側に取り込んでいない直しがあると、スクリプトは止まる。その時は pull して差分を見せ、手順1からやり直す。

## 制約

- **インラインコード**: 装飾が落ち、地の文になる（変換 API の挙動）。
- **太字以外の装飾**: 文字色・サイズによる強調は Markdown に戻らない。
- **公開済み記事の更新**: できない。Wix の画面で直し、`pull --published` で取り込む。
- **画像形式**: png・jpg・gif・webp に限る。
- **API が使えない時**: `/fetch-page` の Wix の手順（編集画面・yarakawa.com）が予備になる。

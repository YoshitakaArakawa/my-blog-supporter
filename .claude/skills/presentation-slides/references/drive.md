---
purpose: presentation-slides が Google ドライブに置くもの（テンプレートのデッキ・組んだデッキ・画像）と、ローカルの図を Slides に差し込む経路、connector が使えない時の扱い
sources:
  - https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request#createimagerequest
  - https://developers.google.com/workspace/slides/release-notes
  - https://developers.google.com/workspace/guides/configure-mcp-servers
fetched_at: 2026-11-08
note: Drive の実 ID は gitignore の drive.local.json にだけ書く。手順は Drive・Slides の connector（copy_file・update_file・share_file・read_presentation・update_presentation）で行う
---

# Drive と画像

## 目次

- 置き場と登録のファイル
- テンプレートのデッキを置く
- ローカルの図を差し込む（一時公開）
- 図を Drive に置く
- connector が使えない時

## 置き場と登録のファイル

実 ID は `${CLAUDE_SKILL_DIR}/drive.local.json`（gitignore）に書く。書式は同じ階層の `drive.example.json`。

| キー | 中身 | 共有 |
|---|---|---|
| `templates` | テンプレートの名前 → テンプレートのデッキの ID | 著者だけ |
| `deckFolderId` | 組んだデッキを置くフォルダ | 著者だけ |
| `imageFolderId` | 差し込む図の複製を置くフォルダ | 著者だけ |
| `publicFolderId` | 一時公開のフォルダ（スキル専用。ふだんは空） | リンクを知っている全員（閲覧者） |

無いキーは、初めて要る時に著者に聞いて作る。フォルダを作るのは承認なしでよい。`publicFolderId` のフォルダを「リンクを知っている全員」にする時だけ、著者の承認を取る（スキル専用で、ふだん空であることを添える）。

## テンプレートのデッキを置く

レイアウトとプレースホルダは API では作れず、.pptx の変換でしか作れない。

1. `make-pptx.mjs template --template {名前} --out {scratchpad}/テンプレート_{名前}.pptx` で .pptx を作る
2. 著者がブラウザで Drive に上げ、開いて「ファイル > Google スライドとして保存」する（1回だけ）。AI の `create_file` は base64 を AI が書き出すので、約 6KB（base64 で約 8 千字）を超えると写し間違いで失敗する
3. 変換されたデッキを読み出し（マスクなし）、`sync-template.mjs --read <読み出し> --samples` を実行する。要求が 0 件なら定義どおり。あれば送る
4. デッキの ID を `drive.local.json` の `templates` に書く

定義の書式（位置・書体・色・背景）だけを変えた時は、手順 3 だけで同期する。レイアウトを足す・消す時は 1 からやり直す。

## ローカルの図を差し込む（一時公開）

`createImage` は、Google が認証なしで取れる URL からしか画像を取らない。非公開の Drive のファイルは拒否される。差し込んだ画像はデッキの中に複製されるので、差し込んだ後は元を非公開に戻してよい。

組上の承認を取る時に、一時公開する図の一覧を示す。承認の後:

1. 図を Drive に置く（下の「図を Drive に置く」）
2. 図ごとに、`copy_file` で一時公開のフォルダへ複製する（`parentId` は `publicFolderId`）。複製はフォルダの共有を継ぎ、リンクで取れるようになる。著者が上げた元のファイルは動かさない
3. 対応の JSON（`{"figures/x.png": "https://lh3.googleusercontent.com/d/{複製の ID}"}`）を scratchpad に書き、`build-slides.mjs slides --images` に渡して組上の1回目を送る
4. 送ったらすぐ、複製を `update_file` で `imageFolderId` へ移す。公開は数十秒で終わる
5. `build-slides.mjs record --images` で、対応を slides.json に残す。組み直す時は、同じ複製を 2〜4 で使い回す

公開の性質:

- connector には共有を外す道具が無い。フォルダの出し入れなら、ファイルに直接の共有を付けないので、外す操作が要らない
- 出した直後から、`lh3` も `uc?export=download` も Google のログイン画面に飛び、画像は返らない
- ゴミ箱に入れても、完全に消えるまで共有は止まらない。一時公開のフォルダに物を残さない
- スライドの画像の `sourceUrl` に複製の ID が残る。デッキを共有する相手には見える
- 上げる前に、画面に写る URL・サイトの識別子・社外秘の数字が無いかを確かめる

公開を避けたい回は、下の「経路 C」で組む。

## 図を Drive に置く

| 手段 | 著者の作業 | 使う時 |
|---|---|---|
| Google ドライブ（パソコン版）の同期フォルダ | パソコン版を起動しておく | 起動していれば既定。AI が `figures/` の PNG を同期フォルダに写し、`search_files` で上がったことを確かめる |
| 著者のアップロード | `figures/` をブラウザで Drive に上げる（組上ごとに1回） | パソコン版が起動していない時 |

## connector が使えない時

Google は、Workspace の MCP サーバー（Drive・Slides など）への要求のうち、AI エージェント用の指定（Google Auth Platform の「Clients」で「Use this client for an AI-powered agent」）が無い OAuth クライアントからのものを拒否すると告知している（Slides のリリースノート 20261012 の項）。

- Slides か Drive の connector が認可の理由で拒否したら、組上を止めて著者に伝える。黙って別の経路に切り替えない
- connector の一覧から足した connector なら、著者に再接続を案内する
- 著者が自分の Google Cloud の OAuth クライアントで足したカスタムの connector なら、上の指定を案内する。指定の期限を過ぎた既存のクライアントには後から指定できないので、指定した新しいクライアントを作る

**経路 C**（代わりの経路。著者が選んだ時だけ）:

1. `make-pptx.mjs deck $OUTPUT_DIR/deck.md --out {scratchpad}/{名前}.pptx` で、使うレイアウト・スライド・ノート・図（埋め込み）ごと .pptx を作る
2. 著者が Drive に上げ、開いて「Google スライドとして保存」する
3. connector が使えるようになったら、読み出して `check-slides.mjs` で点検し、`build-slides.mjs record` で slides.json を作る

出来上がりは既定の経路と同じ形（レイアウト・プレースホルダ・ノートが残る）で、画像の公開も要らない。ただし Drive に上げる段に、毎回著者の手が要る。.pptx を `importSlides` の取り込み元にはできない（通らない）。

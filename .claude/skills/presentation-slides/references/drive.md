---
purpose: presentation-slides が Google ドライブに置くもの（テンプレートのデッキ・組んだデッキ・図の複製）と、承認で示す中身、ローカルの図を Slides に差し込む経路、connector が使えない時の扱い
sources:
  - https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request#createimagerequest
  - https://developers.google.com/workspace/slides/release-notes
  - https://developers.google.com/workspace/guides/configure-mcp-servers
fetched_at: 2026-11-08
note: Drive の実 ID は gitignore の drive.local.json にだけ書く。手順は Drive・Slides の connector（copy_file・update_file・share_file・search_files・read_presentation・update_presentation）で行う
---

# Drive と画像

## 目次

- 置き場と登録のファイル
- 承認で示す中身
- テンプレートのデッキを置く
- ローカルの図を差し込む（一時公開）
- connector が使えない時

## 置き場と登録のファイル

実 ID は `${CLAUDE_SKILL_DIR}/drive.local.json`（gitignore）に書く。書式は同じ階層の `drive.example.json`。

| キー | 中身 | 共有 |
|---|---|---|
| `templates` | テンプレートの名前 → テンプレートのデッキの ID | 著者だけ |
| `deckFolderId` | 組んだデッキを置くフォルダ | 著者だけ |
| `imageFolderId` | 図と、その複製を置くフォルダ | 著者だけ |
| `publicFolderId` | 一時公開のフォルダ（スキル専用。ふだんは空） | リンクを知っている全員（閲覧者） |

無いキーは、初めて要る時に著者に聞いて作る。フォルダを作るのは承認なしでよい。`publicFolderId` のフォルダを「リンクを知っている全員」にする時は、スキル専用でふだん空であることを添えて承認を取る。

## 承認で示す中身

| 操作 | 示すもの |
|---|---|
| 組上 | 作るデッキの名前（`{yyyymmdd} {デッキのタイトル}`）・枚数・使うテンプレート・一時公開する図の一覧。一時公開のフォルダを初めて共有する時は、そのことも |
| テンプレートのデッキの同期 | `sync-template.mjs` の要求の件数と中身（どのレイアウトの何を変えるか） |
| 全体デッキへの取り込み | 取り込む枚数・位置・`preserveTheme` |
| ゴミ箱への移動 | ファイルの一覧 |

## テンプレートのデッキを置く

レイアウトとプレースホルダは API では作れず、.pptx の変換でしか作れない。

1. `make-pptx.mjs template --template {名前} --out {scratchpad}/テンプレート_{名前}.pptx` で .pptx を作る
2. 著者がブラウザで Drive に上げ、開いて「ファイル > Google スライドとして保存」する（1回だけ）。AI の `create_file` は base64 を AI が書き出すので、数 KB でも写し間違いで落ちることがある。テンプレートと図の上げには使わない
3. 変換されたデッキを読み出し、`sync-template.mjs --read <読み出し> --samples` を実行する。要求が 0 件なら定義どおり。あれば件数と中身を示して承認を得てから送る
4. デッキの ID を `drive.local.json` の `templates` に書く

定義の書式（位置・書体・色・背景）や見本の文だけを変えた時は、手順 3 だけで同期する。レイアウトを足す・消す時は 1 からやり直す。

## ローカルの図を差し込む（一時公開）

`createImage` は、Google が認証なしで取れる URL からしか画像を取らない。差し込んだ画像はデッキの中に複製されるので、差し込んだ後は元を非公開に戻してよい。

組上の承認の後:

1. 著者に、`見せる:` の PNG（`figures/` の外の画像も含む）を `imageFolderId` のフォルダへブラウザで上げてもらう。上がったら `search_files`（`parentId` と `title`）でファイルの ID を引く。Google ドライブ（パソコン版）の同期フォルダに置く手もあるが、まだ試していない
2. 要求を作る直前に、図ごとに `copy_file` で一時公開のフォルダへ複製する（`parentId` は `publicFolderId`）。複製はフォルダの共有を継ぎ、リンクで取れるようになる。著者が上げた元のファイルは動かさない
3. 対応の JSON（`{"figures/x.png": "https://lh3.googleusercontent.com/d/{複製の ID}"}`）を scratchpad に書き、組上の要求を作って送る
4. 送ったらすぐ、複製を `update_file` で `imageFolderId` へ移す。公開は、要求を写す時間を含めて1〜2分で終わる
5. `search_files`（`parentId = publicFolderId`）で一時公開のフォルダが空になったことを確かめる。残っていたら `imageFolderId` へ移し、著者に伝える。次の組上の前にも確かめる
6. `build-slides.mjs record --images` で、URL とその時の図の SHA-1 を slides.json に残す。組み直す時は、図の SHA-1 が同じなら、その複製を 2〜4 で使い回す。違えば新しく上げてもらう

公開の性質:

- connector には共有を外す道具が無い。フォルダの出し入れなら、ファイルに直接の共有を付けないので、外す操作が要らない
- 出した直後から、`lh3` も `uc?export=download` も Google のログイン画面に飛び、画像は返らない
- ゴミ箱に入れても、完全に消えるまで共有は止まらない。一時公開のフォルダに物を残さない
- スライドの画像の `sourceUrl` に複製の ID が残る。デッキを共有する相手には見える
- 上げる前に、画面に写る URL・サイトの識別子・社外秘の数字が無いかを確かめる

公開を避けたい回は、下の「経路 C」で組む。

## connector が使えない時

Google は、Workspace の MCP サーバー（Drive・Slides など）への要求のうち、AI エージェント用の指定（Google Auth Platform の「Clients」で「Use this client for an AI-powered agent」）が無い OAuth クライアントからのものを拒否すると告知している（Slides のリリースノート 20261012 の項）。

- Slides か Drive の connector が認可の理由で拒否したら、組上を止めて著者に伝える
- connector の一覧から足した connector なら、著者に再接続を案内する
- 著者が自分の Google Cloud の OAuth クライアントで足したカスタムの connector なら、上の指定を案内する。指定の期限を過ぎた既存のクライアントには後から指定できないので、指定した新しいクライアントを作る

**経路 C**（代わりの経路。著者が選んだ時だけ）:

1. `make-pptx.mjs deck $OUTPUT_DIR/deck.md --out {scratchpad}/{名前}.pptx` で、使うレイアウト・スライド・図（埋め込み）ごと .pptx を作る
2. 著者が Drive に上げ、開いて「Google スライドとして保存」する
3. connector が使えるようになったら、読み出して `check-slides.mjs` で点検し、`build-slides.mjs record --by-order` で slides.json を作る（変換したデッキのスライドの ID は変換器が振るので、並び順で対応させる）

出来上がりは既定の経路と同じ形（レイアウト・プレースホルダが残る）で、画像の公開も要らない。ただし Drive に上げる段に、毎回著者の手が要る。経路 C は make-pptx で作るテンプレート向けで、外から与えるテンプレートには使えない。

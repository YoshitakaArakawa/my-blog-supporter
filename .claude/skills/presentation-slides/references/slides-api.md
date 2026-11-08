---
purpose: presentation-slides のスクリプトの要求を、Slides の connector で送る時の実務の注意（読み出し・送り方・要求ごとの振る舞い）
sources:
  - https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
  - https://developers.google.com/workspace/slides/api/reference/mcp/tools_list/update_presentation
fetched_at: 2026-11-08
note: 一般の規則（field mask・writeControl・EMU と scale）は組み込みスキル google-workspace の Slides の reference にある。ここには、このスキルの組上・点検・取り込みで効く振る舞いだけを置く
---

# Slides の API の実務の注意

## 読み出し

- スクリプトに渡す読み出しは、マスクなしの `read_presentation`。10万字を超えるので app がファイルに保存し、そのパスが返る。そのパスをそのまま `--read` に渡し、中身を写し直さない
- revisionId だけ要る時は、`fields: ["revisionId"]` のマスクで読む
- Drive の connector の `canEdit` が false でも（著者が上げたデッキなど）、Slides の connector では書ける

## 送り方

- スクリプトの出力（`requests` の配列）を `update_presentation` に写して送る。1回は 20KB 程度までにする。5枚の組上は1回目が約 6 千字、2回目（台詞と見本の削除）が約 1 千字
- `writeControl.requiredRevisionId` には、送る直前の読み出しの revisionId を付ける。拒否されたら読み出し直して要求を作り直す
- 1回の要求は全部通るか全部通らないか。失敗したら、名指しされた要求を直して全部を送り直す

## 要求ごとの振る舞い

| 要求 | 振る舞い |
|---|---|
| `createSlide`（`layoutId` と `placeholderIdMappings`） | レイアウトのプレースホルダがスライドに作られ、書式はレイアウトから継ぐ。番号は同じ種類の中の並び順（.pptx の番号ではない）。スライド番号などの自動のプレースホルダは対応に入れない |
| `insertText` | 段落は `\n` で区切る。段落の終わりの改行には既定の 14pt Arial が付くので、点検では見える文字のある部分だけを数える |
| `deleteObject`（空のプレースホルダ） | 使わないプレースホルダは消す。残すと編集画面に「クリックして追加」が出る |
| `createImage` | 指定の枠の中に、縦横比を保って中央に置く。`sourceUrl` に URL（Drive なら複製のファイル ID）が残る。非公開の Drive の画像は拒否される |
| `updateSlidesPosition` | 指定したスライドを今の並びのまま塊で動かす。並べ替える時は1枚ずつ前から置く |
| `importSlides`（MCP のみ） | 別のデッキからスライドを取り込む。振る舞いは template.md の「全体デッキへの入れ方」 |

## 文字の測り方

- Slides の行間 100% は文字の大きさの 1.2 倍で、段落の後の間（`spaceBelow`）はそれに足される。HTML の一覧と点検は同じ行間で測り、改行の位置まで Slides と一致する（Noto Sans JP の場合）
- Slides は文字を縮めて枠に収めない（autofit なし）。溢れた文字は枠の外にはみ出して描かれ、下の要素に重なる
- PDF に書き出して `pdftotext -bbox` で行の位置を取る測り方もあるが、漢字が康熙部首の字で返り、下揃えの枠は上へ溢れるので、照合に手当てが要る。点検には使わない

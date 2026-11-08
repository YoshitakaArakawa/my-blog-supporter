---
purpose: presentation-slides の組上・点検・取り込みで効く、Slides の connector の振る舞い
sources:
  - https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
  - https://developers.google.com/workspace/slides/api/reference/mcp/tools_list/update_presentation
fetched_at: 2026-11-08
note: 一般の規則（writeControl・要求は全部通るか全部通らないか・EMU と scale・空のプレースホルダ・並べ替え・文字を縮めない）は組み込みスキル google-workspace の Slides の reference にあり、ここでは繰り返さない。ここには、このスキルに特有の扱いだけを置く
---

# Slides の API の、このスキルに特有の扱い

## 読み出し

- スクリプトに渡す読み出しは、マスクなしの `read_presentation` にする。スクリプトはマスターとレイアウトまでたどって書式を解くので、google-workspace の「必ずマスクを付ける」より、こちらを優先する。10万字を超えるので app がファイルに保存し、そのパスが返る。そのパスをそのまま `--read` に渡し、中身を写し直さない
- revisionId だけ要る時は、`fields: ["revisionId"]` のマスクで読む
- Drive の connector で `canEdit` が false のデッキ（著者がブラウザで上げたものなど）にも、Slides の connector では書ける

## 送り方

- スクリプトの出力（`requests` の配列）を `update_presentation` に写して送る。5枚の組上は1回の要求で約6千字だった。枚数が多くて大きい時は、スライドの区切りで分け、各回の前に読み出し直して revisionId を付ける

## 要求ごとの振る舞い

| 要求 | 振る舞い |
|---|---|
| `createSlide`（`layoutId` と `placeholderIdMappings`） | レイアウトのプレースホルダがスライドに作られ、書式はレイアウトから継ぐ。スライド番号などの自動のプレースホルダは対応に入れず、消さない |
| `insertText` | 段落は `\n` で区切る。段落の終わりの改行には既定の 14pt Arial が付くので、点検では見える文字のある部分だけを数える |
| `createImage` | 指定の枠の中に、縦横比を保って中央に置く。だから図は枠と同じ縦横比で描く（illustrate のスライド用の寸法） |
| `importSlides`（MCP のみ） | 別のデッキからスライドを取り込む。振る舞いは template.md の「全体デッキへの入れ方」 |

## 文字の測り方

- Slides の行間 100% は文字の大きさの 1.2 倍で、段落の後の間（`spaceBelow`）はそれに足される。HTML の一覧と点検は同じ行間で測り、改行の位置まで Slides と一致する（Noto Sans JP の場合）
- PDF に書き出して `pdftotext -bbox` で行の位置を取る測り方もあるが、漢字が康熙部首の字で返り、下揃えの枠は上へ溢れるので、照合に手当てが要る。点検には使わない

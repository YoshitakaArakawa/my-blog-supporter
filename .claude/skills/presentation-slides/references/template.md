---
purpose: テンプレートの定義（template.json）の書式と、内蔵のテンプレート・外から与えるテンプレート・共同登壇の全体デッキの扱い。定義は HTML の一覧・組上の要求・点検・テンプレートの .pptx の正本
note: 定義の正本は templates/{名前}/template.json。内蔵の navy だけを commit し、外から与えるテンプレートは gitignore のフォルダに置く。Drive の ID は定義に書かず drive.local.json に書く（drive.md）
---

# テンプレート

## 目次

- 定義の書式
- 役割 → レイアウトの対応
- 内蔵のテンプレート（navy）
- 外から与えるテンプレート
- 全体デッキへの入れ方（共同登壇）

## 定義の書式

1つの定義から、HTML の一覧（`render-slides.mjs`）・組上の要求（`build-slides.mjs`）・点検の基準（`check-slides.mjs`）を作る。make-pptx で作るテンプレートは、テンプレートの .pptx（`make-pptx.mjs template`）とデッキの同期（`sync-template.mjs`）も同じ定義から作る。

| キー | 中身 |
|---|---|
| `id`・`label`・`note` | 名前（templates/ のフォルダ名と同じ）・表示名・説明 |
| `external` | 外から与えるテンプレートなら true（`import-template.mjs` が書く） |
| `page` | ページの幅と高さ（in）。16:9 は 10 × 5.625 |
| `font` | 書体。Google スライドにある書体にする（無い書体は置き換わり、改行と重なりが崩れる） |
| `colors` | 色の名前 → `#RRGGBB`。箱の `color` と `background` は名前か `#RRGGBB` |
| `master` | マスターの書式を取るレイアウト（見出しと本文の箱を持つ物）。make-pptx と sync-template が使う |
| `theme` | テーマの配色に使う色の名前（`dk1`・`dk2`・`lt2`・`accent1`・`accent2`）。無ければ ink・navy・paper・navy・muted |
| `inset` | 文字の箱の内側の余白（in）。Google スライドの既定は左右 0.1・上下 0.05 |
| `lineSpacing` | 行間（%）。100 は文字の大きさの 1.2 倍。箱ごとの `lineSpacing` が優先 |
| `todoFrame` | 仮置きの枠の文字の大きさと色（`color` は明るい背景、`colorOnDark` は暗い背景。明暗は背景の輝度で決める） |
| `layouts` | レイアウトの名前 → `background`（`backgroundImage` なら画像の背景）・`boxes`・`frame`・`frameNoSource` |
| `roles` | deck.md の `役割:` → レイアウトの名前（次節） |
| `samples` | レイアウトごとの見本の文字と、ノートの用途（テンプレートのデッキの見本スライドになる） |

`boxes` は枠の名前（`title`・`body`・`source`）→ 箱。箱は次を持つ。

- `ph`（プレースホルダの種類: `TITLE`・`CENTERED_TITLE`・`SUBTITLE`・`BODY`）と、外から与えるテンプレートでは `ph_index`（読み出した番号）
- 位置と大きさ（`x`・`y`・`w`・`h`、in）
- `size`（pt）・`bold`・`color`・`font`・`align`（`START`・`CENTER`・`END`）・`anchor`（`TOP`・`MIDDLE`・`BOTTOM`）・`spaceBelow`（pt）・`lineSpacing`・`maxLines`

deck.md の見出し（`画面:` か `##`、`／` で改行）は `title`、`本文:` は `body`、`出典:` は `source` に入る。見出しの枠が無いレイアウトでは、`本文:` が空なら見出しを `body` に入れる。

Google スライドは、変換した .pptx のプレースホルダの番号を引き継がず、同じ種類の中の並び順で振り直す。だから make-pptx で作るテンプレートでは、`boxes` の並び順が組上で使う番号になる。並びを変えたら .pptx から作り直す。

`frame` は `見せる:` の画像か仮置きの枠を置く場所、`frameNoSource` は出典が無い時の広い枠（任意）。文字の箱と枠が重なると、sync-template が知らせる。

## 役割 → レイアウトの対応

`roles` の値は、レイアウトの名前か、中身で分ける `{ "text": …, "visual": …, "both": … }`。

- `text`: `本文:` だけ（`見せる:` なし）
- `visual`: `見せる:` だけ
- `both`: 両方

`役割:` が `roles` に無い時は「主張」の対応を使う。レイアウトはデッキの中で名前で引く（ID は複製しても変わらないが、名前なら外のテンプレートにも同じ仕組みが効く）。

## 内蔵のテンプレート（navy）

8つのレイアウトを持つ。見た目の方針は [visual-policy.md](visual-policy.md)。

| レイアウト | 使う役割 | 枠 |
|---|---|---|
| 表紙 | 表紙 | 見出し・副題（`本文:`）・右下の写真の枠 |
| 区切り | 区切り | 見出しだけを中央に |
| 終わり | 終わり | 見出し・呼びかけ（`本文:`） |
| 見出しと本文 | 主張・図・まとめ（本文だけ） | 見出し・本文・出典 |
| 見出しと図 | 主張・図・数字・まとめ（見せるだけ） | 見出し・図・出典 |
| 文と図 | 主張・図・数字・まとめ（両方） | 見出し・左の本文・右の図・出典 |
| 見出し1行と画面 | 画面 | 1行の見出し・画面いっぱいの画像・出典 |
| 大きな一文 | 引用・問い・数字（本文だけ） | 一文を大きく（`##` だけなら見出しを出す）・出典 |

## 外から与えるテンプレート

主催がテンプレートを決める回は、主催のデッキを定義に起こして登録する。主催のテンプレートの書式は直さない。

1. 主催のテンプレートのデッキ（著者が Drive に置いたもの）をマスクなしで読み出す
2. `import-template.mjs --read <読み出し> --id <名前> --min <event.md の最小文字>` で `templates/{名前}/template.json` の下書きを起こす。最小文字を下回る箱は stderr に出る
3. AI が `roles` と `frame` の案を直す。見本スライドのノートに用途が書いてあれば手がかりにする。最小文字を下回るレイアウトは対応に使わない
4. `render-slides.mjs --template {名前} --measure --out preview/slides_{名前}.html` で一覧を作り、著者が確かめる
5. テンプレートのデッキの ID を `drive.local.json` の `templates` に書く。組むのは、このデッキの複製だけ

既定のテーマ（Simple Light）のように見出しの枠が1行分しかないテンプレートでは、2行の見出しが溢れる。一覧が組む前に示すので、見出しを短くするか、対応を別のレイアウトに替える。

## 全体デッキへの入れ方（共同登壇）

全体デッキは自分のデッキではない。組むのはいつもテンプレートの複製で、全体デッキへはその後 `importSlides` で取り込む。取り込む前に、枚数・位置・`preserveTheme` を示して著者の承認を取る。

| 回の形 | 入れ方 |
|---|---|
| 各自の見た目のまま入れる | 自分のテンプレートの複製に組み、点検してから、`preserveTheme: "USE_SOURCE_THEME"` で取り込む |
| 主催のテンプレートに合わせる | 主催のテンプレートを登録し、その複製に組み、点検してから取り込む。全体デッキが同じテンプレートなら `USE_DESTINATION_THEME` で同じ名前のレイアウトに寄せられる見込みがある（未試験） |

`importSlides` の振る舞い（Slides の MCP にだけある要求）:

- `USE_SOURCE_THEME`: 取り込み元のマスターと全レイアウトが加わり、見た目（書体・大きさ・背景）・画像がそのまま運ばれる。1枚だけ取り込んでもマスターはまるごと加わる
- `USE_DESTINATION_THEME`: レイアウトが取り込み先のマスターの下に加わる。レイアウトに直接の書式は残り、継いでいた書式は取り込み先に置き換わる。取り込み先に同じ名前のレイアウトがあると、そちらに寄せる
- `sourceSlides` の `destinationObjectIds` で指定した ID は保たれ、指定しない ID は振り直される。`importIndex` で位置を決める
- .pptx（Drive のファイル）は取り込み元にできない

取り込み（pull）は、自分で組んだデッキから行う。全体デッキの直しを deck_user.md に戻したい時は、自分のデッキにも同じ直しを入れてから取り込む。

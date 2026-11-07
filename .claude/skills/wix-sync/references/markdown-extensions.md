---
purpose: 記事の Markdown に Wix の機能（文字色・下線・画像の幅・埋め込み）を書く拡張記法と、記法の無い装飾の控えの決まり。wix-sync の push・pull、render-preview、lint-draft が同じ記法を読む
note: 実装の正本は scripts/lib/wix-markdown.mjs、名前付きの色の正本は scripts/wix-styles.json。設計の経緯は docs/design/20261107_wix-sync-extended-markdown.md
---

# Wix に送る Markdown の拡張記法

記事の Markdown（draft.md・draft_user.md）に、Wix の機能を書くための記法。pull はこの記法で書き、push はこの記法を Wix のノードに変える。プレビュー（`scripts/render-preview.mjs`）と lint（`scripts/lint-draft.mjs`）も同じ解析（`scripts/lib/wix-markdown.mjs`）を使う。

## 目次

- [文字色と下線](#文字色と下線)
- [画像](#画像)
- [区切り線](#区切り線)
- [埋め込み](#埋め込み)
- [Wix の形を保つ印](#wix-の形を保つ印)
- [書けないものと控え](#書けないものと控え)
- [エスケープ](#エスケープ)
- [旧形式](#旧形式)

## 文字色と下線

```markdown
この記事では[スマホのブラウザだけ使って]{.accent}、ダッシュボードを作ります。
**[サイトURIは、後でサインインするときに使います。]{.accent}**
[下線だけ]{.u}、[色と下線]{.accent .u}、[名前の無い色]{color=#1565C0}
```

- `{.名前}` の名前と色は `scripts/wix-styles.json` が正本。今は `.accent`（`#E65100`）だけ。`.u` は下線
- `{color=#RRGGBB}` は名前の無い色。pull は、名前に無い色をこの形で書く
- 太字・斜体と併せる時は外側に `**`・`*` を置く
- 知らない名前（`{.red}` など）は push が止まる。プレビューと lint は字面のまま出す
- リンク `[テキスト](URL)` の下線は書かない。push が全リンクに付ける（Wix の編集画面と同じ形）
- 色・下線は著者の表現の判断。AI が書く draft.md には足さない

## 画像

```markdown
![手順の画面](images/step-01.png "ページを開いたら「参加」を押す"){width=small}
![](wix:xxxxxx_0123456789abcdef~mv2.png){width=content align=left}
![参考](wix:xxxxxx_fedcba9876543210~mv2.png "参考：[スキルとは何ですか？](https://example.com/skills)")
```

- 画像の行は1行単独で書く。キャプションは title（`"…"`）で、中のリンク・太字も効く。title が無ければ alt がキャプションになる。title 中の `"` は `\"`
- `wix:<Media の ID>` は著者が Wix で入れた画像。大きさは pull が `wix.json` に控える
- `{width=small|content|full|original|<数値>}`・`{align=left|center|right}`。省略時は、縦長なら small、それ以外は content・中央
- pull は、幅が省略時と違う時だけ `{width=…}` を書く

## 区切り線

`---` は Wix の「LARGE」。`---{width=medium}`・`---{width=small}` で幅を変える。

## 埋め込み

```markdown
::x{url="https://x.com/example/status/1234567890" width=500 height=700}
::wix{type=HTML id=abcd1234567}
```

- `::x` は X のポスト。`width`・`height` は Wix の枠の大きさで、省略時は 500・700。新しく書いた `::x` の枠の高さは仮の値なので、Wix の画面でポストの長さに合わせて調整し、pull で取り込む
- pull で取った `::x` は、ポストの本文入りの HTML を `wix.json` に控えてあり、push で同じ HTML に戻る
- `::wix` は Markdown にできない Wix のノード（X 以外の HTML 埋め込み・動画など）。中身は `wix.json` に控えてある。行を消せばそのノードは消える。中身は Wix の画面で直す

## Wix の形を保つ印

- 既定と違う空段落の数: `<!-- 空段落: 0 -->`。既定は区切り線の前が2つ・直後が0、画像の前後が2つ、それ以外の間が1つ
- 段落の中の改行のうち、先頭・末尾と2つ以上の連続: `<br>`
- コードブロックの中のリンク: `[テキスト](https://…)`。URL が `http://`・`https://` で始まり空白と括弧を含まないものだけをリンクにする

印の行は消さない・動かさない。次の push で同じ形に戻るため。

## 書けないものと控え

次は記法を持たない。pull はこれらを持つ段落を `wix.json` の `controls` に控え、push は同じ段落（文字も記法も同じ）が来たら控えのノードを送る。

- 文字サイズ・背景色・文字揃え（中央揃えなど）
- 画像の切り抜き・枠線
- コードブロックの中の太字・斜体・リンクの無い下線
- 一重以外の区切り線

控えた段落を直す・消すと、その装飾は Markdown から戻せない。push は黙って落とさず止まり、どの段落のどの装飾が消えるかを出す。Wix の画面で直すか、著者が装飾を捨ててよいと言えば `--accept-loss` を付けて送る。

同じ見た目の段落が複数ある時は、何番目かで控えを当てる。控えの段落より前に同じ見た目の段落を足し引きすると、控えが隣の段落に当たることがある。

## エスケープ

地の文の `*`・`` ` ``・`[`・`]`・`\` と、行頭でブロックに読まれる文字（`#`・`>`・`- `・`1. `・`---`・`::` など）は、`\` を前に付けると字面のまま送る。pull は必要な所に `\` を付けて書く。

## 旧形式

記法を入れる前の pull が書いた印。push は読めるが、次の pull で新しい記法に置き換わる。

- `<!-- 画像: キャプション -->` とキャプションの行: Wix 上の画像。pull の時の控えと同じキャプションの印の数が変わっていると、順番で割り当てると別の画像にずれるので push は止まる。Wix の画面で画像を足し消ししてから pull し直す。控えに無いキャプションの印は、未作図のプレースホルダー（`［画像（未作図）: …］`の段落）として送る
- `<!-- Wixのノード: HTML #0 -->`・`<!-- Wixのノード: CODE_BLOCK #0 -->`: Markdown にできないノード。CODE_BLOCK の印の直後のコードブロックを直すと push は止まる
- `<!-- 未対応のノード: … -->`: 中身を控えていなかった頃の印。push は止まる。pull し直す

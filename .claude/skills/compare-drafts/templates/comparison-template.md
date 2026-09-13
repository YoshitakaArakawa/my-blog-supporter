<!-- compare-drafts の出力 comparison.md の骨格。{} を埋めて $OUTPUT_DIR/comparison/comparison.md に書く。
     節の順序と見出しは固定（履歴として横断で読むため）。中身の粒度は記事に合わせて増減してよい。 -->

# Draft 比較・改善フィードバック

- 比較対象: `draft.md` (AI生成) vs {published.md（取得元 URL・取得日・取得手段）/ draft_user.md}
- 生成日: {YYYY-MM-DD}
- 記事テーマ: {core.md の「問い」行から}

## 0. 定量比較

{`lint-draft.mjs --metrics` の表をそのまま貼る}

## I. 差分の解釈（フェーズ1）

### 1. {観察の柱}

- AI版: {…}
- 著者版: {…}
- 観察: {近付くために必要なパターン}

## II. AI が改善すべきパターン（フェーズ2）

1. {パターン名}: {説明}

## III. 変更案の要約（フェーズ3。本文は voice-style-patch.md）

- {ルール N / lint 禁止句 / prh}: {一行要約}

## IV. メタコメント

- {著者側の改善余地として学習対象から外したもの}
- {より根本的な観察・次回以降の宿題}

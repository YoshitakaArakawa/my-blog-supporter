<!-- compare-drafts の出力 voice-style-patch.md の骨格。$OUTPUT_DIR/comparison/voice-style-patch.md に書く。
     承認後にそのまま適用できる粒度で書く（現行文の引用と置換後の文を並べる。「〜を強化する」等の要約で止めない）。
     該当が無い節は見出しごと落とす。 -->

# voice-style / lint への変更案（{YYYY-MM-DD}）

## voice-style.md

### ルール {N}（{タイトル}）

- 現行: > {現行の文をそのまま引用}
- 変更後: > {置き換える文}
- 根拠: {フェーズ1 の観察番号}

### 実例の追加・入れ替え（任意）

- 追加: > {著者版の段落}（見るところ: {…}）
- 入れ替え対象: 実例 {M}（実例は 8 個まで。増やすなら入れ替える）

## scripts/draft-lint.config.json

- bannedPhrases に追加: `{ "pattern": "…", "group": "…", "hint": "…" }`
- thresholds の変更: {キー}: {現行} → {変更後}（根拠: 公開版の実測 {…}）

## scripts/prh.yml

- expected: {…} / patterns: [{…}]

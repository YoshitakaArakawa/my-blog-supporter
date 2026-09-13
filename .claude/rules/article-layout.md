---
paths: ["output/**", "published/**"]
---

# 記事ディレクトリの構成

```
published/{yyyymmdd}_{テーマ}/        公開層。/publish-article が選別・点検した成果物のみ（構成は下記のサブセット）

output/{yyyymmdd}_{テーマ}/           記事ごとの作業ディレクトリ（非公開・gitignore）
  core.md                            著者の核（問い／読者／読後／動機／現在地の5行）。全工程の不変条件。承認後はAIが書き換えない
  references.md                      出典一覧（1行要旨）。掘る工程で必要になった時に追記
  references/                        記事固有の raw 参考資料（PDF・画像・テキスト。第三者素材なので公開層へ出さない）
  thinking.md                        掘った思考（スコープ／各観点／駐車場／素材／未決。最新が正・字数上限あり）
  outline.md                         記事の見出し構成・資料接続（任意。最新が正）
  map.json                           地図の抽出結果（map.html の入力）
  map.html                           計画の見取り図（節目ごとに上書き。正本は Markdown 側）
  draft.md                           記事本文（AI版。/tighten-draft で圧縮済み）
  draft_pre-tighten.md               圧縮前の AI 版（/tighten-draft が退避。比較・巻き戻し用）
  draft_user.md                      記事本文（著者推敲版。書く工程の完了時に空で作成）
  review/                            /review の出力。lens ごとに独立した連番で時系列に蓄積
    critique_01.md / drift_01.md / readers_01.md / author_01.md   lens ごとの指摘
  comparison/                        公開記事とAI版の比較（/compare-drafts 生成。過去記事は直下 comparison.md のままでよい）
    published.md                     公開Web記事の取得スナップショット（原則の比較対象。実ブラウザ取得、毎回上書き）
    comparison.md                    比較・改善FB（定量表＋差分の解釈）
    voice-style-patch.md             voice-style.md / lint 設定への変更案（承認後に反映）

output/_metrics/history.csv          記事ごとの指標の履歴（/compare-drafts が追記。ルールが効いたかを数値で判定する材料）
```

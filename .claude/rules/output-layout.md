---
paths: ["output/**", "published/**"]
---

# 作業ディレクトリの構成

記事も登壇も、1本につき `output/{yyyymmdd}_{テーマ}/` を1つ作る。core.md・thinking.md・references までは共通で、その先は core.md の `形式:` で分かれる（ブログ・登壇それぞれの節）。

```
published/{yyyymmdd}_{テーマ}/        公開層。/blog-promote が選別・点検した記事の成果物のみ（20260912 以降の記事は下記のサブセット。それ以前の記事は旧構成（brief.md・critique/・comparison/ 等）のままで、core.md が無い）。登壇は置かない

output/{yyyymmdd}_{テーマ}/           記事・登壇ごとの作業ディレクトリ（非公開・gitignore）
  core.md                            著者の核（問い／読者／読後／動機／現在地の5行と形式）。全工程の不変条件。承認後はAIが書き換えない
  references.md                      出典一覧（1行要旨）。掘る工程で必要になった時に追記
  references/                        記事固有の raw 参考資料（PDF・画像・テキスト。第三者素材なので公開層へ出さない）
  thinking.md                        掘った思考（スコープ／各観点／駐車場／素材／未決。最新が正）
  outline.md                         記事の見出し構成・資料接続（任意。最新が正）
  map.json                           地図の抽出結果（map.html の入力）
  map.html                           計画の見取り図（節目ごとに上書き。正本は Markdown 側）
  draft.md                           記事本文（AI版）
  preview/index.html                 draft.md の HTML プレビュー（scripts/render-preview.mjs の生成物。手で編集しない）
  experiments/                       構成の議論用に全文を組み直した案（{案名}.md と、render-preview.mjs --out で出した {案名}.html）。差分ではなく全文で見比べる。採用分は draft.md へ反映し、残す義務はない
  images/                            /illustrate と /blog-thumbnail の成果物 PNG だけ（ブログへ載せるもの。改訂は上書き）
    thumbnail.png                    記事のカバー画像（/blog-thumbnail の成果物。ソースは src/thumbnail.html）
    src/                             図のソース（{図名}.svg / .html）
    _archive/                        著者が見比べを求めた時だけ旧版を移す（任意）
  draft_user.md                      記事本文（著者推敲版。書く工程の完了時に空で作成。Wix で書く時は /blog-wix-sync の pull で上書き）
  wix.json                           Wix の投稿との結び付き（投稿 ID・上げた画像の ID・同期時点。/blog-wix-sync が書く。手で編集しない）
  wix-dryrun.json                    /blog-wix-sync push --dry-run の変換結果（確認用。消してよい）
  wix-snapshots/                     /blog-wix-sync が残す Wix の下書きの JSON（pull_*: 取得時、before-push_*: 上書き直前。版の履歴の代わり）
  revision/                          固めた後の直し・追記の差分（ほぼ完成した時点や公開後に、細かい修正を見返す時に作る）
    baseline.md                      固めた時点の本文のスナップショット（scripts/revise.mjs freeze で保存。切り直すと _archive/ へ退避）
    draft_revision.md                基準からの差分を {+ +} {- -} {? ?} で書いた正本（scripts/revise.mjs show が生成。AI が直接書いてもよい）
    index.html                       変更箇所だけ色付きの HTML（scripts/render-revision.mjs の生成物。手で編集しない）
  review/                            /review の出力。lens ごとに独立した連番で時系列に蓄積
    critique_01.md / drift_01.md / readers_01.md / author_01.md   lens ごとの指摘
  x-posts.md                         X 告知ポストの文案（/blog-announce の出力。採否と投稿は著者が行う）
  published.md                       公開 Web 記事の取得スナップショット（/blog-wix-sync の pull --published。改訂の基準と slug 重複確認に使う。2026年6月以前の一部の記事は comparison/published.md にある。無い記事もある）

```

## 登壇（形式: 登壇）

core.md・thinking.md・references.md・references/・review/ は上と同じ。outline.md から先の代わりに、次を置く。

```
output/{yyyymmdd}_{テーマ}/
  event.md                           主催の規定（時間・提出形式・最小文字など。key: value の行。/presentation-write の場の工程）
  storyline.md                       段ごとの流れ（何を言い、観客がどうなるか。時間配分とスライドの作り方は書かない。任意）
  deck.md                            ゴーストデッキと台詞（見出しだけで話が通る1枚ずつの主張・証拠・台詞。Google スライドに組むまでの正）
  preview/deck.html                  deck.md のストーリーボード（scripts/render-deck.mjs の生成物。手で編集しない）
  figures/                           スライドに貼る図の PNG と src/（/illustrate のスライド用の寸法で作る）
  slides.json                        Google スライドとの結び付き（/presentation-slides が書く。手で編集しない）
  deck_user.md                       Google スライドから取り込んだ版（組んだ後は Slides が正。/presentation-slides が書く）
  review/                            audience_01.md・drift_01.md など、/review の出力
```

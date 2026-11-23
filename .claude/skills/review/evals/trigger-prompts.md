---
purpose: review のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。起動すべきプロンプトは lens も正しく選ばれるかまで見る
---

# トリガーテスト

## 起動すべき（should fire）

### lens=critique

- この主張の想定反論を出して
- 主張を叩いて
- 掘った内容の穴を見て
- 前提が崩れていないか批判的に読んで
- /review ai-bi-platform critique

### lens=drift

- outline.md から主張が落ちていないか点検して
- 構成が固まったので前段からのズレを見て
- draft が thinking から離れていないか確認して
- 本文に前段に根拠のない主張が湧いていないか見て
- /review ai-bi-platform drift outline
- deck.md が storyline から離れていないか見て
- /review 20261201_example-presentation drift deck

### lens=readers

- このドラフトを読者視点で読んでみて
- 初見の読者はどこで離脱しそう？
- 公開したらどう受け取られるか予測して
- 炎上しそうな段落はある？
- /review ai-bi-platform readers
- スマホで読んだ時に読みにくいところはある？
- 挿絵の位置と効き方を、読者の目で見て
- プレビューを画面で読んで、文章が続きすぎるところを教えて
- 熟練者と初心者の2人の読者に、別々に読ませて（ペルソナ欄を変えた2つの起動を並列で出す）
- /review 20261201_example readers draft.md "expert: 業務で BI ツールを5年以上使う人"

### lens=readers の期待する動作

- 画面を撮って読む: `review/screens/readers_NN/` に `mobile_NN.png`・`desktop_NN.png`・`screens.json` ができ、`readers_NN.md` に `## 画面で読んだ所見` 節が入る。サマリに `画面:` の行が出る
- playwright-cli が使えない時: 点検は本文だけで続き、ファイルとサマリに「画面: 読めていない（理由）」が出る
- ペルソナ指定: 既定の3者ではなく指定の1人で読み、`readers_NN_{ラベル}.md` と `review/screens/readers_NN_{ラベル}/` に書く。並列の2起動でファイルが上書きされない
- ラベルの無いペルソナ（例: `"BI ツールの初心者"`）: 点検せず、`ラベル: 説明` の形式を示して返す

### lens=audience

- 観客にどう聞こえるか見て
- この発表、どこで置いていかれそう？
- 見出しだけで話が通るか確かめて
- /review 20261201_example-presentation audience

### lens=author

- 下書きをレビューして
- 自分で書いた記事を編集者の目で見て
- draft_user.md の誤字と表記ゆれを拾って
- 公開前に下書きの完成度を点検して
- Wix の下書きを取り込んでレビューして（取り込みは blog-wix-sync の pull を先に済ませてから点検）
- /review ai-bi-platform author

## lens 未指定の扱い

次のような発話は起動してよいが、**lens を推測して点検を始めてはならない**。lens が空・不正なら点検せず、5つの lens を提示して著者に選ばせるサマリだけを返す。

- レビューして
- ちょっと見てもらえる？
- /review ai-bi-platform

## 起動すべきでない（should not fire）

- 記事のテーマを一緒に掘りたい（→ /core の掘る工程）
- 記事の構成を一緒に考えたい（→ /blog-write の組む工程）
- 本文を書いてみて（→ /blog-write の書く工程）
- 全体像を1枚で見たい・地図を見せて（→ /core の地図）
- ドラフトが長いので削って（→ /blog-write の書く工程。レビューではなく編集）
- 記事に入れる概念図を1枚描いて（→ /illustrate）
- この図をスマホでも読めるように描き直して（→ /illustrate。点検ではなく作図）
- プレビューをブラウザで開いて（→ `.claude/launch.json` の preview サーバー。レビューの依頼ではない）
- 公開する成果物を選別して commit したい（→ /blog-promote）
- コードの変更をレビューして（記事の成果物が対象ではない）
- Wix で直したから取り込んで（→ /blog-wix-sync。レビューの依頼ではない）

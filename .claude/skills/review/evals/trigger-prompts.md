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

### lens=readers

- このドラフトを読者視点で読んでみて
- 初見の読者はどこで離脱しそう？
- 公開したらどう受け取られるか予測して
- 炎上しそうな段落はある？
- /review ai-bi-platform readers

### lens=author

- 下書きをレビューして
- 自分で書いた記事を編集者の目で見て
- draft_user.md の誤字と表記ゆれを拾って
- 公開前に下書きの完成度を点検して
- Wix の下書きを取り込んでレビューして（.mhtml から draft_user.md を抽出してから点検）
- /review ai-bi-platform author
- /review ai-bi-platform author Posts_Wix.mhtml

## lens 未指定の扱い

次のような発話は起動してよいが、**lens を推測して点検を始めてはならない**。lens が空・不正なら点検せず、4つの lens を提示して著者に選ばせるサマリだけを返す。

- レビューして
- ちょっと見てもらえる？
- /review ai-bi-platform

## 起動すべきでない（should not fire）

- 記事のテーマを一緒に掘りたい（→ /article の掘る工程）
- 記事の構成を一緒に考えたい（→ /article の組む工程）
- 本文を書いてみて（→ /article の書く工程）
- 全体像を1枚で見たい・地図を見せて（→ /article の地図）
- ドラフトが長いので削って（→ /article の書く工程。レビューではなく編集）
- 記事に入れる概念図を1枚描いて（→ /illustrate）
- 公開する成果物を選別して commit したい（→ /publish-article）
- コードの変更をレビューして（記事の成果物が対象ではない）

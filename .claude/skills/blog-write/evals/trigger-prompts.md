---
purpose: blog-write のトリガー回帰テスト用プロンプト集。ブログ記事の組む（outline.md）と書く（draft.md）の起動語を集めたもの
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。著者はコマンドを打たない前提なので、自然文のプロンプトを主に置く。テーマ・掘る・地図は core、登壇は presentation-write との境界として should-not-fire に置く
---

# トリガーテスト

## 起動すべき（should fire）

### 組む

- 記事の構成を一緒に考えたい
- 見出しの順番をどうするか迷っている
- どの話から入るのがいいと思う？
- /blog-write ai-bi-platform outline

### 書く

- 本文を書いてみて
- ドラフトを起こして
- 導入だけ書き直して
- 2章を丸ごと書き直したい
- /blog-write ai-bi-platform write

## 起動すべきでない（should not fire）

- 新しいブログのテーマを思いついたので相談したい（→ /core の核）
- この主張をもっと掘りたい（→ /core の掘る工程）
- 全体像を1枚で見たい（→ /core の地図）
- 登壇の流れを組みたい（→ /presentation-write）
- スライドの見出しと台詞を考えて（→ /presentation-write）
- この主張の想定反論を出して（→ /review の critique）
- outline.md から主張が落ちていないか点検して（→ /review の drift）
- 記事のドラフトを読者視点で読んでみて（→ /review の readers）
- Wix の下書きをレビューして（→ /review の author。取り込みも lens 側）
- 記事の中に入れる概念図を1枚描いて（→ /illustrate）
- 公開した記事を取ってきて（→ /blog-wix-sync の pull --published）
- 本文は固まったので、ここから細かく直したい（→ /blog-revise）
- 公開した記事に一節足したい。差分で見せて（→ /blog-revise）
- この記事を公開層に反映して（→ /blog-promote）
- X のポストの中身を取ってきて（→ スキルではなくブラウザで読む）

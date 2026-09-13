---
purpose: compare-drafts のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。「比べて」「レビューして」が /review の author lens と混ざる境界を重点的に置く
---

# トリガーテスト

## 起動すべき（should fire）

- 記事を公開したので AI 版と比べて改善案を出して
- 公開した記事と draft.md の差を分析して
- 公開版に近付けるために voice-style を直したい
- https://www.yarakawa.com/post/{slug} と AI 版を比較して
- /compare-drafts ai-bi-platform https://www.yarakawa.com/post/{slug}

## 起動すべきでない（should not fire）

- 下書きをレビューして（→ /review の author。比較対象の公開記事が無い）
- draft_user.md の誤字と表記ゆれを拾って（→ /review の author）
- ドラフトが長いので公開版の密度まで削って（→ /tighten-draft。差分の観察ではなく圧縮）
- 前回の記事の構成と今回の構成を比べたい（記事間の比較であって AI 版↔著者版ではない）
- 公開する成果物を選別して commit したい（→ /publish-article）

## 「比べて」の境界

「比べて」「レビューして」だけでは lens が決まらない。**公開 URL または公開済みの事実**があれば compare-drafts、無ければ `/review author`。判断がつかなければ推測せず、「公開記事と比べますか（URL が要ります）／下書きを編集レビューしますか」を 1 問だけ聞く。

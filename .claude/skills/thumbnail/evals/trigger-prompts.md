---
purpose: thumbnail のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。「画像」「図」が illustrate と衝突する境界を重点的に置く
---

# トリガーテスト

## 起動すべき（should fire）

- この記事のサムネイルを作って
- カバー画像をいつもの感じで用意して
- アイキャッチ画像を作りたい
- サムネの改行を「Tableau / ワークブック作成の / …」に変えて
- /thumbnail bi-license

## 起動すべきでない（should not fire）

- 記事に入れる概念図を 1 枚描いて（→ /illustrate）
- この対比を図にしたい（→ /illustrate）
- Wix に下書きを流し込んで（→ /wix-sync）
- 公開記事のスクリーンショットを撮ってきて（→ /fetch-page）

## 「画像」の境界

**記事の表紙として一覧や SNS に出る1枚**（サムネイル・カバー・アイキャッチ）が thumbnail。**本文の中に貼る1枚**（概念図・挿絵）が illustrate。

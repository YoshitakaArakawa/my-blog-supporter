---
purpose: fetch-page のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。著者はコマンドを打たない前提なので、自然文のプロンプトを主に置く
---

# トリガーテスト

## 起動すべき（should fire）

- さっきの WebFetch、要約しか返ってこなかった。本文をちゃんと取って
- このページ、JS で描画してるみたいで WebFetch だと空っぽ。ブラウザで取って
- この URL を playwright で開いて本文を読んで
- この X のポストを読んで、何を言っているか教えて
- Chrome で開いてこのスレッドの中身を取ってきて

## 起動すべきでない（should not fire）

- Wix に上げた自分の記事を取り込んで（→ /wix-sync の pull）
- 公開版を取ってきて draft と揃えて（→ /wix-sync の pull --published）
- この公式ドキュメントの要点を読んで（→ WebFetch。静的ページ）
- 記事に入れる概念図を描いて PNG にして（→ /illustrate）

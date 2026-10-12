---
purpose: announce-article のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。著者はコマンドを打たない前提なので、自然文のプロンプトを主に置く
---

# トリガーテスト

## 起動すべき（should fire）

- 記事を公開したので X で告知したい
- この記事の告知ポストの案を出して
- ツイート文を考えて
- X に書きます宣言をポストしたい
- 告知のセルフリプライで裏話も書きたい
- /announce-article claude-tableau-workbook

## 起動すべきでない（should not fire）

- X のポストを読んで（→ /fetch-page）
- この記事を公開して commit したい（→ /publish-article）
- Wix に流し込んで（→ /wix-sync）
- 読者として読んだらどう感じるか見て（→ /review readers）
- X に投稿しておいて（投稿は著者が X の画面で行う。スキルは投稿しない）

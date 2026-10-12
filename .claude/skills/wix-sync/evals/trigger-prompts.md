---
purpose: wix-sync のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。著者はコマンドを打たない前提なので、自然文のプロンプトを主に置く
---

# トリガーテスト

## 起動すべき（should fire）

- この draft を Wix に流し込んで
- 画像込みで Wix に下書きを作って
- Wix で直したから取り込んで
- Wix の最新に揃えて
- 直した分を Wix の下書きに反映して
- 公開版を取ってきて（API で published.md を取る）
- /wix-sync ai-bi-platform pull

## 起動すべきでない（should not fire）

- 下書きをレビューして（→ /review の author。取り込みが要れば lens 側が wix-sync を案内する）
- 差分で見せて（→ /revise）
- この記事を公開層に反映して commit したい（→ /promote-to-public）
- X のポストを読んで（→ /fetch-page）
- 記事に入れる概念図を描いて（→ /illustrate）
- Wix の記事を公開して（公開は著者が Wix の画面で行う。スキルは公開しない）

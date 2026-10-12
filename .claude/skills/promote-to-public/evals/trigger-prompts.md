---
purpose: promote-to-public のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。著者はコマンドを打たない前提なので、自然文のプロンプトを主に置く。「公開」の語が Wix での公開（著者が画面で行う）と混ざる境界を重点的に置く
---

# トリガーテスト

## 起動すべき（should fire）

- この記事の過程を共有したい。GitHub に上げて
- 作業層の成果物をリポの公開層に反映して
- published に出して
- （wix-sync の pull --published の後で「公開層に反映しますか」と提案され）うん、お願い
- /promote-to-public ai-bi-platform
- /promote-to-public ai-bi-platform --with-review

## 起動すべきでない（should not fire）

- 記事を公開して（Wix での公開は著者が画面で行う。スキルは公開しない）
- Wix に流し込んで（→ /wix-sync）
- 公開版を取ってきて（→ /wix-sync の pull --published。取得だけ）
- 公開後に一節足したい。差分で見せて（→ /revise）
- 公開済み記事の誤字を published/ 側で直して（公開層の推敲反映は直接編集でよい。ゲートは要らない）
- 下書きをレビューして（→ /review の author）

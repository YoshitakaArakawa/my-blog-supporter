---
purpose: draw-map のトリガー回帰テスト用プロンプト集
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する
---

# トリガーテスト

## 起動すべき（should fire）

- ai-bi-platform の全体像を1枚で見たい
- この構成で書き始めていいか、俯瞰して確認したい
- /draw-map ai-bi-platform
- 記事の見取り図を作って
- 章立ての重心が移ったので地図を描き直したい
- outline ができたので、write に入る前に全体を見て合意したい

## 起動すべきでない（should not fire）

- outline.md から主張が落ちていないか点検して（→ check-drift）
- この主張の想定反論を出して（→ critique）
- 記事の構成を一緒に考えたい（→ outline）
- 記事のドラフトを読者視点で読んでみて（→ simulate-readers）
- 記事の中に入れる概念図を1枚描いて（→ illustrate）
- この記事の計画、どこが弱いか指摘して（本スキルは判定しない）

---
purpose: presentation-write のトリガー回帰テスト用プロンプト集。登壇の場（event.md）・組む（storyline.md）・書く（deck.md）の起動語を集めたもの
note: description・本文の修正時に fresh session で全プロンプトを確認する。運用中に観測された不発・誤発火はここに追記する。テーマ・掘るは core、Google スライドへの組上は presentation-slides、ブログの構成・本文は blog-write との境界として should-not-fire に置く
---

# トリガーテスト

## 起動すべき（should fire）

### 場

- 登壇の案内 PDF が来たので、規定を整理して
- LT の持ち時間と提出形式をまとめておいて
- /presentation-write 20261201_example-presentation event

### 組む

- 登壇の流れを組みたい
- 発表の話の順番を一緒に考えたい
- どこで拍手をもらうか決めたい
- /presentation-write 20261201_example-presentation storyline

### 書く

- スライドの見出しと台詞を考えて
- 発表資料の中身を作りたい
- 5分に収まるか見て
- 見出しだけ並べて、話が通るか確かめたい
- /presentation-write 20261201_example-presentation deck

## 起動すべきでない（should not fire）

- 来月の勉強会で何を話すか一緒に考えたい（→ /core の核。中身の核が先）
- 登壇のテーマをもっと掘りたい（→ /core の掘る工程）
- Google スライドに組んで（→ 未実装。著者にそう伝えて止まる）
- 観客にどう聞こえるかレビューして（→ /review の audience）
- このスライドに入れる図を1枚描いて（→ /illustrate）
- 記事の構成を一緒に考えたい（→ /blog-write）
- 本文を書いてみて（→ /blog-write）

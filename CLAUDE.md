# My Blog Supporter

yarakawa.com の考察・内省型ブログ記事を、著者がAIと対話しながら書き上げるための支援プロジェクト。

## 目的と設計原則

このリポジトリの工程はこの目的と価値観に従う。**原則の正本はここに置き、各スキルはこれを具体的な工程として適用する**（原則は1箇所、適用はN箇所）。

- **目的**: 著者が自分の声で記事を書き上げること。AIは掘る・叩く・整合を診る・読者を予測する「足場」であり、最終成果物の声と判断は著者のものに保つ。
- **問いと判断は人間が握る**（最上位）。AIの自走は入れるが、記事の中身が静かにAIのものにすり替わるのを防ぐ。これは記事の主張そのものを工程に適用したもの。
- **真正性 > 網羅**。確信で埋めた“偽の著者声”は空欄より悪い。著者固有の論点（体験・立場・固有の判断）はAIが代筆せず著者に戻す。
- **気づきを引き出す > 論理検証**。考察・思索の共有が主軸。叩く・検証する工程は隔離し、対話そのものは「引き出す人格」を保つ。
- **主題を深める > 防御的な鎧**。想定反論の先回り潰しの累積はトーンを防御文書化し、内省エッセイの没入を削る。
- **段階間で背骨を落とさない／無根拠に足さない**。AIが成果物を生成するたび、前段との provenance を点検する。
- **著者の文体・スタンスを保全する**。煽らない、ヘッジで余白を残す、「再現性」「誰でも辿れる論理」を核にする。AI的な平板・無個性に均さない。

### 「良い記事」とは（記事横断の北極星）

記事ごとのゴールは異なるが、共通の到達点をこう置く: **読者に「腑に落ちる・自分も考えたくなる・自分の現場で辿り直したくなる」を起こすこと**。そのエネルギーは正直な言語化と再現可能性（誰でも辿れる論理）から生み、煽り・断定・特別性の演出からは作らない。各記事での具体形は thinking.md / outline.md の「読後の読者の状態」が担い、達成度は `/simulate-readers` の行動変化予測で点検する。

## ワークフロー

各工程はスキルとして実装され、`/{skill} [テーマ]` で起動する。**各スキルの役割・設計思想・他スキルとの線引きは、各 `SKILL.md` の「役割」節を正本とする**（ここでは重複させず、全体像と導線のみ示す）。

| # | コマンド | 役割 | 主な出力 |
|---|---|---|---|
| 1 | `/brainstorm` | テーマを発散・言語化 | brief.md, references.md |
| 2 | `/deepen` | 思考を掘る（動機・主張・コアメッセージ） | thinking.md |
| 3 | `/critique` | 掘った主張への批判レビュー | critique/critique_NN.md |
| 4 | `/outline` | 見出し構成・展開順序の設計 | outline.md |
| 5 | `/check-drift [テーマ] outline\|draft` | 段階間ドリフト点検 | drift/drift_NN.md |
| 6 | `/write` | 記事執筆・推敲 | draft.md（＋空の draft_user.md） |
| 7 | （ユーザーが執筆） | AI版を参考に独自の記事を書く | draft_user.md |
| 8 | `/review-author-draft` | 著者下書きの編集レビュー | review/review_NN.md |
| 9 | `/compare-drafts [テーマ] [公開URL]` | AI版↔公開記事（無ければ draft_user.md）の比較 | comparison/comparison.md |

補助スキル:
- `/import-wix-draft [path.mhtml]` — Wix 下書き MHTML から draft_user.md を取り込む（手順7の入力口）
- `/illustrate` — 記事の概念図を作図し PNG 出力（`/write` が残す `<!-- 画像: ... -->` プレースホルダを埋める）
- `/fetch-page` — WebFetch で取れないページ（SPA・要ログインの X 等）を実ブラウザ取得

読み方（詳細は各 SKILL.md）:
- **2⇄3 はループ**。`/deepen` が `/critique` を既定の後続として自動実行し、著者固有でない指摘は AI が自答、著者固有の指摘だけ著者に戻す（最大3周）。`/brainstorm`（発散）⇄ `/deepen`（掘る）も往復する。
- **`/brainstorm` → `/deepen` が標準**。brief.md だけで `/write` に直行しない。`/outline` 以降は任意。
- **`/check-drift` は AI 生成工程の承認ゲート**。`/outline` 直後に `outline`、`/write` 直後に `draft` を回す（`/outline` を飛ばすなら `draft` の1点）。
- **`/simulate-readers`** は `/write` 推敲の既定工程として fork 実行される（単独でも可、readers/readers_NN.md）。
- `/critique`・`/check-drift`・`/simulate-readers`・`/review-author-draft` は `context: fork`（隔離コンテキスト）。対象をファイルから読み、連番ファイルに書き、実行サマリだけ返す。

## ディレクトリ構成

```
output/{yyyymmdd}_{テーマ}/           記事ごとの出力（日付プレフィックス付き）
  brief.md                           テーマブリーフ（/brainstorm 生成、最新が正）
  brief_deepen.md                    主張を立てた版のbrief（任意、対話中に手動作成）
  references.md                      参考資料の整理（/brainstorm 生成、/deepen /outline で追記）
  references/                        記事固有の raw 参考資料
  thinking.md                        掘った思考・主張メモ（/deepen 生成、ループで更新／最新が正）
  critique/                          批判レビューの記録（/critique 生成、ループで時系列に蓄積）
    critique_01.md                   ループ1回目の指摘
    critique_02.md                   ループ2回目の指摘 …
  outline.md                         記事の見出し構成・資料接続（/outline 生成、最新が正）
  draft.md                           記事本文（/write 生成、AI版）
  drift/                             段階間ドリフト点検の記録（/check-drift 生成、点検ごとに時系列に蓄積）
    drift_01.md                      1回目の点検（落とした背骨／無根拠 add）
    drift_02.md                      2回目の点検 …
  readers/                           初見読者シミュレーションの記録（/simulate-readers 生成、実行ごとに時系列に蓄積）
    readers_01.md                    1回目の読者反応予測（離脱点・反応・行動変化・炎上経路）…
  draft_user.md                      記事本文（ユーザー推敲版。/write 完了時に空白で作成）
  review/                            下書きレビューの記録（/review-author-draft 生成、推敲ごとに時系列に蓄積）
    review_01.md                     1回目のレビュー指摘
    review_02.md                     2回目のレビュー指摘 …
  comparison/                        AI版とユーザー版の比較（/compare-drafts 生成。過去記事は直下 comparison.md のままでよい）
    published.md                     公開Web記事の取得スナップショット（原則の比較対象。毎回上書き／URL 取得時のみ）
    comparison.md                    比較・改善FB

.claude/skills/write/references/     /write スキル付属の文体ガイド
  voice-style.md                     著者の文体・語り口・構造パターン・チェックリスト
                                     ルール17-23は AI 的傾向への対抗ガイド
```

## 参考資料の配置ルール

- **記事固有**: `output/{yyyymmdd}_{テーマ}/references/`
  Xスレッド転記、関連記事MD、データCSV等。記事ごとに集める raw 資料。
- **文体ガイド**: `.claude/skills/write/references/voice-style.md`
  /write スキルが文体一貫性のために参照する。

対応フォーマット:
- **PDF**（推奨） - テキスト・図表をAIが直接読み取れる
- **画像**（PNG, JPG, WebP） - 図表やスクリーンショット
- **テキスト**（.md, .txt, .csv） - データや原稿

## Web取得 (fetch-page スキル)

参考URLの内容取得は基本 WebFetch を使う。SPA/JSレンダリング必須サイトや、X (旧Twitter) ポストなどログイン必須のページは `fetch-page` スキル (playwright-cli ラッパー) を使う。

**Xの利用は会話セッション単位でログイン**: 認証Cookieはディスクに残さない方針。ClaudeがXのURLを取得しようとした時、未ログインを検知したらClaude自身が `playwright-cli -s=x open https://x.com/login --headed` を実行してブラウザを起動する。ユーザーは出たウィンドウで手動ログインし、「ログインした」とClaudeに返答するだけで良い。

会話終了時に `playwright-cli -s=x close` で Cookie ごと消える。

`.playwright-cli/` は作業ファイル置き場 (gitignore済み)。

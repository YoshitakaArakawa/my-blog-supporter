# My Blog Supporter

yarakawa.com のブログ記事を対話的に執筆するプロジェクト。

## ワークフロー

1. `/brainstorm [テーマ]` - テーマの議論・言語化 → brief.md, references.md
2. `/deepen [テーマ]` - 思考を掘る・問い直す（動機・主張・コアメッセージ）→ thinking.md
3. `/critique [テーマ]` - 掘った主張に批判レビュー（想定反論・前提の穴）→ critique/critique_NN.md
4. `/outline [テーマ]` - 記事の見出し構成・展開順序・資料接続を設計 → outline.md
5. `/write [テーマ]` - 記事執筆・推敲 → draft.md (+ 空白 draft_user.md)
6. ユーザーが draft_user.md を執筆 — AI版を参考に、独自の言葉・構成で記事を書き上げる
7. `/compare-drafts [テーマ]` - draft.md と draft_user.md を比較 → comparison.md (改善FB)

**2〜3 はループ。** `/brainstorm`（発散）⇄ `/deepen`（掘る）を往復し、節目で `/critique`（叩く）を挟む。critique の指摘を次の deepen の燃料にして主張を深める。掘る・叩く工程は thinking.md を更新し続ける（最新が正）。critique は時系列で残す（critique/ 配下に連番）。

ループが落ち着いたら 4 の `/outline` で構成を一度固める。

`/deepen` 以降は省略可能。brief.md の時点で構成が十分明確なら `/brainstorm` → `/write` の直行も可。`/critique` は掘った主張を叩きたい時、`/outline` は構成を別ファイルで固めたい時に使う（thinking.md だけで write に進んでもよい）。`/compare-drafts` も任意。AI生成を次回以降ユーザー版に近付けたい時に実行する。

`/critique` は `context: fork`（隔離コンテキスト）で動く。会話履歴を持たないため thinking.md を入力に読み、指摘を critique/critique_NN.md に書き出して実行サマリだけメインに返す。「引き出す deepen」と「叩く critique」をコンテキストごと分離する設計。

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
  draft_user.md                      記事本文（ユーザー推敲版。/write 完了時に空白で作成）
  comparison.md                      AI版とユーザー版の比較・改善FB（/compare-drafts 生成）

.claude/skills/write/references/     /write スキル付属の文体ガイド
  voice-style.md                     著者の文体・語り口・構造パターン・チェックリスト
                                     ルール17-21は AI 的傾向への対抗ガイド
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

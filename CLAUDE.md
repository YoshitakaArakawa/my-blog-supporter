# My Blog Supporter

yarakawa.com のブログ記事を対話的に執筆するプロジェクト。

## ワークフロー

1. `/brainstorm [テーマ]` - テーマの議論・言語化 → brief.md, references.md
2. `/deepen [テーマ]` - 思考の深掘り・構成設計 → thinking.md
3. `/write [テーマ]` - 記事執筆・推敲 → draft.md (+ 空白 draft_user.md)
4. ユーザーが draft_user.md を執筆 — AI版を参考に、独自の言葉・構成で記事を書き上げる
5. `/compare-drafts [テーマ]` - draft.md と draft_user.md を比較 → comparison.md (改善FB)

`/deepen` は省略可能。brief.md の時点で構成が十分明確な場合は `/brainstorm` → `/write` の直行も可。
`/compare-drafts` も任意。AI生成を次回以降ユーザー版に近付けたい時に実行する。

## ディレクトリ構成

```
output/{yyyymmdd}_{テーマ}/           記事ごとの出力（日付プレフィックス付き）
  brief.md                           テーマブリーフ（/brainstorm 生成）
  brief_deepen.md                    主張を立てた版のbrief（任意、対話中に手動作成）
  references.md                      参考資料の整理（/brainstorm 生成）
  references/                        記事固有の raw 参考資料
  thinking.md                        思考の深掘り結果（/deepen 生成）
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

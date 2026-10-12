# My Blog Supporter

yarakawa.com の考察・内省型ブログ記事を、著者がAIと対話しながら書き上げるための支援プロジェクト。

## 目的と設計原則

このリポジトリの工程はこの目的と価値観に従う。**原則の正本はここに置き、各スキルはこれを具体的な工程として適用する**。

- **目的**: 著者が自分の声で記事を書き上げること。AI は足場であり、最終成果物の声と判断は著者のものに保つ。
- **問いと判断は人間が握る**（最上位）。
- **問いの provenance**。著者の核（core.md）を AI が書き換えない。AI が著者に返す内容の問いは core.md のどの行に効くかを添え、添えられない問いは駐車場へ退避する（進行の確認は除く）。
- **叩くのは著者が呼んだ時だけ**。批判レビューを AI の判断で自走させない。
- **真正性 > 網羅**。著者固有の論点（体験・立場・固有の判断）は AI が代筆せず著者に戻す。
- **気づきを引き出す > 論理検証**。叩く・検証する工程は隔離し、対話そのものは「引き出す人格」を保つ。
- **主題を深める > 防御的な鎧**。想定反論の先回り潰しを本文に積まない。
- **段階間で背骨を落とさない／無根拠に足さない**。AI が成果物を生成するたび、前段との provenance を点検する。
- **著者の文体・スタンスを保全する**。煽らない、ヘッジで余白を残す、AI 的な平板・無個性に均さない。

## 起動（著者はコマンドを打たない）

記事の話題が出たら、コマンドを待たず `Skill` ツールで `article` を起動する。新規テーマ・前の記事の続き・掘りたい・構成・本文・地図のどれでも同じ。工程の判定と他スキルへの受け渡しは `article` が持つ。

他のスキル（`review` / `revise` / `illustrate` / `thumbnail` / `wix-sync` / `promote-to-public` / `announce-article` / `fetch-page`）は、各スキルの description にある起動語で起動する。外へ出る操作は著者の承認を経てから行う: Wix へ書く（`wix-sync` の push）、Public リポへ commit する（`promote-to-public`）。記事の公開・X への投稿はスキルがせず、著者が画面で行う。

記事の作業層は `output/{yyyymmdd}_{テーマ}/`。著者が能動的に行うのは5つだけ: core.md の文言の承認、レビュー指摘の採否、「核を変えるか」への回答、Wix への流し込みの承認、公開時の commit の承認。

## 機械ゲート

- `.claude/settings.json` の PostToolUse hook が、`scripts/draft-lint.config.json` の対象ファイルを Edit/Write するたびに `scripts/lint-draft.mjs` のレポートを自動で返す。閾値と禁止句の正本は同 config で、文体の文脈は `voice-style.md` のルール本文が持つ。
- 同じ hook で `scripts/render-preview.mjs` が `output/{記事}/draft.md` の HTML プレビューを再生成する。図込みで読むには `.claude/launch.json` の `preview` サーバー経由（`http://localhost:8765/output/{記事}/preview/index.html`）で開く。
- 判定は警告であり、ブロックしない。
- 直さない判断はドラフト冒頭の ℹ️ メモに理由を残す。

## 公開境界（このリポは Public）

このリポジトリは Public であり、commit したものは公開される前提で扱う。記事制作の生素材と公開物を層で分ける:

- `output/`（gitignore・非公開の作業層）: すべての記事はまずここで作る。生素材・中間生成物は commit しない。バックアップはローカルのみ。
- `published/`（track・公開層）: 公開を決めた記事の、選別済み成果物だけを置く。新規の追加は `/promote-to-public` のゲート（ホワイトリスト選別 → 公開適性の点検 → 著者承認）を通す。公開済み記事の推敲反映は published/ の直接編集で可。
- 機械ガード: pre-commit hook（`.githooks/`）が output/ 配下のステージを拒否する。第三者素材（`published/*/references/`）と Wix スナップショット（`*.mhtml`）は published/ 側でも gitignore で除外する。

## Web 取得

- 取得は pull。AI から自発的に走らせず、裏付けが要る時に著者の承認を得てから実行する。
- WebFetch で取れないページ（SPA・要ログインの X 等）は `fetch-page` スキルを使う。自分の Wix ブログの取り込みは `wix-sync` だけで行い、予備の経路は持たない。

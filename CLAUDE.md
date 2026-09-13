# My Blog Supporter

yarakawa.com の考察・内省型ブログ記事を、著者がAIと対話しながら書き上げるための支援プロジェクト。

## 目的と設計原則

このリポジトリの工程はこの目的と価値観に従う。**原則の正本はここに置き、各スキルはこれを具体的な工程として適用する**（原則は1箇所、適用はN箇所）。

- **目的**: 著者が自分の声で記事を書き上げること。AIは掘る・叩く・整合を診る・読者を予測する「足場」であり、最終成果物の声と判断は著者のものに保つ。
- **問いと判断は人間が握る**（最上位）。AIの自走は入れるが、記事の中身が静かにAIのものにすり替わるのを防ぐ。これは記事の主張そのものを工程に適用したもの。
- **問いの provenance**。著者の核の問い（core.md）をAIが書き換えない。AIが著者に返す問いは core.md のどの行に効くかを名指しし、名指しできない問いは thinking.md の駐車場へ退避して著者には出さない。
- **真正性 > 網羅**。確信で埋めた“偽の著者声”は空欄より悪い。著者固有の論点（体験・立場・固有の判断）はAIが代筆せず著者に戻す。
- **気づきを引き出す > 論理検証**。考察・思索の共有が主軸。叩く・検証する工程は隔離し、対話そのものは「引き出す人格」を保つ。
- **主題を深める > 防御的な鎧**。想定反論の先回り潰しの累積はトーンを防御文書化し、内省エッセイの没入を削る。
- **段階間で背骨を落とさない／無根拠に足さない**。AIが成果物を生成するたび、前段との provenance を点検する。
- **著者の文体・スタンスを保全する**。煽らない、ヘッジで余白を残す、「再現性」「誰でも辿れる論理」を核にする。AI的な平板・無個性に均さない。

### 「良い記事」とは（記事横断の北極星）

記事ごとのゴールは異なるが、共通の到達点をこう置く: **読者に「腑に落ちる・自分も考えたくなる・自分の現場で辿り直したくなる」を起こすこと**。そのエネルギーは正直な言語化と再現可能性（誰でも辿れる論理）から生み、煽り・断定・特別性の演出からは作らない。各記事での具体形は core.md の「読後」行が担い、達成度は `/review readers` の行動変化予測で点検する。

## ワークフロー

**各スキルの役割・設計思想・他スキルとの線引きは、各 `SKILL.md` を正本とする**（ここでは重複させず、全体像と導線のみ示す）。

### 起動（著者はコマンドを打たない）

記事の話題が出たら、コマンドを待たず `Skill` ツールで `article` を起動する。新規テーマ・前の記事の続き・掘りたい・構成・本文・地図のどれでも同じ。著者はコマンドを打たない前提で設計してある。

例外は `/publish-article` だけ。Public リポへの commit を伴うため、実行タイミングを著者が握る（`disable-model-invocation: true`）。

| 著者の発言・状況 | 内部で起こること |
|---|---|
| 「新しいテーマを思いついた」「続きをやろう」 | `article` を起動し、現在地を3行で報告して1問だけ返す |
| 掘る対話がひと段落／著者が方針転換を口にする | 地図を更新し、URL またはパスと変更点1〜2行を返す |
| 「叩いて」「反論ある？」「穴を見て」 | `review` の `critique` を fork で実行し、指摘3件を返す |
| 構成が固まった | `review` の `drift outline` を提案する（著者が頷いたら実行） |
| 「書いてみて」 | draft 生成 → `tighten-draft` → lint → 自己レビュー → `review readers` → `review drift draft` |
| 「下書きを見て」「Wix から取り込んで」 | `import-wix-draft` → `review` の `author` |
| 「公開した。比べて」＋URL | `compare-drafts` |
| 「図を入れたい」 | `illustrate` |

著者が能動的に行うのは4つだけ: core.md の文言の承認、review の指摘の採否、「核を変えるか」への回答、`/publish-article` の起動と commit の承認。

### スキル一覧

| コマンド | 役割 | 主な出力 |
|---|---|---|
| `/article [テーマ] [工程]` | 核 → 掘る → 組む → 書く を著者と対話で進める（既定の入口） | core.md, thinking.md, outline.md, map.html, draft.md |
| `/review [テーマ] [lens] [対象]` | 成果物を隔離コンテキストで点検する（4 lens） | review/{lens}_NN.md |
| `/tighten-draft [テーマ]` | AI ドラフトを公開版の密度まで圧縮する（書く工程が自動実行。膨らんだ時は単独で） | draft.md（上書き）, draft_pre-tighten.md |
| `/compare-drafts [テーマ] [公開URL]` | 公開記事（実ブラウザ取得。無ければ draft_user.md）↔AI版の定量・定性比較と、voice-style / lint 設定への変更案 | comparison/comparison.md, comparison/voice-style-patch.md |
| `/publish-article [テーマ]` | 公開成果物の選別・公開適性点検・公開層への反映 | published/{yyyymmdd}_{テーマ}/ |
| `/illustrate` | 記事の概念図を作図し PNG 出力（書く工程が残す `<!-- 画像: ... -->` を埋める） | SVG / PNG |
| `/fetch-page` | WebFetch で取れないページ（SPA・要ログインの X 等）を実ブラウザ取得 | 取得したページのテキスト |
| `/import-wix-draft [path.mhtml]` | Wix 下書き MHTML から draft_user.md を取り込む | draft_user.md |

`/article` の4工程は同じ会話の中で遷移する（工程ごとに起動し直さない）。工程はファイルの有無と著者の発言で判定し、引数でも指定できる。

1. **核** — core.md（問い／読者／読後／動機／現在地の5行）を起草し、著者の承認を取る
2. **掘る** — 発散と深掘りを1つの対話で行い、thinking.md を作る・更新する
3. **組む**（任意） — 見出し構成・展開順序・資料接続を設計し outline.md に書く
4. **書く** — draft.md を書き、圧縮・機械 lint・点検を通して著者と磨きこむ

`/review` の4 lens は対象と視点だけが違う。

| lens | 対象 | 見るもの |
|---|---|---|
| `critique` | thinking.md | 主張への想定反論・前提の穴・論理の飛躍 |
| `drift outline` / `drift draft` | outline.md / draft.md | 前段から落とした背骨・前段に根拠のない主張の追加 |
| `readers` | draft.md | 初見読者の離脱点・反応・行動変化・誤読リスク |
| `author` | draft_user.md | 著者原稿の編集レビュー（構成・読みやすさ・文体整合・校正） |

読み方:

- **critique は opt-in**。著者が「叩いて」と言った時だけ呼ぶ。掘る工程は「叩いておきますか」の提案に留め、自走ループは回さない。
- **書く工程の内部呼び出し順**: 執筆 → `tighten-draft`（圧縮）→ lint（NG ゼロまで）→ 自己レビュー → `review readers` → `review drift draft` → 著者と磨きこみ。readers と drift draft は既定工程。
- **組む工程を飛ばす時**は thinking.md を直接の設計図にする。
- **地図は対話の中で節目ごとに更新する**。core.md 承認直後・スコープ確定後・outline 確定後は自動、著者が方針転換を口にした後は提案。返すのは URL またはパスと変更点1〜2行だけで、内容は会話に貼らない。
- `/review` と `/tighten-draft` は `context: fork`（隔離コンテキスト）。対象をファイルから読み、ファイルに書き、実行サマリだけ返す。

### 機械ゲート（文体の数値仕様）

AI 版と公開版の差の本体は「談話の密度」（分量 1.4〜1.9 倍、段落 2.7〜3.7 文、保険文・多段論証・定型結び）にあり、LLM の自己チェックでは縮まなかった。数えられるものは `scripts/lint-draft.mjs` が数える（数値仕様・禁止句は `.claude/skills/article/references/voice-style.md` の「0.」と `scripts/draft-lint.config.json`、表記ゆれ・AI 定型は textlint `.textlintrc.json` と `scripts/prh.yml`）。

- 判定はファイル名で切り替わる。`draft*.md` は数値仕様・禁止句・textlint の全項目、`thinking.md` は本文字数の上限だけ、`core.md` は箇条書きの行数と各行の字数だけ
- `.claude/settings.json` に PostToolUse hook を置くと、`scripts/draft-lint.config.json` の `targetGlobs`（draft / thinking.md / core.md）への Edit/Write のたびに同じレポートが自動で返る（設定は README「セットアップ」）
- 判定は警告であり、ブロックしない。直さない判断はドラフト冒頭の ℹ️ メモに理由を残す
- `/compare-drafts` は公開のたびに指標を `output/_metrics/history.csv` へ追記し、voice-style / lint 設定への変更案を `comparison/voice-style-patch.md` に出す。承認された分だけ反映する（ループを提案止まりにしない）

## 公開境界（このリポは Public）

このリポジトリは Public であり、commit したものは公開される前提で扱う。記事制作の生素材と公開物を層で分ける:

- `output/`（gitignore・非公開の作業層）: すべての記事はまずここで作る。生素材・中間生成物（core / thinking / review / 進行中ドラフト）は commit しない。バックアップはローカルのみ。
- `published/`（track・公開層）: 公開を決めた記事の、選別済み成果物だけを置く。新規の公開は `/publish-article` のゲート（ホワイトリスト選別 → 公開適性の点検 → 著者承認）を通す。公開済み記事の推敲反映は published/ の直接編集で可。
- 機械ガード: pre-commit hook（`.githooks/`）が output/ 配下のステージを拒否する。clone 後に `git config core.hooksPath .githooks` で有効化する。第三者素材（`published/*/references/`）と Wix スナップショット（`*.mhtml`）は published/ 側でも gitignore で除外する。

## ディレクトリ構成

```
published/{yyyymmdd}_{テーマ}/        公開層。/publish-article が選別・点検した成果物のみ（構成は下記のサブセット）

output/{yyyymmdd}_{テーマ}/           記事ごとの作業ディレクトリ（非公開・gitignore）
  core.md                            著者の核（問い／読者／読後／動機／現在地の5行）。全工程の不変条件。承認後はAIが書き換えない
  references.md                      出典一覧（1行要旨）。掘る工程で必要になった時に追記
  references/                        記事固有の raw 参考資料
  thinking.md                        掘った思考（スコープ／各観点／駐車場／素材／未決。最新が正・字数上限あり）
  outline.md                         記事の見出し構成・資料接続（任意。最新が正）
  map.html                           計画の見取り図（節目ごとに上書き。正本は Markdown 側）
  draft.md                           記事本文（AI版。/tighten-draft で圧縮済み）
  draft_pre-tighten.md               圧縮前の AI 版（/tighten-draft が退避。比較・巻き戻し用）
  draft_user.md                      記事本文（著者推敲版。書く工程の完了時に空で作成）
  review/                            /review の出力。lens ごとに独立した連番で時系列に蓄積
    critique_01.md / drift_01.md / readers_01.md / author_01.md   lens ごとの指摘（上の lens 表を参照）
  comparison/                        公開記事とAI版の比較（/compare-drafts 生成。過去記事は直下 comparison.md のままでよい）
    published.md                     公開Web記事の取得スナップショット（原則の比較対象。実ブラウザ取得、毎回上書き）
    comparison.md                    比較・改善FB（定量表＋差分の解釈）
    voice-style-patch.md             voice-style.md / lint 設定への変更案（承認後に反映）

output/_metrics/history.csv          記事ごとの指標の履歴（/compare-drafts が追記。ルールが効いたかを数値で判定する材料）

.claude/skills/article/references/   /article 付属の工程詳細と文体ガイド
  phase-deepen.md / phase-outline.md / phase-write.md  掘る・組む・書く各工程の詳細手順とテンプレート
  map-spec.md                        地図の抽出規則・生成手順・検算
  voice-style.md                     著者の文体・語り口の正本。0. 数値仕様 / 1. 公開記事の実例 / ルール1-16（型）/ 17-23（AI 的傾向への対抗）
  cognitive-rhythm.md                認知リズム（緊張・拍・密度波形）の設計規範。書く工程の推敲と /review author が参照
.claude/skills/review/references/    lens ごとの入力・観点・出力テンプレート（lens-critique / lens-drift / lens-readers / lens-author）

scripts/                             機械ゲート
  lint-draft.mjs                     数値仕様・禁止句・textlint を1レポートにまとめる（CLI / hook / --metrics）
  draft-lint.config.json             閾値と禁止句（voice-style「0.」と同期）
  prh.yml                            表記辞書（textlint-rule-prh）
  textlint-allowlist.yml             lint 除外（ℹ️/✍️ メモ・HTML コメント・URL）
  wix-html-to-md.mjs                 公開記事（Wix）の HTML → Markdown（compare-drafts の取得用）
.textlintrc.json                     textlint 設定（preset-ai-writing ＋ ja-technical-writing の選択適用）
```

旧記事には廃止したテーマブリーフ（`brief.md`・`brief_deepen.md`）が残る。新記事では作らず、その役割は core.md と thinking.md が担う。

## 参考資料の配置ルール

- **記事固有**: `output/{yyyymmdd}_{テーマ}/references/`
  Xスレッド転記、関連記事MD、データCSV等。記事ごとに集める raw 資料。
- **文体ガイド・認知リズム規範**: `.claude/skills/article/references/`（voice-style.md / cognitive-rhythm.md）
  書く工程と `/tighten-draft` が執筆・圧縮の基準に、`/review author` と `/compare-drafts` が照合の物差しに使う。

対応フォーマット:
- **PDF**（推奨） - テキスト・図表をAIが直接読み取れる
- **画像**（PNG, JPG, WebP） - 図表やスクリーンショット
- **テキスト**（.md, .txt, .csv） - データや原稿

## Web取得 (fetch-page スキル)

参考URLの内容取得は基本 WebFetch を使う。SPA/JSレンダリング必須サイトや、X (旧Twitter) ポストなどログイン必須のページは `fetch-page` スキル (playwright-cli ラッパー) を使う。記事づくりの中では自発的に走らせず、特定の主張に裏付けが要る時に著者の承認を得てから実行する（`/article` の不変条件「調査は pull」）。

**Xの利用は会話セッション単位でログイン**: 認証Cookieはディスクに残さない方針。ClaudeがXのURLを取得しようとした時、未ログインを検知したらClaude自身が `playwright-cli -s=x open https://x.com/login --headed` を実行してブラウザを起動する。ユーザーは出たウィンドウで手動ログインし、「ログインした」とClaudeに返答するだけで良い。

会話終了時に `playwright-cli -s=x close` で Cookie ごと消える。

`.playwright-cli/` は作業ファイル置き場 (gitignore済み)。

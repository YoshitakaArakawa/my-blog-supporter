# My Blog Supporter

ブログ記事を、**核 → 掘る → 組む → 書く** の工程に分けて、人間（著者）と AI（Claude Code）が往復しながら書くための個人ワークフローです。

> [!NOTE]
> これは「テーマを渡すと記事が出てくる全自動ツール」ではありません。むしろ逆で、**思考と判断を人間が握ったまま、作業だけを AI に省エネさせる**ための足場として作っています。

## なぜ作ったか

ブログを書くのは高カロリーな作業で、放っておくと更新が止まってしまいます。そこで **Agentic に楽できるところは楽をして、記事を書く頻度を省エネで上げよう** という試みが、このリポジトリです。

ただし、量産が目的ではありません。著者にとってブログは「生産」ではなく **思考整理** の手段であり、書く価値の大半は「自分の頭の中を整理し、調べ、言葉にする」過程そのものにあります。ですから、AI に文章を吐かせて埋めるという方向には振っていません。

注力したのは、**自分の頭の中を整理・調査して書く過程を AI に手伝わせつつ、出来上がりが「本人が書いたもの」である状態を保つ**ことです。AI に任せるのは調べ物・整理・叩き台づくりといった作業で、何を問い・何を主張し・どう判断するかは、人間が握り続けます。楽をすることと、自分の記事でなくなることは別である、という線引きを仕組みにしました。

### 「良い記事」とは（記事横断の北極星）

記事ごとのゴールは違っても、共通の到達点をこう置いています: **読者に「腑に落ちる・自分も考えたくなる・自分の現場で辿り直したくなる」を起こすこと**。そのエネルギーは正直な言語化と再現可能性（誰でも辿れる論理）から生み、煽り・断定・特別性の演出からは作りません。記事ごとの具体形は `core.md` の「読後」行が担い、達成度は読者シミュレーション（`/review readers`）の行動変化予測で点検します。

## どう使っているか

`CLAUDE.md` が全体のオーケストレーションを担い、各工程を Skill に分けることで、**自律的かつ対話的な執筆を一気通貫で**回します。記事1本につき1つのフォルダを作り、その中で工程ごとの成果物が、対話を通じて育っていきます。

著者はコマンドを打ちません。「新しいテーマを思いついた」「続きをやろう」「叩いてほしい」「書いてみて」と自然言語で言うだけで、`CLAUDE.md` がそれを工程へ振り分け、記事づくりの Skill（`/article`）が立ち上がります。レビュー・比較といった裏方の Skill も、必要な場面で内部的に呼ばれます。公開（`/publish-article`）も同様に呼ばれますが、Public リポジトリへの commit は著者の承認を経てから行われます。

| Skill | やること | 性格 |
|---|---|---|
| `/article` | 核（core.md）を決め、論点を掘り、構成を組み、本文を書く | 対話の本体 |
| `/review` | 成果物を隔離コンテキストで点検する。4 つの lens を切り替える（`author` は Wix の下書き .mhtml の取り込みも担う） | 叩く・点検する |
| `/publish-article` | 公開してよい成果物を選別して公開層（`published/`）へ出す | 公開する |
| `/revise` | 固まった本文や公開済み記事への直し・追記を、基準からの差分だけ色付きで見返しながら進める | 直す |
| `/illustrate` | 記事の概念図を作図して PNG で書き出す | 図にする |
| `/fetch-page` | WebFetch で取れないページを実ブラウザで取得する | 取ってくる |

`/article` の中で、核 → 掘る → 組む → 書く が同じ会話のまま進みます。掘る段階と書く段階は行き来してよく、構成（組む）は飛ばすこともできます。

`/review` の 4 つの lens は、`critique`（掘った主張を叩く）／`drift`（前段から背骨を落とした・無根拠に足したを点検する）／`readers`（初見の読者として通読し反応・離脱・行動変化を予測する）／`author`（自分が書いた下書きを編集者の目でレビューする）です。

## このワークフローの肝＝設計思想

「楽をする」ことと「自分の記事でなくなる」ことを分ける核は、4つあります。

**1. 問いと判断は人間が握る（core.md と問いの規律）**
記事ごとに `core.md` という 5 行のファイルを置きます。この記事が答えようとする問い・読者・読後・動機・現在地を、著者自身の言葉で書いたものです。AI は起草を手伝いますが、文言を承認するのは著者で、承認後に AI が書き換えることはありません。そのうえで、**AI が著者に返す問いは「core.md のどの行に効くか」を名指しする**という規律を全工程に効かせています。名指しできない問いは thinking.md の「駐車場」へ退避し、著者には出しません。主張を叩くレビューも自動では走らず、著者が「叩いて」と言った時だけ呼ばれます（規律の正本は `.claude/skills/article/SKILL.md` の不変条件）。AI に自走させると問いは「検証しやすい方」へ静かに流れていくので、**問いの出どころを著者に固定する**ことで、記事の中身が AI のものへすり替わるのを防いでいます。

**2. 「引き出す」工程と「叩く」工程を分離する**
思考を引き出す対話と、思考を叩くレビューは、性質が逆です。そこで叩く仕事は `/review` に切り出し、隔離コンテキスト（会話履歴を持たない別エージェント）で動かしています。引き出す対話に批判が割り込んで萎縮させてしまうことも、批判が対話の空気に流されて甘くなってしまうことも、どちらも避けるためです。

**3. AI が書いた後を、書いた本人とは別の目で点検する**
AI が構成（outline）や本文（draft）を生成したら、`/review drift` が「前段で立てた背骨を落としていないか」「前段に根拠のない主張を勝手に足していないか」を、隔離コンテキストで読み比べます。さらに `/review readers` が初見の読者として通読し、どこで離脱しそうか・どう受け取られるかを予測します。書いた本人が自分の追加を自分で正当化してしまう経路を断ち、AI が静かに足したズレを工程の切れ目で捕まえるためです。

これらは、著者のブログの主題でもある「**問いと判断は人間が握る**」という考えを、執筆プロセスそのものに落とし込んだものです。

**4. 文体は「ルール」より「数値と実例」で寄せる**
AI 版と公開記事を6本ぶん比べると、差は語尾や表記ではなく「密度」にありました。AI 版のほうが分量が多く、増分は先回りの保険文・多段の論証・章間の道案内・定型の結びに集中します。そこで文体ガイド（[voice-style.md](.claude/skills/article/references/voice-style.md)）を、公開記事の実測から決めた数値仕様と、公開記事からの抜粋（実例）を先頭に置く構成にしました。数値仕様の正本はこのガイドの「0.」で、数えられるものは `scripts/lint-draft.mjs`（自前の指標＋textlint）が機械で判定します。書く工程は執筆後に圧縮と lint を通してから著者に渡し、公開後の比較がガイドと lint 設定への変更案を出します。

## リポジトリの構成

記事ごとの作業ディレクトリ（`output/`）の中身は `.claude/rules/article-layout.md` に書いてあります。ここでは工程を支える側だけを挙げます。

```
.claude/skills/article/references/   /article 付属の工程詳細と文体ガイド
  phase-deepen.md / phase-outline.md / phase-write.md  掘る・組む・書く各工程の詳細手順とテンプレート
  map-spec.md                        地図の抽出規則・生成手順・検算
  voice-style.md                     著者の文体・語り口の正本。0. 数値仕様 / 1. 公開記事の実例 / ルール1-16（型）/ 17-23（AI 的傾向への対抗）
  cognitive-rhythm.md                認知リズム（緊張・拍・密度波形）の設計規範
.claude/skills/article/templates/    core.md と地図の骨格
.claude/skills/article/scripts/      render-map.mjs（地図の抽出結果 map.json から map.html を生成する）
.claude/skills/fetch-page/scripts/   wix-html-to-md.mjs（公開記事 Wix の HTML → Markdown）
.claude/skills/review/references/    lens ごとの入力・観点・出力テンプレート（lens-critique / lens-drift / lens-readers / lens-author）

scripts/                             機械ゲートと変換
  lint-draft.mjs                     数値仕様・禁止句・textlint を1レポートにまとめる（CLI / hook / --metrics）
  draft-lint.config.json             閾値と禁止句（voice-style「0.」と同期）
  prh.yml                            表記辞書（textlint-rule-prh）
  textlint-allowlist.yml             lint 除外（ℹ️/✍️ メモ・HTML コメント・URL）
  render-preview.mjs                 draft.md から確認用の HTML（preview/index.html）を生成する（CLI / hook）
  serve-preview.mjs                  プレビューを図込みでブラウザに出すためのローカル静的サーバー（.claude/launch.json から起動）
  revise.mjs                         固めた時点の本文を基準に保存し（freeze）、その後の直しを差分 HTML にする（show）
  diff-drafts.mjs                    2つの Markdown を比べ、差分をマーカー付き Markdown にする（revise.mjs が使う）
  render-revision.mjs                マーカー付き Markdown を、変更箇所だけ色付きの HTML にする
.textlintrc.json                     textlint 設定（preset-ai-writing ＋ ja-technical-writing の選択適用）
```

## セットアップ

```bash
npm install
git config core.hooksPath .githooks
```

`npm install` で textlint 一式（`@textlint-ja/textlint-rule-preset-ai-writing`、`textlint-rule-preset-ja-technical-writing`、`textlint-rule-prh`）が入ります。lint は手動でも回せます:

```bash
node scripts/lint-draft.mjs output/{yyyymmdd}_{テーマ}/draft.md
```

draft を Edit/Write するたびに同じレポートを自動で受け取るには、`.claude/settings.json`（ローカル専用・gitignore 済み）に PostToolUse hook を足します:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/lint-draft.mjs\" --hook", "timeout": 120 },
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/render-preview.mjs\" --hook", "timeout": 30 }
        ]
      }
    ]
  }
}
```

lint の hook が反応するのは `scripts/draft-lint.config.json` の `targetGlobs` に載っているファイルだけです。ドラフト（`output/**/draft*.md` と `published/**/draft*.md`）に加えて、核（`core.md`、5 行と各行の字数）も対象です。掘った思考（`thinking.md`）は中間成果物なので対象にしていません。警告を返すだけでブロックはしません。

プレビューの hook は `output/{記事}/draft.md` を書くたびに、同じフォルダの `preview/index.html` を再生成します。正本は draft.md で、HTML は生成物なので手で編集しません。成功時は何も返さず、画像が見つからない時と生成に失敗した時だけ知らせます。手動で生成する場合は次のとおりです:

```bash
node scripts/render-preview.mjs output/{yyyymmdd}_{テーマ}/draft.md
```

### 図込みでプレビューを読む

`file://` で開くと相対パスの画像が出ない環境があるので、`.claude/launch.json` に登録したローカルサーバー（`preview`、`scripts/serve-preview.mjs`）を経由して読みます。Claude Code の Browser ペインなら `preview` を起動するだけで、`http://localhost:8765/output/{記事}/preview/index.html` が図込みで開きます。図を見ながら AI と会話して推敲する、という使い方のためのものです。

### 固めた後の直しを、差分だけ色付きで見返す

ほぼ完成した本文に細かい修正や追記を入れたい時や、公開後に一節を足したい時は、「何を足して何を削ったか」だけが見えると判断が速くなります。固めたと思った時点で基準を切り、あとは本文をそのまま直し続けると、基準からの差分だけを追加は緑・削除は赤で示した HTML が出ます。公開版かどうかは問いません:

```bash
node scripts/revise.mjs freeze output/{記事}/draft_user.md   # 今の本文を基準（revision/baseline.md）として保存
node scripts/revise.mjs show   output/{記事}/draft_user.md   # 基準と今の本文を比べて revision/index.html を作る
```

基準を切り直すと前の基準は `revision/_archive/` に退避します。差分の正本は `revision/draft_revision.md` で、マーカーは `{+ 追加 +}` `{- 削除 -}` `{? 著者への確認メモ ?}` の3種です。AI が改訂案を出す時は、この正本にマーカーで直接書き込み、`scripts/render-revision.mjs` だけを再実行しても同じ HTML になります。採用が決まったら `revise.mjs apply` がマーカーを剥がして本文へ書き戻します。この一連の進め方（基準は AI が触らない、著者固有の事実は確認メモで返す、採否は著者）は `/revise` スキルが持ち、著者が「固まった」「一節足したい」と言えば立ち上がります。公開時は `/publish-article` が公開版を基準として自動で固めます。

## リポジトリの公開境界

このリポジトリは Public ですが、記事制作の作業場そのものは含まれていません。

- `output/`（このリポには含まれない）: 記事ごとの作業ディレクトリ。核・思考の深掘り・レビュー指摘などの生素材はここで育ち、gitignore により commit されません。
- `published/`: 公開を決めた記事について、公開してよいと判断した成果物（核・思考メモ・構成・ドラフト等）だけを選別して置く公開層です。「思考の過程ごと共有する」というブログの方針と、「推敲前の生素材は出さない」という線引きを両立させるための構造です。

## ライセンス

MIT License です（`LICENSE` を参照してください）。

# My Blog Supporter

ブログ記事と登壇資料を、著者と AI（Claude Code）が往復しながら作るための個人用ワークフローです。

テーマを渡すと記事が出てくるツールではありません。問いと判断は人間が握り、調べる・整理する・叩き台を作るといった作業だけを AI に任せます。自分にとってブログは思考整理の手段で、書く価値の大半は「頭の中を整理し、調べ、言葉にする」過程にあります。その過程を AI に手伝わせながら、出来上がりが「本人が書いたもの」であり続ける状態を保つのが目的です。

到達点は記事ごとに違っても、共通の北極星はひとつです。読者が「腑に落ちる・自分も考えたくなる・自分の現場で辿り直したくなる」こと。煽り・断定・特別性の演出からは作りません。

## 流れ

記事でも登壇でも1本につき1フォルダを作り、まず **核 → 掘る** で中身を固めます。何を・誰に伝え、どうなってほしいかを決めるこの対話は、媒体に依らず共通です。その先は媒体で分かれ、ブログは **組む → 書く**、登壇は **場 → 組む → 書く** と成果物が育ちます。1本で作るのは、ブログか登壇のどちらか1つです。掘ると書くは行き来してよく、組むは飛ばせます。

| 工程 | 成果物 | 何をするか |
|---|---|---|
| 核（共通） | `core.md` | 問い・読者・読後・動機・現在地の5行と形式を、著者の言葉で書いて承認する |
| 掘る（共通） | `thinking.md` | 論点を出し、素材を集め、主張を言語化する |
| 組む（ブログ） | `outline.md` / `map.html` | 見出し構成と、章ごとの主張・論点・素材の見取り図 |
| 書く（ブログ） | `draft.md` | 本文。lint とレビューを通してから著者に渡す |
| 場（登壇） | `event.md` | 主催の規定（持ち時間・提出形式・最小文字） |
| 組む（登壇） | `storyline.md` | 段ごとに、何を言い、観客がどうなるか |
| 書く（登壇） | `deck.md` | 見出しだけで話が通るゴーストデッキと台詞。lint とストーリーボードで点検する |

著者はコマンドを打ちません。「新しいテーマを思いついた」「叩いてほしい」「書いてみて」「登壇の流れを組みたい」と言えば、`CLAUDE.md` が工程へ振り分けて Skill を呼びます。

| Skill | 役割 |
|---|---|
| `/core` | 核・掘るの対話（ブログと登壇に共通）と、計画の地図 |
| `/review` | 隔離コンテキストで叩く・点検する（critique / drift / readers / audience / author） |
| `/illustrate` | 概念図を作図して PNG にする |
| `/blog-write` | ブログ記事の組む・書く |
| `/blog-revise` | 固めた本文への直しを、基準からの差分だけ色付きで見返す |
| `/blog-thumbnail` | 記事のサムネイル（カバー画像）を共通の型で PNG にする |
| `/blog-wix-sync` | Wix ブログの下書きを API で作る・取り込む（公開はしない） |
| `/blog-promote` | 公開してよい成果物を選別して `published/` へ昇格させる（記事の公開は Wix で著者が行う） |
| `/blog-announce` | 公開した記事の X 告知ポストを、著者の過去の告知を見本に文案化する（投稿はしない） |
| `/presentation-write` | 登壇の場・組む・書く（`event.md`・`storyline.md`・`deck.md`） |

接頭辞の無い Skill は媒体をまたいで使い、`blog-` と `presentation-` は媒体専用です。

## 守っていること

**問いの出どころを著者に固定する。** AI に自走させると、問いは検証しやすい方へ静かに流れます。`core.md` は承認後に AI が書き換えません。AI が著者に返す問いは「core.md のどの行に効くか」を名指しし、名指しできない問いは駐車場へ退避して著者に出しません。

**引き出す工程と叩く工程を分ける。** 批判は会話履歴を持たない `/review` に隔離し、著者が「叩いて」と言った時だけ走らせます。対話が萎縮することも、批判が対話の空気に流されることも避けるためです。

**AI が書いたものは別の目で点検する。** `/review drift` が前段から背骨を落としていないか・根拠なく足していないかを読み比べ、`/review readers` が初見の読者として通読します。登壇では `/review audience` が、読み返せない会場の観客として通しで聞きます。書いた本人に自分の追加を正当化させないためです。

**文体はルールより数値と実例で寄せる。** AI 版と公開記事の差は語尾ではなく密度にありました（保険文・多段の論証・章間の道案内・定型の結び）。[voice-style.md](.claude/skills/blog-write/references/voice-style.md) は公開記事の抜粋を先頭に置き、数えられるものは `scripts/draft-lint.config.json` の閾値で `scripts/lint-draft.mjs` が判定します。登壇の台詞は散文の規範で均さず、著者の言葉に `（著者）`、AI の言い回しに `（仮）` の印を付けて区別します。

## 構成

```
CLAUDE.md          オーケストレーション（目的・原則・不変条件・起動・公開境界の正本）
.claude/skills/    工程ごとの Skill。references/ に工程詳細と文体ガイド、scripts/ に専用スクリプト
.claude/rules/     作業ディレクトリ（output/ と published/）の構成
scripts/           lint・プレビュー・差分・公開層への昇格・登壇の deck の点検とストーリーボード。使い方は各スクリプト冒頭のコメント
published/         公開層
```

## セットアップ

```bash
npm install
git config core.hooksPath .githooks
```

前者で textlint 一式が入ります。後者は `output/` の誤 commit を防ぐ pre-commit hook を有効にします。

`draft.md`・`deck.md` を書くたびに lint とプレビューを自動で返す PostToolUse hook は `.claude/settings.json` に入っており、clone すればそのまま動きます。対象ファイルと判定の扱いは `CLAUDE.md` の「機械ゲート」を参照してください。permissions などの個人設定は `.claude/settings.local.json`（gitignore 済み）に置きます。

### Wix 連携

`/blog-wix-sync` は Wix Blog API で下書きを作り、取り込みます。使うには API キーが要ります。

1. サイトのオーナーアカウントで [API Keys Manager](https://manage.wix.com/account/api-keys) を開き、キーを作る
   - 対象サイト: このブログのサイトだけ
   - 権限: Wix Blog の管理、Media Manager の管理、Rich Content（Ricos）の管理、Members の読み取り
2. リポジトリ直下に `.env`（gitignore 済み）を置く

```
WIX_API_KEY=<作成したキー>
WIX_SITE_ID=<ダッシュボードの URL で /dashboard/ の直後にある ID>
```

`node .claude/skills/blog-wix-sync/scripts/wix-sync.mjs check` で認証を確かめられます。Node 22 以上が要ります。

## 公開境界

このリポジトリは Public です。作業層 `output/` は gitignore で、生素材は commit されません。`published/` には `/blog-promote` が選別・点検し、著者が承認した記事の成果物だけを置きます。思考の過程ごと共有しつつ、推敲前の生素材は出さないための構造です。登壇の作業物は `output/` だけで扱い、`published/` には出しません（スライドの正は著者の Google Drive にあります）。

## ライセンス

MIT License です（`LICENSE` を参照してください）。

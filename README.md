# My Blog Supporter

ブログ記事を、著者と AI（Claude Code）が往復しながら書くための個人用ワークフローです。

テーマを渡すと記事が出てくるツールではありません。問いと判断は人間が握り、調べる・整理する・叩き台を作るといった作業だけを AI に任せます。自分にとってブログは思考整理の手段で、書く価値の大半は「頭の中を整理し、調べ、言葉にする」過程にあります。その過程を AI に手伝わせながら、出来上がりが「本人が書いたもの」であり続ける状態を保つのが目的です。

到達点は記事ごとに違っても、共通の北極星はひとつです。読者が「腑に落ちる・自分も考えたくなる・自分の現場で辿り直したくなる」こと。煽り・断定・特別性の演出からは作りません。

## 流れ

記事1本につき1フォルダを作り、**核 → 掘る → 組む → 書く** の順に成果物が育ちます。掘ると書くは行き来してよく、組むは飛ばせます。

| 工程 | 成果物 | 何をするか |
|---|---|---|
| 核 | `core.md` | 問い・読者・読後・動機・現在地の5行を著者の言葉で書き、承認する |
| 掘る | `thinking.md` | 論点を出し、素材を集め、主張を言語化する |
| 組む | `outline.md` / `map.html` | 見出し構成と、章ごとの主張・論点・素材の見取り図 |
| 書く | `draft.md` | 本文。lint とレビューを通してから著者に渡す |

著者はコマンドを打ちません。「新しいテーマを思いついた」「叩いてほしい」「書いてみて」と言えば、`CLAUDE.md` が工程へ振り分けて Skill を呼びます。

| Skill | 役割 |
|---|---|
| `/article` | 核・掘る・組む・書くの対話本体 |
| `/review` | 隔離コンテキストで叩く・点検する（critique / drift / readers / author） |
| `/revise` | 固めた本文への直しを、基準からの差分だけ色付きで見返す |
| `/illustrate` | 概念図を作図して PNG にする |
| `/publish-article` | 公開してよい成果物を選別して `published/` へ出す |
| `/fetch-page` | WebFetch で取れないページを実ブラウザで取る |

## 守っていること

**問いの出どころを著者に固定する。** AI に自走させると、問いは検証しやすい方へ静かに流れます。`core.md` は承認後に AI が書き換えません。AI が著者に返す問いは「core.md のどの行に効くか」を名指しし、名指しできない問いは駐車場へ退避して著者に出しません。

**引き出す工程と叩く工程を分ける。** 批判は会話履歴を持たない `/review` に隔離し、著者が「叩いて」と言った時だけ走らせます。対話が萎縮することも、批判が対話の空気に流されることも避けるためです。

**AI が書いたものは別の目で点検する。** `/review drift` が前段から背骨を落としていないか・根拠なく足していないかを読み比べ、`/review readers` が初見の読者として通読します。書いた本人に自分の追加を正当化させないためです。

**文体はルールより数値と実例で寄せる。** AI 版と公開記事の差は語尾ではなく密度にありました（保険文・多段の論証・章間の道案内・定型の結び）。[voice-style.md](.claude/skills/article/references/voice-style.md) は公開記事の実測値と抜粋を先頭に置き、数えられるものは `scripts/lint-draft.mjs` が判定します。

## 構成

```
CLAUDE.md          オーケストレーション（目的・原則・起動・公開境界の正本）
.claude/skills/    工程ごとの Skill。references/ に工程詳細と文体ガイド、scripts/ に専用スクリプト
.claude/rules/     記事ディレクトリ（output/ と published/）の構成
scripts/           lint・プレビュー・差分。使い方は各スクリプト冒頭のコメント
published/         公開層
```

## セットアップ

```bash
npm install
git config core.hooksPath .githooks
```

前者で textlint 一式が入ります。後者は `output/` の誤 commit を防ぐ pre-commit hook を有効にします。

draft を書くたびに lint とプレビューを自動で受け取るには、`.claude/settings.json`（gitignore 済み）に PostToolUse hook を置きます。対象ファイルと判定の扱いは `CLAUDE.md` の「機械ゲート」を参照してください。

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

## 公開境界

このリポジトリは Public です。記事の作業層 `output/` は gitignore で、生素材は commit されません。`published/` には `/publish-article` が選別・点検し、著者が承認した成果物だけを置きます。思考の過程ごと共有しつつ、推敲前の生素材は出さないための構造です。

## ライセンス

MIT License です（`LICENSE` を参照してください）。

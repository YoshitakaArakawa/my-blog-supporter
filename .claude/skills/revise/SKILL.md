---
name: revise
description: 固まった本文（ほぼ完成したドラフト、または公開済みの記事）への細かい直し・追記を、固めた時点からの差分だけを色付きにした HTML で見返しながら進める。「固まった」「ここから細かく直したい」「公開後に一節を足したい」「追記したいアイデアが出た」「差分で見せて」と言われた時に使う。基準を保存し（freeze）、著者の直しまたは AI の改訂案を差分 HTML にし（show）、採用分を本文へ書き戻す（apply）。本文を大きく書き換える書く工程の途中では使わない（それは article）
argument-hint: "[テーマ] [freeze|show|apply](任意)"
---

# 固めた後の直し

固まった本文に対して、何を足して何を削ったかだけが見える状態で推敲する。基準（`revision/baseline.md`）からの差分を `revision/index.html` に出し、著者の採否を経て本文へ書き戻す。核・問いの規律・真正性は [article](../article/SKILL.md) の不変条件をそのまま適用する。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が `freeze` / `show` / `apply`。どちらも任意）。`$OUTPUT_DIR` は `output/{yyyymmdd}_{テーマ}/`。本文ファイルは `draft_user.md`（無ければ `draft.md`）。

## 規範

- **基準は読むだけ**。`baseline.md` を AI が書き換えない。基準を切り直すのは著者が「固まった」と言った時だけで、`freeze` が前の基準を `_archive/` へ退避する。
- **改訂案は差分ファイルにだけ書く**。AI の提案は `revision/draft_revision.md` にマーカー（`{+ 追加 +}` `{- 削除 -}` `{? 著者への確認メモ ?}`）で書き、本文ファイルには `apply` 以外で触らない。
- **著者固有の事実を埋めない**。体験・感情・経緯・誰と何を話したかは、著者の発言や thinking.md に無ければ `{? ?}` で返す。もっともらしい体験談を作って橋にしない（article 不変条件6）。
- **提案には核の行を添える**。改訂案の各項目に、core.md のどの行に効くかを付けて返す（article 不変条件2）。添えられない項目は出さない。
- **全文を会話に貼らない**。返すのは HTML のパス、変更点の要約（3行まで）、`{? ?}` の一覧。
- **大きく動く段階では使わない**。draft.md を章ごと書き直している最中なら article の書く工程へ戻す。差分は細かい修正・追記のためのもの。
- **裏付けの Web 取得は pull**。著者の承認を得てから行い、references.md に取得状態を1行で控える（article 不変条件4）。
- **図を足す時は illustrate に渡す**。戻ってきた `![...](images/...)` の1行を `{+ +}` で差分ファイルに入れる。

## 手順

進捗:

- [ ] **現在地**: `node ${CLAUDE_PROJECT_DIR}/scripts/revise.mjs status <本文>` で基準の有無を見る。公開済み記事なら、基準の有無にかかわらず毎回 `/fetch-page` の yarakawa.com 手順で `published.md` を取り、本文ファイルをそれに揃えてから `freeze` を打ち直す（Wix 上の直しを取りこぼさないため。公開時に `/publish-article` が切った基準は上書きされ `_archive/` に残る）。未公開の本文で基準が無ければ「今の本文を基準にしてよいか」を確認して `freeze` する。
- [ ] **経路を決める**: 著者が自分で本文を直す（直した）なら次へ。AI が改訂案を出すなら、`baseline.md` の本文を `revision/draft_revision.md` へ写し、そこにマーカーで書く。「何をどう変えるべきか提案して」と言われた時は、書く前に変更箇所と方針を3〜5点で示して合意を取る。
- [ ] **差分を出す**: 著者が直した経路は `node ${CLAUDE_PROJECT_DIR}/scripts/revise.mjs show <本文>`。AI 経路は `node ${CLAUDE_PROJECT_DIR}/scripts/render-revision.mjs $OUTPUT_DIR/revision/draft_revision.md`。HTML は `.claude/launch.json` の `preview` サーバー経由（`http://localhost:8765/output/{記事}/revision/index.html`）で開くと図も出る。
- [ ] **著者に返す**: HTML のパス、変更点の要約、`{? ?}` の一覧。著者の採否と `{? ?}` への回答を受けて差分ファイルを直し、再描画する。却下された追加は `{+ +}` ごと消し、却下された削除は `{- -}` を外して元の文に戻す。
- [ ] **書き戻す**: 著者が確定したら `node ${CLAUDE_PROJECT_DIR}/scripts/revise.mjs apply <本文>`。`{? ?}` が残っていれば止まるので先に解決する。採用した論点は thinking.md の該当節に `[著者:会話 {yyyymmdd}]` で追記する。公開済み記事なら `published/{記事}/draft_user.md` にも同じ内容を反映する（公開層の推敲反映は直接編集でよい）。Wix への反映は著者が行う。
- [ ] **次に備える**: 反映後、続けて直すなら `freeze` を切り直すかを著者に確認する。切り直すと差分は今の本文からになる。

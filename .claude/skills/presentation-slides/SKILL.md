---
name: presentation-slides
description: 登壇の deck.md を Google スライドに組み、著者が Slides で直した版を deck_user.md に取り込む。組む前に deck.md とテンプレートからスライドの一覧（HTML）を作って形を合意し、テンプレートのデッキを複製してレイアウトから組み、最小文字・溢れ・重なりを機械で点検する。「Google スライドに組んで」「スライドに反映して」「スライドの一覧を見せて」「組んだスライドを点検して」「Slides で直したのを取り込んで」「全体デッキに入れて」「主催のテンプレートで組みたい」と言われた時に使う。見出しや台詞（deck.md の中身）を書くのは presentation-write、図を描くのは illustrate
argument-hint: "[テーマ] [preview|build|check|pull](任意)"
allowed-tools: Bash(node:*) Read
---

# Google スライドに組む

登壇の作業層 `output/{yyyymmdd}_{テーマ}/`（以下 `$OUTPUT_DIR`）の deck.md を、Google スライドに組む。組む前は HTML の一覧、組んだ後は Slides を正とする。一覧と Slides は同じテンプレートの定義から作るので、一覧で合意した形がそのまま Slides になる。

引数: `$ARGUMENTS`（1つ目がテーマ、2つ目が工程。どちらも任意）。工程が無ければ、slides.json が無ければ **一覧**、あれば著者の発言から **点検** か **取り込み** にする。スクリプトはリポジトリのルートで `node ${CLAUDE_SKILL_DIR}/scripts/{名前}.mjs` として実行する。使い方は各スクリプト冒頭のコメントにある。

Drive と Slides に書く前に、組み込みスキル `anthropic-skills:google-workspace` の Slides の reference を読む。その見た目の規則のうち、テンプレートの定義と event.md が決めていること（背景の色・最小文字など）は、著者の指定としてこちらを優先する。

## 規範

- **外へ出る操作は、著者の承認を得てから**。組上は1回につき1回、作るデッキの名前・枚数・一時公開する図を一覧で示して承認を取る。リンク公開（一時公開のフォルダの共有）・ゴミ箱への移動・自分で複製したデッキ以外（全体デッキなど）への書き込みは、その都度承認を取る
- **deck.md は書き換えない**。一覧で見つかった直し（文言・`／` の改行・役割・図）は、presentation-write の規範（印と言葉）に沿って著者の承認を得てから deck.md に入れる。境界は「deck.md とテンプレートで表せることは一覧で直し、スライドごとの微調整は組んだ後の Slides で直す」
- **組んだ後は Slides が正**。著者の直しは取り込みで deck_user.md に戻す。deck_user.md は生成物で、手で直さない
- **画面とノート**: 画面の文字からは `（仮）` を外す。スピーカーノートには台詞だけを入れ、印（`（著者）`・`（仮）`）は残す。`メモ:` と `反応:` は入れない
- **要求は写して送り、読み出しは写さない**。スクリプトが出す requests を `update_presentation` に写す（1回 20KB 程度まで、`writeControl` は送る直前の読み出しの revisionId）。マスクなしの読み出しは app がファイルに保存するので、そのパスをスクリプトに渡す（[references/slides-api.md](references/slides-api.md)）
- **著者が上げたファイルは動かさない**。一時公開に出し入れするのは、スキルが作った複製だけにする
- **connector が拒否したら止める**。認可の理由で拒否されたら、組上を止めて著者に伝え、黙って別の経路に切り替えない（[references/drive.md](references/drive.md) の「connector が使えない時」）

## 手順

### 準備（初回だけ）

`${CLAUDE_SKILL_DIR}/drive.local.json`（gitignore。書式は `drive.example.json`）に、テンプレートのデッキと置き場のフォルダの ID が要る。無ければ [references/drive.md](references/drive.md) の「置き場と登録のファイル」「テンプレートのデッキを置く」で作る。テンプレートの定義を直した時も、同じ節の手順 3 で同期する。

### 1. 一覧（組む前）

1. `render-slides.mjs $OUTPUT_DIR/deck.md` で `$OUTPUT_DIR/preview/slides.html` を作る。各スライドの下に、溢れ・行数・最小文字・コントラスト・重なり・見つからない画像の警告が出る
2. 著者に、preview サーバー経由の URL（`http://localhost:8765/output/{登壇}/preview/slides.html`）と警告の要約を返す
3. 警告が 0 件になり、著者が形を合意するまで、規範どおりに deck.md を直して作り直す
   - 図を描く時は、`render-slides.mjs $OUTPUT_DIR/deck.md --frames` で枠ごとの寸法と文字の下限を出し、illustrate に渡す
   - テンプレートを選べる回は、`--template {名前}` の一覧を並べて著者が選ぶ

### 2. 組上

1. 承認を取る（作るデッキの名前 `{yyyymmdd} {デッキのタイトル}`・枚数・一時公開する図）
2. テンプレートのデッキを `copy_file` で `deckFolderId` に複製する
3. 図があれば、[references/drive.md](references/drive.md) の「ローカルの図を差し込む」で、一時公開の複製と URL の対応を作る
4. 複製したデッキを読み出し、`build-slides.mjs slides $OUTPUT_DIR/deck.md --read <読み出し> --images <対応>` の要求を送る
5. 送ったらすぐ、一時公開の複製を `imageFolderId` へ出す
6. 読み出し、`build-slides.mjs notes` の要求を送る（台詞と、テンプレートの見本スライドの削除）
7. 読み出し、`build-slides.mjs record --images <対応>` で `$OUTPUT_DIR/slides.json` を書き、続けて点検する

### 3. 点検

1. 組上の 7 と同じ読み出しで `check-slides.mjs --read <読み出し> --deck $OUTPUT_DIR/deck.md` を実行する。最小文字・溢れ・重なり・コントラスト・空のプレースホルダ・プレースホルダの外の文字箱・ページの外を見る
2. 問題が出たら、deck.md かテンプレートで直せるものは一覧に戻って直し、承認を得て組み直す。スライドごとの微調整は著者が Slides で直す（頼まれたら AI が API で直す）
3. 著者に、デッキのリンク・点検の結果・仮置きの枠（著者が画像を入れる場所）の一覧を返す。見た目は `read_slide_page_thumbnail` のサムネイルで補助的に確かめる

### 4. 取り込み（著者が Slides で直した後）

1. 読み出し、`pull-slides.mjs $OUTPUT_DIR/deck.md --read <読み出し>` で `$OUTPUT_DIR/deck_user.md` を書く
2. 冒頭の ℹ️ メモ（並べ替え・追加・削除・印の無い台詞など）を著者に返す。台詞の印を `（著者）` に替えるかは著者が決める
3. `node scripts/lint-deck.mjs $OUTPUT_DIR/deck_user.md` で、足したスライドの `秒:`・`核:` の抜けを見る

### 全体デッキ・主催のテンプレート

共同登壇の全体デッキへ入れる回と、主催のテンプレートで組む回は、[references/template.md](references/template.md) の「全体デッキへの入れ方」「外から与えるテンプレート」に従う。

## 参照

- テンプレートの定義・内蔵の navy・外から与えるテンプレート・全体デッキ: [references/template.md](references/template.md)
- Drive の置き場・画像の一時公開・connector が使えない時: [references/drive.md](references/drive.md)
- Slides の API の実務の注意: [references/slides-api.md](references/slides-api.md)
- 見た目の方針: [references/visual-policy.md](references/visual-policy.md)

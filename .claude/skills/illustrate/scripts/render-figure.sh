#!/usr/bin/env bash
#
# 図（SVG または HTML フラグメント）を同梱フォントごと Chromium で PNG にレンダリングする。
#
#   使い方: render-figure.sh <セッション名> <入力 .svg|.html> <出力 .png>
#
#   <セッション名>  playwright-cli の named session。単一案は fig、複数案は案ごとに ill1 / ill2 …
#                   （同一セッションを並列で使うと playwright-cli が壊れるため）
#   <入力>          .svg = 図そのもの / .html = フラグメント（ルートに id="fig"、レイアウト用 <style> 同梱）
#   <出力>          .png の保存先。親ディレクトリは自動で作る
#
#   カレントディレクトリはリポジトリルートであること（作業ファイルを .playwright-cli/ に書くため）。
#
# 検証済みの制約（Windows / playwright-cli 0.1.x）。この 4 点を外すと無言フォールバックかハングになる。
# 呼び出し側はこのスクリプトを改変せず、そのまま実行する:
#
#   1. `file:` URL はブロックされるが、ベア絶対パスで open すれば通る（内部で file:// に解決される）。
#      だから作業 HTML をディスクに書き、絶対パスで開く。data URL に詰め込まない。
#   2. 同梱フォントは base64 で @font-face にインラインする。file:// ページからの url() フォント取得は
#      CORS で失敗し、システム既定フォントに無言で化ける。
#   3. base64 はファイルへストリームする。数 MB の base64 をシェル引数や data URL として渡すと
#      Windows の引数長上限で固まる。
#   4. 撮影前に document.fonts.ready で全 status が loaded であることを確認する。
#      error / unloaded のまま撮ると別フォントで焼き付く。
#
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "error: 引数は 3 つ。使い方: render-figure.sh <セッション名> <入力 .svg|.html> <出力 .png>" >&2
  exit 2
fi

SESSION="$1"
SRC="$2"
OUT_PNG="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FDIR="$SCRIPT_DIR/../references/fonts"
ROOT="$(pwd)"

[ -f "$SRC" ] || { echo "error: 入力が見つからない: $SRC" >&2; exit 1; }
for f in ZenKakuGothicNew-Regular.ttf ZenKakuGothicNew-Bold.ttf; do
  [ -f "$FDIR/$f" ] || { echo "error: 同梱フォントが見つからない: $FDIR/$f" >&2; exit 1; }
done

# 撮影対象は内容にクリップする。SVG はルート要素、HTML フラグメントは約束された id="fig"。
case "$SRC" in
  *.svg)  CLIP="svg" ;;
  *.html) CLIP="#fig" ;;
  *) echo "error: 入力は .svg か .html: $SRC" >&2; exit 1 ;;
esac

mkdir -p "$(dirname "$OUT_PNG")" .playwright-cli
# 作業 HTML はセッション名で分ける（複数案の並列実行で互いに上書きしないため）。
TMP=".playwright-cli/_render_${SESSION}.html"

{
  printf '<!doctype html><meta charset=utf-8><style>html,body{margin:0}'
  printf '@font-face{font-family:"Zen Kaku Gothic New";font-weight:400;src:url("data:font/ttf;base64,'
  base64 -w0 "$FDIR/ZenKakuGothicNew-Regular.ttf"
  printf '")}'
  printf '@font-face{font-family:"Zen Kaku Gothic New";font-weight:700;src:url("data:font/ttf;base64,'
  base64 -w0 "$FDIR/ZenKakuGothicNew-Bold.ttf"
  printf '")}'
  printf '</style>'
  cat "$SRC"
} > "$TMP"

playwright-cli -s="$SESSION" open "$ROOT/$TMP"

# 同梱は Regular と Bold の 2 面のみ。どちらかでも loaded でなければ撮らずに止める（制約 4）。
FONT_STATUS="$(playwright-cli -s="$SESSION" eval \
  "document.fonts.ready.then(()=>Array.from(document.fonts).map(f=>f.status).join(','))")"
case "$FONT_STATUS" in
  *error*|*unloaded*|"")
    playwright-cli -s="$SESSION" close || true
    echo "error: フォントが読めていない (status=$FONT_STATUS)。撮影を中止した" >&2
    exit 3
    ;;
esac

playwright-cli -s="$SESSION" screenshot "$CLIP" --filename="$OUT_PNG"
playwright-cli -s="$SESSION" close

[ -s "$OUT_PNG" ] || { echo "error: PNG が生成されなかった: $OUT_PNG" >&2; exit 4; }
echo "OK png=$OUT_PNG clip=$CLIP fonts=$FONT_STATUS"

# 同梱フォント

illustrate スキルが図のタイポに使う実フォント。**決定的なレンダリング**（ネットワーク非依存・無言フォールバックなし）のために同梱する。

## 収録

- `ZenKakuGothicNew-Regular.ttf` / `ZenKakuGothicNew-Bold.ttf` — Zen Kaku Gothic New（The Zen Kaku Gothic Project Authors）。日本語＋基本ラテンを含む。
- `OFL.txt` — SIL Open Font License 1.1（上記フォントの配布条件）。

出所: Google Fonts（`github.com/googlefonts/zen-kakugothic`）。

## 使い方

SKILL.md「レンダリングコマンド」が、レンダリング時にこの .ttf を **base64 で `@font-face` にインライン**し、ベア絶対パスで開いた HTML から参照する。

この遠回りには検証済みの理由がある:
- `file:` URL は playwright-cli にブロックされる（ベア絶対パスなら通る）。
- file:// ページからの `url()` フォント取得は CORS で `error` になる（→ base64 埋め込みが必須）。
- 数 MB の base64 をシェル引数や data URL で渡すと Windows の引数長上限で固まる（→ `base64 -w0 ttf >> file` でファイルへストリーム）。

## 追加・差し替え

別の書体を使うときは .ttf をここに置き、SKILL.md の `@font-face` ストリーム行を1行足す。**再配布する以上、フォントのライセンス本文（OFL 等）も必ず同梱する。**

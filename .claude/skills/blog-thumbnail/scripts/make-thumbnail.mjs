#!/usr/bin/env node
/**
 * make-thumbnail.mjs — タイトルの行から記事のサムネイル（カバー画像）を作る
 *
 * 使い方（リポジトリルートで実行する）:
 *   node make-thumbnail.mjs <記事ディレクトリ> <行1> [行2 ...] [--size N]
 *
 *   <記事ディレクトリ>  output/{yyyymmdd}_{テーマ}/
 *   <行>               改行位置で区切ったタイトル。1 引数が 1 行になる
 *   --size N           文字サイズ（px）。既定 96。行が収まらない時だけ下げ、短い行ばかりで余白が大きい時は 128 まで上げてよい
 *
 * 出力:
 *   <記事>/images/src/thumbnail.html  テンプレートに行を埋めたソース（修正・再描画はここから）
 *   <記事>/images/thumbnail.png       成果物
 *
 * レンダリングは illustrate の render-figure.sh に任せる（同梱フォントの読み込み確認を含む）。
 * スタイルの値はテンプレート（templates/thumbnail.html）にあり、正本は SKILL.md「スタイル」。
 * 依存: Node 標準機能・bash・playwright-cli。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = path.join(SKILL_DIR, "templates", "thumbnail.html");
const RENDER = path.join(SKILL_DIR, "..", "illustrate", "scripts", "render-figure.sh");
// 実測した既存サムネイルの文字サイズ（SKILL.md「スタイル」）
const DEFAULT_SIZE = 96;
// 収まらない行を縮める時でも、本文幅に縮小されたカバーで読める下限
const MIN_SIZE = 64;
// 短い行ばかりで余白が大きい時に上げてよい上限（3行で「Plugin & MCP」程度が幅の8割に収まる）
const MAX_SIZE = 128;

function fail(msg, code = 2) {
  console.error(`error: ${msg}`);
  process.exit(code);
}

const args = process.argv.slice(2);
let size = DEFAULT_SIZE;
const sizeAt = args.indexOf("--size");
if (sizeAt !== -1) {
  size = Number(args[sizeAt + 1]);
  args.splice(sizeAt, 2);
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    fail(`--size は ${MIN_SIZE}〜${MAX_SIZE} の整数`);
  }
}
const [dir, ...lines] = args;
if (!dir || lines.length === 0) fail("使い方: make-thumbnail.mjs <記事ディレクトリ> <行1> [行2 ...] [--size N]");
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`記事ディレクトリが見つからない: ${dir}`, 1);
if (lines.some((l) => !l.trim())) fail("空の行がある（改行位置の指定を確かめる）");

// 行幅の概算。全角は 1em、半角は Meiryo Bold の平均字幅に近い 0.6em と見なす
const HALF_WIDTH_EM = 0.6;
// キャンバス幅 1122px から左右に約 60px ずつ余白を残す
const MAX_LINE_PX = 1000;
const em = (s) => [...s].reduce((w, c) => w + (c.codePointAt(0) <= 0xff ? HALF_WIDTH_EM : 1), 0);
const wide = lines.filter((l) => em(l) * size > MAX_LINE_PX);
if (wide.length) {
  fail(`行が幅 ${MAX_LINE_PX}px に収まらない見込み（${size}px）: ${wide.join(" / ")}。改行位置を変えるか --size を下げる`);
}

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = fs.readFileSync(TEMPLATE, "utf8")
  .replace("{{LINES}}", lines.map(escape).join("<br>"))
  .replace("{{FONT_SIZE}}", String(size));

const src = path.join(dir, "images", "src", "thumbnail.html");
const png = path.join(dir, "images", "thumbnail.png");
fs.mkdirSync(path.dirname(src), { recursive: true });
fs.writeFileSync(src, html);

// bash へはフォワードスラッシュで渡す（Windows の Git Bash でも解決できる形）
const posix = (p) => p.split(path.sep).join("/");
const r = spawnSync("bash", [posix(RENDER), "thumb", posix(src), posix(png)], { stdio: "inherit" });
if (r.error) fail(`bash を起動できない: ${r.error.message}`, 1);
process.exit(r.status ?? 1);

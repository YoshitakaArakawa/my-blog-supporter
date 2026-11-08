#!/usr/bin/env node
/**
 * render-deck.mjs — 登壇の deck.md から、ストーリーボード（preview/deck.html）を生成する
 *
 * 正本は deck.md。deck.html は生成物であり、手で編集しない（次の生成で上書きされる）。
 * 上半分は見出しだけの一覧（ゴーストデッキ。見出しだけを順に読んで話が通るかを見る）、
 * 下半分は1枚ずつのカード（画面に出るもの／伝える・役割・秒・核・反応・台詞・メモ）。
 * 骨組み（見出しと 伝える: だけ）の段階は、秒の代わりに「骨組み」と出す。
 * 見た目は Google スライドで組む時に決めるので、ここでは中身の並びだけを見せる。
 *
 * 使い方:
 *   node scripts/render-deck.mjs <deck.md> [--out <path>]   書き出す（既定: deck.md と同じ階層の preview/deck.html）
 *   node scripts/render-deck.mjs --hook                      PostToolUse hook（stdin に hook JSON）
 *
 * hook モードは output/ 直下の登壇フォルダの deck.md を書いた時だけ生成し、成功時は何も出力しない。
 * プレビューは .claude/launch.json の preview サーバー経由で /output/{登壇}/preview/deck.html を開く。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeck, readEvent, spokenChars, screenTitle, parseSeconds, isSkeleton } from "./lib/deck.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "deck-lint.config.json"), "utf8"));
const HOOK_TARGET = new RegExp(CONFIG.targetPattern);
// `見せる:` の値から画像のパスを拾う
const IMAGE_PATH = /([^\s（(、,]+\.(?:png|jpe?g|gif|webp|svg))/i;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
const br = (s) => esc(s).replace(/／/g, "<br>");

function card(s, ctx) {
  const f = s.fields;
  const title = screenTitle(s);
  const show = f["見せる"] ?? "";
  const img = show.match(IMAGE_PATH);
  let visual = "";
  if (img) {
    const abs = path.resolve(ctx.srcDir, img[1]);
    if (fs.existsSync(abs)) visual = `<img src="${esc(path.relative(ctx.outDir, abs).replace(/\\/g, "/"))}" alt="">`;
    else ctx.missing.push(img[1]);
  }
  if (!visual && show) visual = `<div class="ph">${esc(show)}</div>`;
  const body = s.body.length ? `<ul>${s.body.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  // 伝えることは画面に出さないので、カードの右側に置く
  const convey = s.convey.length ? `<div class="convey"><p class="label">伝える</p><ul>${s.convey.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : "";
  const sec = parseSeconds(f["秒"]);
  const est = Math.round((spokenChars(s.lines) / CONFIG.charsPerMinute) * 60);
  const over = s.lines.length && sec && est > sec * (1 + CONFIG.scriptOverTolerance);
  const lines = s.lines.map((l) => `<p class="line"><span class="mark ${l.mark === "著者" ? "author" : l.mark === "仮" ? "prov" : "none"}">${l.mark ?? "印なし"}</span>${esc(l.text)}</p>`).join("");
  const meta = [
    ["役割", f["役割"]], ["段", f["段"]], ["秒", f["秒"] ? `${f["秒"]}${s.lines.length ? `（台詞の見積もり ${est}秒）` : ""}` : null],
    ["核", f["核"]], ["反応", f["反応"]],
  ].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd${k === "秒" && over ? ' class="over"' : ""}>${esc(v)}</dd>`).join("");
  return `<section class="slide" id="s${s.index}">
  <div class="screen">
    ${title ? `<h2>${br(title)}</h2>` : ""}
    ${body}
    ${visual}
    ${f["出典"] ? `<p class="src">${esc(f["出典"])}</p>` : ""}
    <span class="no">${s.index}</span>
  </div>
  <div class="side">
    <p class="ghost">${esc(s.heading)}${s.provisional ? ' <span class="mark prov">仮</span>' : ""}</p>
    ${convey}
    <dl>${meta}</dl>
    ${lines ? `<div class="script">${lines}</div>` : ""}
    ${f["メモ"] ? `<p class="memo">メモ: ${esc(f["メモ"])}</p>` : ""}
  </div>
</section>`;
}

function page(deck, event, ctx) {
  const total = deck.slides.reduce((n, s) => n + (parseSeconds(s.fields["秒"]) ?? 0), 0);
  const limit = event?.seconds;
  const skeleton = isSkeleton(deck);
  // 骨組みの間は秒をまだ書かないので、欠けた秒の「?」も出さない
  const secOf = (s) => s.fields["秒"] ?? (skeleton ? null : "?");
  const ghost = deck.slides.map((s) => `<li><a href="#s${s.index}">${esc(s.heading)}</a>${s.provisional ? ' <span class="mark prov">仮</span>' : ""}${secOf(s) === null ? "" : `<span class="sec">${esc(secOf(s))}秒</span>`}</li>`).join("");
  const time = skeleton ? "骨組み（秒はまだ書いていない）" : `秒の合計 <span class="${limit && total > limit ? "over" : ""}">${total}秒</span>`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- 生成物: deck.md から scripts/render-deck.mjs が生成する。直しは deck.md に入れ、このファイルは編集しない -->
<title>${esc(deck.title ?? "デッキ")}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f4f2; color: #202124; font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif; font-size: 15px; line-height: 1.7; }
  main { max-width: 1180px; margin: 0 auto; padding: 40px 20px 120px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  .stats { color: #555; margin: 0 0 28px; }
  .stats .over { color: #b3261e; font-weight: 700; }
  h3 { font-size: 16px; margin: 32px 0 10px; color: #444; }
  ol.ghost-list { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 16px 16px 16px 44px; margin: 0; }
  ol.ghost-list li { margin: 4px 0; }
  ol.ghost-list a { color: #202124; text-decoration: none; }
  ol.ghost-list a:hover { text-decoration: underline; }
  .sec { color: #888; font-size: 13px; margin-left: 10px; }
  .slide { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 20px; margin: 22px 0; align-items: start; }
  .screen { position: relative; aspect-ratio: 16 / 9; background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 5% 6%; overflow: hidden; display: flex; flex-direction: column; gap: 10px; }
  .screen h2 { font-size: 22px; line-height: 1.45; margin: 0; }
  .screen ul { margin: 0; padding-left: 1.3em; }
  .screen img { flex: 1; min-height: 0; width: 100%; object-fit: contain; }
  .ph { flex: 1; min-height: 60px; border: 2px dashed #c8c8c8; border-radius: 3px; color: #777; font-size: 13px; padding: 10px; display: flex; align-items: center; justify-content: center; text-align: center; }
  .src { font-size: 11px; color: #777; margin: 0; }
  .no { position: absolute; right: 10px; bottom: 6px; font-size: 11px; color: #999; }
  .side { font-size: 14px; }
  .ghost { font-weight: 700; margin: 0 0 8px; }
  .convey { background: #fff; border: 1px solid #e2e2e2; border-radius: 4px; padding: 6px 10px; margin: 0 0 10px; }
  .convey .label { color: #777; font-size: 12px; margin: 0; }
  .convey ul { margin: 0; padding-left: 1.2em; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 0 0 10px; }
  dt { color: #777; }
  dd { margin: 0; }
  dd.over { color: #b3261e; font-weight: 700; }
  .script { border-left: 3px solid #d6d6d6; padding-left: 10px; }
  .line { margin: 0 0 6px; }
  .mark { display: inline-block; font-size: 11px; border-radius: 3px; padding: 0 5px; margin-right: 6px; vertical-align: 1px; }
  .mark.author { background: #e3f0e6; color: #1e6b34; }
  .mark.prov { background: #fff1d6; color: #8a5a00; }
  .mark.none { background: #fde2e1; color: #b3261e; }
  .memo { color: #777; font-size: 13px; margin: 8px 0 0; }
  @media (max-width: 760px) { .slide { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
<h1>${esc(deck.title ?? "デッキ")}</h1>
<p class="stats">${deck.slides.length}枚 ／ ${time}${limit ? ` ／ 持ち時間 ${limit}秒` : " ／ 持ち時間は event.md に無し"}</p>
<h3>見出しだけで読む</h3>
<ol class="ghost-list">${ghost}</ol>
<h3>1枚ずつ</h3>
${deck.slides.map((s) => card(s, ctx)).join("\n")}
</main>
</body>
</html>
`;
}

export function renderDeck(src, out) {
  const ctx = { srcDir: path.dirname(src), outDir: path.dirname(out), missing: [] };
  const deck = parseDeck(fs.readFileSync(src, "utf8"));
  const html = page(deck, readEvent(src), ctx);
  fs.mkdirSync(ctx.outDir, { recursive: true });
  fs.writeFileSync(out, html, "utf8");
  return { slides: deck.slides.length, missing: ctx.missing };
}

const defaultOut = (src) => path.join(path.dirname(src), "preview", "deck.html");

function hook() {
  const emit = (msg) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
  let file;
  try { file = JSON.parse(fs.readFileSync(0, "utf8"))?.tool_input?.file_path; } catch { return; }
  if (!file) return;
  const src = path.resolve(file);
  if (!HOOK_TARGET.test(rel(src)) || !fs.existsSync(src)) return;
  try {
    const r = renderDeck(src, defaultOut(src));
    if (r.missing.length) emit(`[storyboard] 画像ファイルが見つかりません: ${[...new Set(r.missing)].join(", ")}`);
  } catch (e) {
    emit(`[storyboard] 生成に失敗: ${e.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--hook")) { hook(); return; }
  const positional = [];
  let outPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") { outPath = path.resolve(args[++i] ?? ""); continue; }
    positional.push(args[i]);
  }
  if (positional.length !== 1) { console.error("usage: node scripts/render-deck.mjs <deck.md> [--out <path>]"); process.exit(1); }
  const src = path.resolve(positional[0]);
  if (!fs.existsSync(src)) { console.error(`deck.md が見つかりません: ${src}`); process.exit(1); }
  const out = outPath ?? defaultOut(src);
  const r = renderDeck(src, out);
  console.log(`ストーリーボードを書き出しました: ${rel(out)}（${r.slides}枚）`);
  if (r.missing.length) console.warn(`画像ファイルが見つかりません: ${[...new Set(r.missing)].join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

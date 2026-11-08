/**
 * page.mjs — スライドの箱（位置・大きさ・文字の書式）から HTML を作り、ブラウザで文字の行と溢れを測る共通部品
 *
 * 組む前の一覧（render-slides.mjs: deck.md から）と、組んだ後の点検（check-slides.mjs: Slides の読み出しから）が、
 * 同じ測り方を使う。測るのは、文字の行と溢れ・行数・最小文字・文字と背景のコントラスト・要素の重なり。行間は Slides の 100%（文字の大きさの 1.2 倍）に合わせる。
 * 改行の位置まで Slides と一致するのは、両方で同じ書体が描かれる時（Noto Sans JP など Google Fonts の書体）に限る。
 *
 * pages: [{ index, title, sub, bg, bgImage, boxes: [box], warnings: [string] }]
 * box:   { kind: "text", id, label, x, y, w, h（inch）, inset: {l,r,t,b}, size（pt）, bold, color, align, anchor, spaceBelow, lineSpacing, font, maxLines, paras: [string] }
 *        { kind: "image", id, x, y, w, h, src }   src が null なら「画像が見つからない」
 *        { kind: "todo",  id, x, y, w, h, text, size, color }
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const PX_PER_IN = 96;
export const PX_PER_PT = 96 / 72;
// Slides の行間 100% は、Noto Sans JP で文字の大きさの 1.2 倍（PDF に書き出した行の位置で 36pt → 43.2pt、24pt → 28.8pt）
export const LINE_HEIGHT = 1.2;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const px = (inch) => `${(inch * PX_PER_IN).toFixed(2)}px`;
const JUSTIFY = { TOP: "flex-start", MIDDLE: "center", BOTTOM: "flex-end" };
const ALIGN = { START: "left", CENTER: "center", END: "right", JUSTIFIED: "justify" };

function boxHtml(b) {
  const pos = `left:${px(b.x)};top:${px(b.y)};width:${px(b.w)};height:${px(b.h)}`;
  if (b.kind === "image") {
    return b.src ? `<img class="img" data-id="${esc(b.id)}" style="${pos}" src="${esc(b.src)}" alt="">`
      : `<div class="todo missing" data-id="${esc(b.id)}" style="${pos}">画像が見つかりません<br>${esc(b.path ?? "")}</div>`;
  }
  if (b.kind === "todo") {
    return `<div class="todo" data-id="${esc(b.id)}" data-size="${b.size}" style="${pos};font-size:${(b.size * PX_PER_PT).toFixed(2)}px;color:${b.color}">${esc(b.text)}</div>`;
  }
  const i = b.inset;
  const style = [
    pos, `padding:${px(i.t)} ${px(i.r)} ${px(i.b)} ${px(i.l)}`, `justify-content:${JUSTIFY[b.anchor ?? "TOP"]}`,
    `font-size:${(b.size * PX_PER_PT).toFixed(2)}px`, `font-weight:${b.bold ? 700 : 400}`, `color:${b.color}`,
    `text-align:${ALIGN[b.align ?? "START"]}`, `--gap:${((b.spaceBelow ?? 0) * PX_PER_PT).toFixed(2)}px`,
    ...(b.font ? [`font-family:"${b.font}", sans-serif`] : []),
    `line-height:${(LINE_HEIGHT * (b.lineSpacing ?? 100)) / 100}`,
  ].join(";");
  const paras = b.paras.map((p) => `<p>${esc(p)}</p>`).join("");
  return `<div class="tb" data-id="${esc(b.id)}" data-label="${esc(b.label)}" data-size="${b.size}" data-bold="${b.bold ? 1 : 0}" data-color="${esc(b.color)}"${b.maxLines ? ` data-max-lines="${b.maxLines}"` : ""} style="${style}"><div class="in">${paras}</div></div>`;
}

/** Google Fonts の読み込み。書体ごとに分ける（1つでも無い書体があると、まとめた要求は全体が失敗するため） */
const fontLinks = (fonts) => [...new Set(fonts.filter(Boolean))]
  .map((f) => `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700&display=swap" rel="stylesheet">`).join("\n");

export function pageHtml({ title, summary, pages, page, font, minPt }) {
  const fonts = [font, ...pages.flatMap((p) => p.boxes.map((b) => b.font))];
  const W = page.width * PX_PER_IN;
  const H = page.height * PX_PER_IN;
  const body = pages.map((p) => `<section class="slide" data-index="${p.index}">
  <h3><span class="no">${p.index}</span>${esc(p.title ?? "")}<span class="sub">${esc(p.sub ?? "")}</span></h3>
  <div class="page" data-bg="${esc(p.bg)}"${p.bgImage ? ' data-bg-image="1"' : ""} style="background:${p.bg}">
${p.boxes.map(boxHtml).join("\n")}
  </div>
  <ul class="warn">${(p.warnings ?? []).map((m) => `<li class="static">${esc(m)}</li>`).join("")}</ul>
</section>`).join("\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
${fontLinks(fonts)}
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9ebef; color: #202124; font-family: "Noto Sans JP", sans-serif; }
  header, main { max-width: ${W + 40}px; margin: 0 auto; padding: 0 20px; }
  header { padding-top: 24px; }
  header h1 { font-size: 20px; margin: 0 0 4px; }
  header p { margin: 0; color: #555; font-size: 14px; }
  main { padding-bottom: 80px; }
  .slide { margin: 22px 0 30px; }
  .slide h3 { font-size: 14px; font-weight: 700; margin: 0 0 6px; color: #333; }
  .slide h3 .no { display: inline-block; min-width: 1.8em; color: #888; }
  .slide h3 .sub { margin-left: 10px; font-weight: 400; color: #888; }
  .page { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.18); font-family: "${font}", sans-serif; }
  .tb { position: absolute; display: flex; flex-direction: column; overflow: visible; line-height: ${LINE_HEIGHT}; }
  .tb .in p { margin: 0 0 var(--gap); white-space: pre-wrap; overflow-wrap: anywhere; }
  .tb .in p:last-child { margin-bottom: 0; }
  .tb.over { outline: 2px solid #d93025; outline-offset: -1px; }
  .img { position: absolute; object-fit: contain; }
  .todo { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; padding: 8px; border: 2px dashed currentColor; line-height: ${LINE_HEIGHT}; }
  .todo.missing { color: #b3261e; font-size: 14px; }
  .warn { list-style: none; margin: 6px 0 0; padding: 0; font-size: 13px; }
  .warn li { color: #b3261e; margin: 2px 0; }
  .warn li::before { content: "⚠ "; }
  .warn:empty::after { content: "警告なし"; color: #1e6b34; }
</style>
</head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <p>${esc(summary)} ／ 警告 <span id="warn-count">…</span>件</p>
</header>
<main>
${body}
</main>
<script>
// 文字の行・溢れ・最小文字・コントラスト・重なりを測り、各スライドの下に警告を出す。結果は window.__measure に置く
(async function () {
  await document.fonts.ready;
  const minPt = ${minPt ?? "null"};
  const lineTexts = (p) => {
    const lines = []; let top = null; let cur = "";
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (let i = 0; i < n.length; i++) {
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
        const rect = r.getClientRects()[0];
        if (!rect) { cur += n.data[i]; continue; }
        const t = Math.round(rect.top);
        if (top !== null && t > top + 2) { lines.push(cur); cur = ""; }
        if (top === null || t > top + 2) top = t;
        cur += n.data[i];
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  // WCAG のコントラスト比。大きな文字（24pt 以上、太字は 18.66pt 以上）は 3:1、それ以外は 4.5:1 を下限にする
  const lum = (hex) => { const h = String(hex || "#000000").replace("#", ""); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // 重なりとみなす最小の幅と高さ（px）。0.04in 未満の接触は数えない
  const TOUCH = 4;
  const out = []; let total = 0;
  for (const slide of document.querySelectorAll(".slide")) {
    const ul = slide.querySelector(".warn");
    const page = slide.querySelector(".page");
    const warn = (m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); total++; };
    total += ul.querySelectorAll("li.static").length;
    const items = [];
    for (const tb of slide.querySelectorAll(".tb")) {
      const inner = tb.querySelector(".in");
      const cs = getComputedStyle(tb);
      const room = tb.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const over = inner.scrollHeight - room;
      const lines = [...inner.querySelectorAll("p")].map(lineTexts);
      const n = lines.reduce((a, l) => a + Math.max(1, l.length), 0);
      const label = tb.dataset.label, size = Number(tb.dataset.size), max = Number(tb.dataset.maxLines || 0);
      if (over > 1) { tb.classList.add("over"); warn(label + "が枠から " + (over / 96 * 72).toFixed(0) + "pt 溢れる（" + n + "行）"); }
      if (max && n > max) warn(label + "が " + n + "行（" + max + "行まで）");
      if (minPt && size < minPt) warn(label + "の文字 " + size + "pt が最小 " + minPt + "pt を下回る");
      let contrast = null;
      const need = size >= 24 || (tb.dataset.bold === "1" && size >= 18.66) ? 3 : 4.5;
      if (!page.dataset.bgImage) {
        contrast = Math.round(ratio(tb.dataset.color, page.dataset.bg) * 10) / 10;
        if (contrast < need) warn(label + "の文字と背景のコントラストが " + contrast + ":1（" + need + ":1 以上）");
      }
      items.push({ id: tb.dataset.id, label, size, lines, overflowPt: Math.max(0, Math.round(over / 96 * 72 * 10) / 10), contrast, need });
    }
    for (const t of slide.querySelectorAll(".todo:not(.missing)")) {
      const size = Number(t.dataset.size);
      if (minPt && size < minPt) warn("仮置きの枠の文字 " + size + "pt が最小 " + minPt + "pt を下回る");
      const over = t.scrollHeight - t.clientHeight;
      if (over > 1) warn("仮置きの枠の文字が枠から " + (over / 96 * 72).toFixed(0) + "pt 溢れる");
      items.push({ id: t.dataset.id, label: "仮置きの枠", size, lines: [], overflowPt: Math.max(0, Math.round(over / 96 * 72 * 10) / 10), contrast: null, need: null });
    }
    const parts = [...slide.querySelectorAll(".tb, .img, .todo")].map((e) => ({ id: e.dataset.id, r: e.getBoundingClientRect(), label: e.dataset.label || (e.classList.contains("img") ? "画像" : "仮置きの枠") }));
    const overlaps = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i].r, b = parts[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > TOUCH && h > TOUCH) { overlaps.push([parts[i].id, parts[j].id]); warn(parts[i].label + "と" + parts[j].label + "が重なる"); }
    }
    out.push({ index: Number(slide.dataset.index), items, overlaps, warnings: [...ul.querySelectorAll("li")].map((li) => li.textContent) });
  }
  document.getElementById("warn-count").textContent = total;
  // document.fonts.check は該当する書体が無くても true を返すので、読み込んだ書体の一覧で確かめる
  const fontReady = [...document.fonts].some((f) => f.family.replace(/["']/g, "") === ${JSON.stringify(font)} && f.status === "loaded");
  window.__measure = { fontReady, slides: out };
})();
</script>
</body>
</html>
`;
}

/** playwright-cli の本体（npm のグローバルにある JS）。シェルを通さずに node で呼ぶ（Windows の引数の分割を避ける） */
function cliPath() {
  const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32" }).trim();
  const cli = path.join(root, "@playwright", "cli", "playwright-cli.js");
  if (!fs.existsSync(cli)) throw new Error(`playwright-cli が見つかりません: ${cli}`);
  return cli;
}

/** playwright-cli で HTML を開き、window.__measure を取り出す */
export function measure(htmlPath, session = "slides") {
  const cli = cliPath();
  const run = (...a) => execFileSync(process.execPath, [cli, `-s=${session}`, ...a], { encoding: "utf8" });
  const tmp = path.join(path.dirname(path.resolve(htmlPath)), `.measure-${process.pid}.json`);
  run("open", path.resolve(htmlPath));
  try {
    for (let i = 0; i < 50; i++) {
      // eval の戻り値は --filename のファイルに、JSON の文字列として書かれる（二重に JSON）
      run("eval", "() => window.__measure ? JSON.stringify(window.__measure) : ''", `--filename=${tmp}`);
      const value = fs.existsSync(tmp) ? JSON.parse(fs.readFileSync(tmp, "utf8")) : "";
      if (value) return JSON.parse(value);
      execFileSync(process.execPath, ["-e", "setTimeout(()=>{},200)"]);
    }
    throw new Error("測定の結果が取れませんでした（window.__measure が空）");
  } finally {
    run("close");
    fs.rmSync(tmp, { force: true });
    // playwright-cli がカレントに作る作業フォルダ（スナップショット）を片付ける
    fs.rmSync(path.join(process.cwd(), ".playwright-cli"), { recursive: true, force: true });
  }
}

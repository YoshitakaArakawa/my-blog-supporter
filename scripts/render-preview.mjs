#!/usr/bin/env node
/**
 * render-preview.mjs — 記事ドラフト（draft.md）を、公開時の見た目に近い HTML プレビューへ変換する
 *
 * 正本は draft.md。preview/index.html は生成物であり、手で編集しない（次の生成で上書きされる）。
 * 変換は決定的に行い、draft.md は読むだけで書き換えない。
 *
 * 使い方:
 *   node scripts/render-preview.mjs <draft.md> [--out <path>]   プレビューを書き出す
 *   node scripts/render-preview.mjs --hook                      PostToolUse hook（stdin に hook JSON）
 *   --out 省略時: draft.md と同じディレクトリの preview/index.html
 *
 * hook モードは output/ 直下の記事フォルダの draft.md を書いた時だけ生成し、成功時は何も出力しない
 * （Edit のたびにコンテキストを消費しないため）。失敗・画像欠落の時だけ additionalContext で返す。
 *
 * 依存: Node 標準モジュールのみ（fs / path / url）。npm install 不要。
 *
 * 対応する Markdown（記事ドラフトで使う範囲に絞った簡易変換）:
 *   見出し / 段落 / 箇条書き・番号付きリスト（1階層＋継続行）/ 引用 / 区切り線 / コードフェンス
 *   インライン: **太字** / `コード` / [リンク](URL) / ![画像](パス)
 *   表・入れ子リスト・HTML の直書きは対象外（エスケープされた文字列として段落に出る）
 *
 * 記事固有の記法:
 *   ℹ️ を含む引用ブロック             著者向けの引き継ぎメモ。プレビューから落とす
 *   ✍️ を含む引用ブロック             著者が一次情報で埋める箇所。目印付きで残す
 *   <!-- 画像: 説明 -->               未作図のプレースホルダー。説明を点線枠で表示する
 *   ![alt](images/x.png "キャプション")  作図済みの図（1行単独）。figure に変換する。
 *                                     キャプションは title、無ければ alt。パスは draft.md からの相対
 *   その他の HTML コメント             落とす
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

// hook の対象。作業層の AI 版ドラフトだけにする。draft_user.md・draft_pre-*.md は著者版・途中版で、
// published/ は公開層なので生成物を置かない
const HOOK_TARGET = /^output\/[^/]+\/draft\.md$/;
// プレースホルダーに出す説明の上限。長い作図指示が枠を埋め尽くさないため
const PLACEHOLDER_MAX = 120;
// URL・スキーム付き・ルート絶対・アンカーは付け替えない
const NON_LOCAL = /^([a-z][a-z0-9+.-]*:|\/|#)/i;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// ---------- パス ----------

/** draft.md からの相対パスを、出力 HTML からの相対パスに付け替える */
function relink(src, ctx) {
  if (NON_LOCAL.test(src)) return src;
  const abs = path.resolve(ctx.srcDir, src);
  if (!fs.existsSync(abs)) ctx.missing.push(src);
  return path.relative(ctx.outDir, abs).replace(/\\/g, "/");
}

// ---------- インライン ----------

function inline(s, ctx) {
  const tokens = [];
  const stash = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/`([^`]+)`/g, (_, c) => stash(`<code>${esc(c)}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => stash(`<img src="${esc(relink(src, ctx))}" alt="${esc(alt)}">`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => stash(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`));
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 退避した部品を戻す。リンク文字列の中に退避したコードがある場合に備えて、残らなくなるまで繰り返す
  while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)] ?? "");
  return s;
}

// ---------- ブロック ----------

function commentBlock(text, ctx) {
  const m = text.match(/^\s*<!--\s*画像[:：]\s*([\s\S]*?)\s*-->/);
  if (!m) return [];
  ctx.placeholders += 1;
  const desc = m[1].replace(/\s+/g, " ");
  const shown = desc.length > PLACEHOLDER_MAX ? `${desc.slice(0, PLACEHOLDER_MAX)}…` : desc;
  return [`<div class="placeholder"><span class="ph-label">画像（未作図）</span>${esc(shown)}</div>`];
}

function figure(alt, src, title, ctx) {
  ctx.figures += 1;
  const caption = title ?? alt;
  const out = ["<figure>", `<img src="${esc(relink(src, ctx))}" alt="${esc(alt)}">`];
  if (caption) out.push(`<figcaption>${inline(caption, ctx)}</figcaption>`);
  out.push("</figure>");
  return out;
}

function toBody(text, ctx) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = null; // { tag, items: string[][] }
  let quote = null; // string[]（> を外した行）
  let fence = null; // string[]（コードフェンス内の行）
  let comment = null; // string[]（複数行の HTML コメント）

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(""), ctx)}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list.tag}>`, ...list.items.map((it) => `<li>${inline(it.join(""), ctx)}</li>`), `</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote) return;
    if (!quote.some((l) => l.includes("ℹ️"))) {
      out.push(quote.some((l) => l.includes("✍️")) ? '<blockquote class="todo">' : "<blockquote>");
      for (const p of quote.join("\n").split(/\n{2,}/)) if (p.trim()) out.push(`<p>${inline(p.replace(/\n/g, ""), ctx)}</p>`);
      out.push("</blockquote>");
    }
    quote = null;
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  const pushFence = () => out.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`);

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (fence) {
      if (/^\s*```/.test(line)) { pushFence(); fence = null; } else fence.push(raw);
      continue;
    }
    if (comment) {
      comment.push(line);
      if (line.includes("-->")) { out.push(...commentBlock(comment.join("\n"), ctx)); comment = null; }
      continue;
    }
    if (!line.trim()) { flushAll(); continue; }
    if (/^\s*```/.test(line)) { flushAll(); fence = []; continue; }
    if (/^\s*<!--/.test(line)) {
      flushAll();
      if (line.includes("-->")) out.push(...commentBlock(line, ctx)); else comment = [line];
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushAll(); out.push("<hr>"); continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushAll(); out.push(`<h${h[1].length}>${inline(h[2], ctx)}</h${h[1].length}>`); continue; }

    if (/^\s*>/.test(line)) {
      flushPara(); flushList();
      (quote ??= []).push(line.replace(/^\s*>\s?/, ""));
      continue;
    }
    flushQuote();

    const img = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
    if (img) { flushAll(); out.push(...figure(img[1], img[2], img[3], ctx)); continue; }

    const li = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      const tag = li[1] ? "ul" : "ol";
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push([li[2]]);
      continue;
    }
    // リスト項目の継続行
    if (list && /^\s{2,}\S/.test(line)) { list.items.at(-1).push(line.trim()); continue; }
    flushList();

    para.push(line.trim());
  }
  // 閉じ忘れたコメント・フェンスは末尾までをその中身とみなす
  if (comment) out.push(...commentBlock(`${comment.join("\n")}-->`, ctx));
  if (fence) pushFence();
  flushAll();
  return out.join("\n");
}

// ---------- ページ ----------

function page(text, ctx) {
  const body = toBody(text, ctx);
  const title = (text.match(/^#\s+(.*)$/m) || [, "プレビュー"])[1].trim();
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- 生成物: draft.md から scripts/render-preview.mjs が生成する。直しは draft.md に入れ、このファイルは編集しない -->
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #ffffff;
    color: #202124;
    font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    font-size: 17px;
    line-height: 1.9;
    -webkit-font-smoothing: antialiased;
  }
  .article { max-width: 720px; margin: 0 auto; padding: 64px 20px 120px; }
  h1 {
    font-size: 34px; line-height: 1.45; font-weight: 700;
    margin: 0 0 40px; letter-spacing: .01em;
  }
  h2 {
    font-size: 25px; line-height: 1.5; font-weight: 700;
    margin: 4.2em 0 .9em; letter-spacing: .01em;
  }
  h3 {
    font-size: 18px; line-height: 1.6; font-weight: 600;
    color: #4a4a4a; margin: 3em 0 .8em;
  }
  p { margin: 0 0 1.55em; }
  a { color: #1b6ec2; text-decoration: underline; text-underline-offset: 2px; }
  a:hover { color: #12508e; }
  ul, ol { margin: 0 0 1.55em; padding-left: 1.6em; }
  li { margin-bottom: .55em; }
  hr { border: 0; border-top: 1px solid #e3e3e3; margin: 3.4em 0; }
  blockquote {
    margin: 0 0 1.7em; padding: 14px 20px;
    border-left: 3px solid #d6d6d6; background: #fafafa; color: #4a4a4a;
  }
  blockquote p:last-child { margin-bottom: 0; }
  blockquote.todo { border-left-color: #e0a040; background: #fff8ea; }
  code {
    font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
    font-size: .9em; background: #f2f2f2; padding: .12em .35em; border-radius: 3px;
  }
  pre { margin: 0 0 1.55em; padding: 14px 18px; background: #f6f6f6; overflow-x: auto; line-height: 1.6; }
  pre code { background: none; padding: 0; font-size: 14px; }
  figure { margin: 2.4em 0; }
  figure img { display: block; width: 100%; height: auto; }
  p img { max-width: 100%; height: auto; }
  figcaption { margin-top: .7em; font-size: 14px; line-height: 1.7; color: #6b6b6b; }
  .placeholder {
    margin: 2.4em 0; padding: 40px 20px;
    border: 2px dashed #c8c8c8; border-radius: 2px;
    text-align: center; font-size: 14px; line-height: 1.7; color: #8a8a8a; background: #fbfbfb;
  }
  .ph-label { display: block; margin-bottom: .4em; font-weight: 600; color: #6b6b6b; }
</style>
</head>
<body>
<article class="article">
${body}
</article>
</body>
</html>
`;
}

function renderFile(src, out) {
  const ctx = { srcDir: path.dirname(src), outDir: path.dirname(out), figures: 0, placeholders: 0, missing: [] };
  const html = page(fs.readFileSync(src, "utf8"), ctx);
  fs.mkdirSync(ctx.outDir, { recursive: true });
  fs.writeFileSync(out, html, "utf8");
  return ctx;
}

const defaultOut = (src) => path.join(path.dirname(src), "preview", "index.html");

// ---------- 入口 ----------

function hook() {
  const emit = (msg) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
  let file;
  try { file = JSON.parse(fs.readFileSync(0, "utf8"))?.tool_input?.file_path; } catch { return; }
  if (!file) return;
  const src = path.resolve(file);
  if (!HOOK_TARGET.test(rel(src)) || !fs.existsSync(src)) return;
  try {
    const r = renderFile(src, defaultOut(src));
    if (r.missing.length) emit(`[preview] 画像ファイルが見つかりません: ${[...new Set(r.missing)].join(", ")}`);
  } catch (e) {
    emit(`[preview] 生成に失敗: ${e.message}`);
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
  if (positional.length !== 1) {
    console.error("usage: node scripts/render-preview.mjs <draft.md> [--out <path>]");
    process.exit(1);
  }
  const src = path.resolve(positional[0]);
  if (!fs.existsSync(src)) { console.error(`draft が見つかりません: ${src}`); process.exit(1); }

  const out = outPath ?? defaultOut(src);
  const r = renderFile(src, out);
  console.log(`プレビューを書き出しました: ${rel(out)}（図 ${r.figures} / 未作図 ${r.placeholders}）`);
  if (r.missing.length) console.warn(`画像ファイルが見つかりません: ${[...new Set(r.missing)].join(", ")}`);
}

main();

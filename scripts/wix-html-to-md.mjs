#!/usr/bin/env node
/**
 * wix-html-to-md.mjs — Wix ブログ本文の HTML を Markdown に変換する
 *
 * compare-drafts が公開記事（著者の最終形）を取得する時に使う。WebFetch は SPA の本文を
 * 要約したり見出しを誤生成するため、実ブラウザで `[data-hook='post-description']` の
 * innerHTML を取り、このスクリプトで見出し・段落・リスト・引用・リンク・画像を保った
 * Markdown にする。
 *
 * 使い方:
 *   node scripts/wix-html-to-md.mjs <post.html> [--source <URL>] [--title <タイトル>] > published.md
 *   （<post.html> を "-" にすると stdin から読む。playwright-cli eval の出力が JSON 文字列でも可）
 *
 * 依存: node-html-parser（npm install 済みであること）
 */
import fs from "node:fs";
import { parse } from "node-html-parser";

function readInput(file) {
  let raw = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
  raw = raw.trim();
  // playwright-cli eval の出力は「### Result」行の直後に JSON 文字列 1 行、その後にログ（### Ran Playwright code / ### Page / ### Events ...）が続く。
  // JSON 文字列の行だけを取り出してデコードする
  const m = raw.match(/^### Result\s*\n([\s\S]*?)(?:\n### |$)/);
  if (m) raw = m[1].trim();
  if (raw.startsWith('"')) {
    try { raw = JSON.parse(raw); } catch { /* 生 HTML として扱う */ }
  }
  // それ以外のログ行が前置きされている場合、最初のタグから読む
  const i = raw.indexOf("<");
  return i > 0 ? raw.slice(i) : raw;
}

const BLOCK = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "hr", "figure", "figcaption", "table", "tr"]);

function inline(node) {
  if (node.nodeType === 3) return node.rawText.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName?.toLowerCase();
  const inner = () => node.childNodes.map(inline).join("");
  switch (tag) {
    case "br": return "\n";
    case "strong": case "b": { const t = inner().trim(); return t ? `**${t}**` : ""; }
    case "em": case "i": { const t = inner().trim(); return t ? `*${t}*` : ""; }
    case "code": return `\`${inner()}\``;
    case "a": {
      const href = node.getAttribute("href") || "";
      const t = inner().trim();
      if (!t) return "";
      // Wix の内部リンク（アンカー等）は本文の一部として扱う
      return href && !href.startsWith("#") ? `[${t}](${href})` : t;
    }
    case "img": {
      const alt = (node.getAttribute("alt") || "").trim();
      return `\n<!-- 画像: ${alt} -->\n`;
    }
    case "span": case "u": case "s": case "small": case "sup": case "sub": case "mark": return inner();
    default: return inner();
  }
}

function block(node, out, ctx) {
  if (node.nodeType === 3) { const t = inline(node).trim(); if (t) { out.push(t); out.push(""); } return; }
  if (node.nodeType !== 1) return;
  const tag = node.tagName?.toLowerCase();
  const kids = () => node.childNodes.forEach((c) => block(c, out, ctx));
  // Wix の区切り線ウィジェットは <svg><line/></svg> で描かれる。hr として扱う
  if (tag === "svg") { if (node.querySelector("line")) { out.push(""); out.push("---"); out.push(""); } return; }
  switch (tag) {
    case "h1": out.push(""); out.push(`# ${inline(node).trim()}`); out.push(""); return;
    case "h2": out.push(""); out.push(`## ${inline(node).trim()}`); out.push(""); return;
    case "h3": out.push(""); out.push(`### ${inline(node).trim()}`); out.push(""); return;
    case "h4": case "h5": case "h6": out.push(""); out.push(`### ${inline(node).trim()}`); out.push(""); return;
    case "p": {
      const t = inline(node).replace(/\n{2,}/g, "\n").trim();
      out.push(t); out.push(""); return;
    }
    case "hr": out.push(""); out.push("---"); out.push(""); return;
    case "ul": case "ol": {
      const ordered = tag === "ol";
      let n = 1;
      for (const li of node.childNodes) {
        if (li.nodeType !== 1 || li.tagName?.toLowerCase() !== "li") continue;
        const nested = [];
        const own = [];
        for (const c of li.childNodes) {
          const ct = c.nodeType === 1 ? c.tagName?.toLowerCase() : "";
          if (ct === "ul" || ct === "ol") nested.push(c); else own.push(c);
        }
        const text = own.map(inline).join("").replace(/\s*\n\s*/g, " ").trim();
        const indent = "  ".repeat(ctx.depth);
        out.push(`${indent}${ordered ? `${n}.` : "-"} ${text}`);
        n++;
        for (const sub of nested) block(sub, out, { depth: ctx.depth + 1 });
      }
      if (ctx.depth === 0) out.push("");
      return;
    }
    case "blockquote": {
      const tmp = [];
      node.childNodes.forEach((c) => block(c, tmp, ctx));
      out.push(...tmp.join("\n").trim().split("\n").map((l) => `> ${l}`.replace(/\s+$/, "")));
      out.push("");
      return;
    }
    case "pre": {
      const t = node.innerHTML.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\r/g, "").replace(/\n+$/, "");
      out.push("```"); out.push(t); out.push("```"); out.push(""); return;
    }
    case "figure": { kids(); return; }
    case "figcaption": { const t = inline(node).trim(); if (t) { out.push(t); out.push(""); } return; }
    case "img": { out.push(inline(node).trim()); out.push(""); return; }
    case "table": {
      const rows = node.querySelectorAll("tr").map((tr) => tr.childNodes.filter((c) => c.nodeType === 1).map((c) => inline(c).trim()));
      if (!rows.length) return;
      out.push(`| ${rows[0].join(" | ")} |`);
      out.push(`|${rows[0].map(() => "---").join("|")}|`);
      for (const r of rows.slice(1)) out.push(`| ${r.join(" | ")} |`);
      out.push("");
      return;
    }
    default: {
      // ルート・div/section 等の箱、またはブロック要素を子に持つ要素は中身だけを辿る。
      // ブロック要素を含まないインライン要素は 1 段落として吐く
      const hasBlockChild = node.childNodes.some((c) => c.nodeType === 1 && BLOCK.has(c.tagName?.toLowerCase()));
      if (!tag || BLOCK.has(tag) || tag === "body" || tag === "html" || hasBlockChild) { kids(); return; }
      const t = inline(node).trim();
      if (t) { out.push(t); out.push(""); }
    }
  }
}

function toMarkdown(html) {
  const root = parse(html, { blockTextElements: { script: false, style: false, pre: true } });
  root.querySelectorAll("script, style, noscript").forEach((n) => n.remove());
  const out = [];
  block(root, out, { depth: 0 });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--")) || "-";
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ""; };
  const source = opt("--source");
  const title = opt("--title");
  const md = toMarkdown(readInput(file));
  const today = new Date().toISOString().slice(0, 10);
  const head = [`<!-- source: ${source || "(unknown)"} / fetched: ${today} / method: playwright-cli + wix-html-to-md -->`, "<!-- 公開記事の取得スナップショット（compare-drafts の著者側比較対象）。毎回上書き。 -->", ""];
  if (title) head.push(`# ${title}`, "");
  process.stdout.write(head.join("\n") + md);
}

main();

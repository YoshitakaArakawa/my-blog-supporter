#!/usr/bin/env node
/**
 * check-slides.mjs — 組んだ Google スライドを、読み出し（read_presentation の結果）から機械で点検する
 *
 * 見ること:
 *   - 継承（スライド → レイアウト → マスター）まで解決した文字の大きさが、event.md の最小文字を下回らないか
 *   - 文字が枠から溢れないか、文字と背景のコントラスト、要素の重なり（HTML の一覧と同じ測り方。行間は Slides の 100% = 1.2 倍）
 *   - 空のプレースホルダ、プレースホルダの外の文字箱、ページの外にはみ出した要素
 *   - 仮置きの枠（objectId が _todo で終わる図形か、代替テキストが「仮置きの枠」の図形）は、著者が画像を入れる場所として数える
 *
 * 使い方:
 *   node check-slides.mjs --read <読み出し.json> [--deck <deck.md>（event.md の最小文字を読む）| --min 18] [--out <html>] [--json <結果.json>] [--no-measure]
 *
 * --read はマスクなしの read_presentation の結果（大きいので app がファイルに保存する。写し直さずにそのパスを渡す）。
 * 結果は stdout に要約、--json に詳細を書く。--out の HTML（既定は deck.md の隣の preview/check.html）は、
 * Slides の文字を同じ寸法で並べた点検用の一覧で、溢れはこの一覧をブラウザで測って出す。
 * 終了コードは、問題があれば 1、無ければ 0。
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, isMain, deckLib, minFontPt, AUTO_PLACEHOLDERS, EMU_PER_IN } from "./lib/template.mjs";
import { pageHtml, measure } from "./lib/page.mjs";

// Google スライドのテキストボックスの既定の内側の余白（左右 0.1in・上下 0.05in）。API からは読めないので既定の値で測る
const INSET = { l: 0.1, r: 0.1, t: 0.05, b: 0.05 };
const isTodo = (el) => el.objectId.endsWith("_todo") || el.description === "仮置きの枠" || el.title === "仮置きの枠";

/** テーマの色（DARK1 など）を rgb に解く表。マスターの colorScheme から作る */
function themeTable(pages) {
  const t = new Map();
  for (const p of pages) for (const c of p?.pageProperties?.colorScheme?.colors ?? []) if (!t.has(`${p.objectId}:${c.type}`)) t.set(`${p.objectId}:${c.type}`, c.color);
  return t;
}

/** 要素の実際の位置と大きさ（inch）。size × scale + translate */
function geom(el) {
  if (!el?.size || !el?.transform) return null;
  const t = el.transform;
  const w = (el.size.width.magnitude * (t.scaleX ?? 1)) / EMU_PER_IN;
  const h = (el.size.height.magnitude * (t.scaleY ?? 1)) / EMU_PER_IN;
  return { x: (t.translateX ?? 0) / EMU_PER_IN, y: (t.translateY ?? 0) / EMU_PER_IN, w, h };
}

/** テキストを段落に分け、段落ごとの文字と、見える文字のある最初の部分の書式と、段落の書式を返す */
function paragraphs(text) {
  const out = [];
  let cur = null;
  for (const e of text?.textElements ?? []) {
    if (e.paragraphMarker) { cur = { text: "", runStyle: null, pstyle: e.paragraphMarker.style ?? {} }; out.push(cur); continue; }
    const part = e.textRun ?? e.autoText;
    if (!part) continue;
    if (!cur) { cur = { text: "", runStyle: null, pstyle: {} }; out.push(cur); }
    cur.text += part.content ?? "";
    // 改行だけの部分（段落の終わり）には既定の大きさが付くので、見える文字のある部分だけを数える
    const visible = (part.content ?? "").trim();
    if (!cur.runStyle && visible) cur.runStyle = part.style ?? {};
    if (visible && part.style?.fontSize?.magnitude != null) cur.sizes = [...(cur.sizes ?? []), part.style.fontSize.magnitude];
  }
  return out.map((p) => ({ ...p, text: p.text.replace(/\n$/, "") }));
}

export function checkDeck(read, { minPt = null } = {}) {
  const byId = new Map();
  for (const page of [...(read.masters ?? []), ...(read.layouts ?? []), ...(read.slides ?? [])]) {
    for (const el of page.pageElements ?? []) byId.set(el.objectId, el);
  }
  const pageById = new Map([...(read.masters ?? []), ...(read.layouts ?? [])].map((p) => [p.objectId, p]));
  const themes = themeTable(read.masters ?? []);
  const chain = (el) => { const out = []; let cur = el; while (cur) { out.push(cur); const pid = cur.shape?.placeholder?.parentObjectId; cur = pid ? byId.get(pid) : null; } return out; };
  // 継承をたどって、最初に見つかる値を返す
  const inherit = (els, get) => { for (const e of els) { const v = get(e); if (v != null) return v; } return null; };
  const firstRun = (e) => paragraphs(e.shape?.text).find((p) => p.runStyle)?.runStyle ?? (e.shape?.text?.textElements ?? []).find((x) => x.textRun)?.textRun?.style;
  const firstPara = (e) => (e.shape?.text?.textElements ?? []).find((x) => x.paragraphMarker)?.paragraphMarker?.style;
  const pw = read.pageSize.width.magnitude / EMU_PER_IN;
  const ph = read.pageSize.height.magnitude / EMU_PER_IN;

  const slides = (read.slides ?? []).map((s, k) => {
    const layout = pageById.get(s.slideProperties?.layoutObjectId);
    const masterId = s.slideProperties?.masterObjectId ?? layout?.layoutProperties?.masterObjectId;
    const master = pageById.get(masterId);
    const hex = (c) => {
      const o = c?.opaqueColor ?? c;
      const v = o?.rgbColor ?? (o?.themeColor ? themes.get(`${masterId}:${o.themeColor}`) : null) ?? c?.color?.rgbColor;
      if (!v) return null;
      const h = (x) => Math.round((x ?? 0) * 255).toString(16).padStart(2, "0");
      return `#${h(v.red)}${h(v.green)}${h(v.blue)}`;
    };
    const bgFill = [s, layout, master].map((p) => p?.pageProperties?.pageBackgroundFill).find((f) => f?.solidFill || f?.stretchedPictureFill);
    const findings = [];
    const boxes = [];
    const texts = [];
    for (const el of s.pageElements ?? []) {
      const els = chain(el);
      const g = geom(el) ?? inherit(els.slice(1), geom);
      if (g && (g.x < -0.01 || g.y < -0.01 || g.x + g.w > pw + 0.01 || g.y + g.h > ph + 0.01)) findings.push({ kind: "ページの外", id: el.objectId });
      if (el.image) { if (g) boxes.push({ kind: "image", id: el.objectId, ...g, src: el.image.contentUrl ?? null }); continue; }
      if (!el.shape) continue;
      const phType = el.shape.placeholder?.type;
      if (AUTO_PLACEHOLDERS.has(phType)) continue;
      const isPh = Boolean(phType);
      const paras = paragraphs(el.shape.text);
      const hasText = paras.some((p) => p.text.trim());
      if (isPh && !hasText) { findings.push({ kind: "空のプレースホルダ", id: el.objectId, type: phType }); continue; }
      if (!hasText) continue;
      const todo = isTodo(el);
      if (!isPh && !todo) findings.push({ kind: "プレースホルダの外の文字箱", id: el.objectId, text: paras.map((p) => p.text).join(" ").slice(0, 40) });
      const run0 = paras.find((p) => p.runStyle)?.runStyle ?? {};
      const size = run0.fontSize?.magnitude ?? inherit(els.slice(1), (e) => firstRun(e)?.fontSize?.magnitude) ?? 18;
      const sizes = paras.flatMap((p) => (p.sizes?.length ? p.sizes : [size]));
      const minSize = Math.min(size, ...sizes);
      const bold = run0.bold ?? inherit(els.slice(1), (e) => firstRun(e)?.bold) ?? false;
      const font = run0.fontFamily ?? inherit(els.slice(1), (e) => firstRun(e)?.fontFamily) ?? null;
      const color = hex(run0.foregroundColor) ?? inherit(els.slice(1), (e) => hex(firstRun(e)?.foregroundColor)) ?? "#000000";
      const p0 = paras[0]?.pstyle ?? {};
      const align = p0.alignment ?? inherit(els.slice(1), (e) => firstPara(e)?.alignment) ?? "START";
      const spaceBelow = p0.spaceBelow?.magnitude ?? inherit(els.slice(1), (e) => firstPara(e)?.spaceBelow?.magnitude) ?? 0;
      const lineSpacing = p0.lineSpacing ?? inherit(els.slice(1), (e) => firstPara(e)?.lineSpacing) ?? 100;
      const anchor = el.shape.shapeProperties?.contentAlignment ?? inherit(els.slice(1), (e) => e.shape?.shapeProperties?.contentAlignment) ?? "TOP";
      const label = todo ? "仮置きの枠" : isPh ? { TITLE: "見出し", CENTERED_TITLE: "見出し", SUBTITLE: "副題", BODY: "本文" }[phType] ?? phType : "文字箱";
      texts.push({ id: el.objectId, label, placeholder: isPh ? el.shape.placeholder : null, size: minSize, font, text: paras.map((p) => p.text) });
      if (minPt && minSize < minPt) findings.push({ kind: "最小文字の違反", id: el.objectId, size: minSize, min: minPt });
      if (g) boxes.push({
        kind: "text", id: el.objectId, label, ...g, inset: INSET, size: minSize, bold, color, font,
        align, anchor, spaceBelow, lineSpacing, paras: paras.map((p) => p.text),
      });
    }
    const todos = (s.pageElements ?? []).filter(isTodo).map((e) => e.objectId);
    return {
      index: k + 1, slideId: s.objectId, layout: layout?.layoutProperties?.name ?? null,
      bg: bgFill?.solidFill ? hex(bgFill.solidFill.color) ?? "#ffffff" : bgFill?.stretchedPictureFill ? "#808080" : "#ffffff",
      bgImage: Boolean(bgFill?.stretchedPictureFill),
      boxes, texts, findings, todos,
    };
  });
  return { slides, page: { width: pw, height: ph } };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (!opt("--read")) { console.error("usage: node check-slides.mjs --read <read.json> [--deck <deck.md> | --min 18] [--out <html>] [--json <out.json>] [--no-measure]"); process.exit(2); }
  const read = readJson(opt("--read"));
  const minPt = opt("--min") ? Number(opt("--min")) : opt("--deck") ? minFontPt(deckLib.readEvent(path.resolve(opt("--deck")))) : null;
  const r = checkDeck(read, { minPt });
  const out = path.resolve(opt("--out") ?? path.join(path.dirname(path.resolve(opt("--deck") ?? opt("--read"))), "preview", "check.html"));
  const pages = r.slides.map((s) => ({ index: s.index, title: s.texts[0]?.text?.join(" ") ?? "", sub: s.layout ?? "", bg: s.bg, bgImage: s.bgImage, boxes: s.boxes, warnings: s.findings.map((f) => `${f.kind}: ${f.id}${f.size ? `（${f.size}pt）` : ""}`) }));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const font = r.slides.flatMap((s) => s.texts.map((t) => t.font)).find(Boolean) ?? "Noto Sans JP";
  fs.writeFileSync(out, pageHtml({ title: `点検: ${read.title ?? ""}`, summary: `${r.slides.length}枚 ／ 最小文字 ${minPt ?? "指定なし"}pt`, pages, page: r.page, font, minPt }), "utf8");
  const m = args.includes("--no-measure") ? null : measure(out, "check");
  let problems = 0;
  for (const s of r.slides) {
    const ms = m?.slides.find((x) => x.index === s.index);
    const over = (ms?.items ?? []).filter((i) => i.overflowPt > 1);
    const low = (ms?.items ?? []).filter((i) => i.contrast != null && i.contrast < i.need);
    s.overflow = over.map((i) => ({ id: i.id, overflowPt: i.overflowPt, lines: i.lines.flat().length }));
    s.lowContrast = low.map((i) => ({ id: i.id, contrast: i.contrast, need: i.need }));
    s.overlaps = ms?.overlaps ?? [];
    const issues = [
      ...s.findings.map((f) => `${f.kind} ${f.id}${f.size ? ` ${f.size}pt` : ""}${f.text ? `「${f.text}」` : ""}`),
      ...over.map((i) => `溢れ ${i.id} ${i.overflowPt}pt（${i.lines.flat().length}行）`),
      ...low.map((i) => `コントラスト ${i.id} ${i.contrast}:1（${i.need}:1 以上）`),
      ...s.overlaps.map(([a, b]) => `重なり ${a} と ${b}`),
    ];
    problems += issues.length;
    const sizes = s.texts.filter((t) => t.label !== "仮置きの枠").map((t) => t.size);
    console.log(`s${s.index} ${s.layout ?? "?"} 最小 ${sizes.length ? Math.min(...sizes) : "-"}pt${s.todos.length ? ` 仮置きの枠 ${s.todos.length}` : ""}${issues.length ? ` ⚠ ${issues.join(" / ")}` : " OK"}`);
  }
  console.log(problems ? `問題 ${problems}件（点検の一覧: ${out}）` : `問題なし（点検の一覧: ${out}）`);
  if (m && !m.fontReady) console.log(`! 書体「${font}」をブラウザで読めませんでした。溢れの測定は代わりの書体による`);
  if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify(r, null, 1));
  process.exitCode = problems ? 1 : 0;
}

if (isMain(import.meta.url)) main();

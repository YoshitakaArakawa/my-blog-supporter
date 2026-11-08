#!/usr/bin/env node
/**
 * check-slides.mjs — 組んだ Google スライドを、読み出し（read_presentation の結果）から機械で点検する
 *
 * 見ること:
 *   - 継承（スライド → レイアウト → マスター）まで解決した文字の大きさが、最小文字を下回らないか
 *   - 文字の溢れ・文字と背景のコントラスト・要素の重なり（HTML の一覧と同じ測り方。行間は Slides の 100% = 1.2 倍）
 *   - 空のプレースホルダ、プレースホルダの外の文字箱、ページの外にはみ出した要素
 *   - 仮置きの枠（著者が画像を入れる場所）の数
 *
 * 使い方:
 *   node check-slides.mjs --read <読み出し.json> [--deck <deck.md>（event.md の最小文字を読む）| --min 18] [--out <html>] [--json <結果.json>] [--no-measure]
 *
 * --read はマスクなしの read_presentation の結果（大きいので app がファイルに保存する。写し直さずにそのパスを渡す）。
 * 最小文字は --min、無ければ event.md の `最小文字:`、それも無ければ 18pt。
 * 結果は stdout に要約、--json に詳細を書く。--out の HTML（既定は deck.md の隣の preview/check.html）は、
 * Slides の文字を同じ寸法で並べた点検用の一覧で、溢れ・コントラスト・重なりはこの一覧をブラウザで測って出す。
 * --no-measure は測らない（その3つは「未測定」）。終了コードは、問題があれば 1、無ければ 0。
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, isMain, deckLib, minFont, AUTO_PLACEHOLDERS } from "./lib/template.mjs";
import { resolver, geom, isTodo } from "./lib/read.mjs";
import { pageHtml, measure } from "./lib/page.mjs";

// Google スライドのテキストボックスの既定の内側の余白（左右 0.1in・上下 0.05in）。API からは読めないので既定の値で測る
const INSET = { l: 0.1, r: 0.1, t: 0.05, b: 0.05 };
const LABEL = { TITLE: "見出し", CENTERED_TITLE: "見出し", SUBTITLE: "副題", BODY: "本文" };

/** テキストを段落に分け、段落ごとの文字と、見える文字のある部分の大きさを返す */
function paragraphs(text) {
  const out = [];
  let cur = null;
  for (const e of text?.textElements ?? []) {
    if (e.paragraphMarker) { cur = { text: "", runStyle: null, pstyle: e.paragraphMarker.style ?? {}, sizes: [] }; out.push(cur); continue; }
    const part = e.textRun ?? e.autoText;
    if (!part) continue;
    if (!cur) { cur = { text: "", runStyle: null, pstyle: {}, sizes: [] }; out.push(cur); }
    cur.text += part.content ?? "";
    // 改行だけの部分（段落の終わり）には既定の大きさが付くので、見える文字のある部分だけを数える
    if (!(part.content ?? "").trim()) continue;
    if (!cur.runStyle) cur.runStyle = part.style ?? {};
    if (part.style?.fontSize?.magnitude != null) cur.sizes.push(part.style.fontSize.magnitude);
  }
  return out.map((p) => ({ ...p, text: p.text.replace(/\n$/, "") }));
}

export function checkDeck(read, { minPt = null } = {}) {
  const R = resolver(read);
  const pageById = new Map([...(read.masters ?? []), ...(read.layouts ?? [])].map((p) => [p.objectId, p]));
  const pw = read.pageSize.width.magnitude / 914400;
  const ph = read.pageSize.height.magnitude / 914400;
  const slides = (read.slides ?? []).map((s, k) => {
    const layout = pageById.get(s.slideProperties?.layoutObjectId);
    const masterId = s.slideProperties?.masterObjectId ?? layout?.layoutProperties?.masterObjectId;
    const bgFill = [s, layout, pageById.get(masterId)].map((p) => p?.pageProperties?.pageBackgroundFill).find((f) => f?.solidFill || f?.stretchedPictureFill);
    const findings = [];
    const boxes = [];
    const texts = [];
    for (const el of s.pageElements ?? []) {
      const els = R.chain(el);
      const g = geom(el) ?? R.first(els.slice(1), geom);
      if (g && (g.x < -0.01 || g.y < -0.01 || g.x + g.w > pw + 0.01 || g.y + g.h > ph + 0.01)) findings.push({ kind: "ページの外", id: el.objectId });
      if (el.image) { if (g) boxes.push({ kind: "image", id: el.objectId, ...g, src: el.image.contentUrl ?? null }); continue; }
      if (!el.shape) continue;
      const phType = el.shape.placeholder?.type;
      if (AUTO_PLACEHOLDERS.has(phType)) continue;
      const paras = paragraphs(el.shape.text);
      const hasText = paras.some((p) => p.text.trim());
      if (phType && !hasText) { findings.push({ kind: "空のプレースホルダ", id: el.objectId, type: phType }); continue; }
      if (!hasText) continue;
      const todo = isTodo(el);
      if (!phType && !todo) findings.push({ kind: "プレースホルダの外の文字箱", id: el.objectId, text: paras.map((p) => p.text).join(" ").slice(0, 40) });
      const own = paras.find((p) => p.runStyle)?.runStyle ?? {};
      const get = (k) => own[k] ?? R.first(els.slice(1), (e) => R.run(e)[k]);
      const size = own.fontSize?.magnitude ?? R.first(els.slice(1), (e) => R.run(e).fontSize?.magnitude) ?? 18;
      const minSize = Math.min(size, ...paras.flatMap((p) => p.sizes));
      const p0 = paras[0]?.pstyle ?? {};
      const getP = (k) => p0[k] ?? R.first(els.slice(1), (e) => R.para(e)[k]);
      const label = todo ? "仮置きの枠" : phType ? LABEL[phType] ?? phType : "文字箱";
      texts.push({ id: el.objectId, label, placeholder: phType ? el.shape.placeholder : null, size: minSize, font: get("fontFamily") ?? null, text: paras.map((p) => p.text) });
      if (minPt && minSize < minPt) findings.push({ kind: "最小文字の違反", id: el.objectId, size: minSize, min: minPt });
      if (g) boxes.push({
        kind: "text", id: el.objectId, label, ...g, inset: INSET, size: minSize, bold: Boolean(get("bold")), font: get("fontFamily") ?? null,
        color: R.hex(own.foregroundColor, masterId) ?? R.first(els.slice(1), (e) => R.hex(R.run(e).foregroundColor, masterId)) ?? "#000000",
        align: getP("alignment") ?? "START", anchor: el.shape.shapeProperties?.contentAlignment ?? R.first(els.slice(1), (e) => e.shape?.shapeProperties?.contentAlignment) ?? "TOP",
        spaceBelow: getP("spaceBelow")?.magnitude ?? 0, lineSpacing: getP("lineSpacing") ?? 100, paras: paras.map((p) => p.text),
      });
    }
    return {
      index: k + 1, slideId: s.objectId, layout: layout?.layoutProperties?.name ?? null,
      bg: bgFill?.solidFill ? R.hex(bgFill.solidFill.color, masterId) ?? "#FFFFFF" : bgFill?.stretchedPictureFill ? "#808080" : "#FFFFFF",
      bgImage: Boolean(bgFill?.stretchedPictureFill),
      boxes, texts, findings, todos: (s.pageElements ?? []).filter(isTodo).map((e) => e.objectId),
    };
  });
  return { slides, page: { width: pw, height: ph } };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (!opt("--read")) { console.error("usage: node check-slides.mjs --read <read.json> [--deck <deck.md> | --min 18] [--out <html>] [--json <out.json>] [--no-measure]"); process.exit(2); }
  const read = readJson(opt("--read"));
  const mf = opt("--min") ? { pt: Number(opt("--min")), note: `${opt("--min")}pt（--min）` } : minFont(opt("--deck") ? deckLib.readEvent(path.resolve(opt("--deck"))) : null);
  const r = checkDeck(read, { minPt: mf.pt });
  const out = path.resolve(opt("--out") ?? path.join(path.dirname(path.resolve(opt("--deck") ?? opt("--read"))), "preview", "check.html"));
  const pages = r.slides.map((s) => ({ index: s.index, title: s.texts[0]?.text?.join(" ") ?? "", sub: s.layout ?? "", bg: s.bg, bgImage: s.bgImage, boxes: s.boxes, warnings: s.findings.map((f) => `${f.kind}: ${f.id}${f.size ? `（${f.size}pt）` : ""}`) }));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const font = r.slides.flatMap((s) => s.texts.map((t) => t.font)).find(Boolean) ?? "Noto Sans JP";
  // 最小文字の違反は上の findings に出すので、一覧の測定には渡さない（同じ違反を2回出さないため）
  fs.writeFileSync(out, pageHtml({ title: `点検: ${read.title ?? ""}`, summary: `${r.slides.length}枚 ／ 最小文字 ${mf.note}`, pages, page: r.page, font, minPt: null }), "utf8");
  const measured = args.includes("--no-measure") ? null : measure(out, "check");
  let problems = 0;
  for (const s of r.slides) {
    const ms = measured?.slides.find((x) => x.index === s.index);
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
  console.log(`最小文字 ${mf.note}`);
  if (!measured) console.log("溢れ・コントラスト・重なりは未測定（--no-measure）");
  else if (!measured.fontReady) console.log(`! 書体「${font}」をブラウザで読めませんでした。溢れは代わりの書体で測った値`);
  console.log(problems ? `問題 ${problems}件（点検の一覧: ${out}）` : `${measured ? "問題なし" : "測った範囲で問題なし"}（点検の一覧: ${out}）`);
  if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify(r, null, 1));
  process.exitCode = problems ? 1 : 0;
}

if (isMain(import.meta.url)) main();

#!/usr/bin/env node
/**
 * import-template.mjs — 外から与えるテンプレート（主催のデッキなど）の読み出しから、テンプレートの定義（template.json）の下書きを起こす
 *
 * レイアウトごとに、プレースホルダの位置・大きさと、継承（レイアウト → マスター）まで解いた書式を箱にする。
 * 役割 → レイアウトの対応（roles）と画像の枠（frame）は、レイアウトの名前と箱の組から案を置く。
 * 案は下書きなので、AI が見本スライドのノートと照らして直し、著者が確かめてから使う。
 * 最小文字（--min）を下回る箱は stderr に出す。テンプレートの書式は直さない（主催のものなので）。
 *
 * 使い方:
 *   node import-template.mjs --read <デッキの読み出し.json> --id <名前> [--label <表示名>] [--min 18] [--out <template.json>]
 *
 * --read はマスクなしの read_presentation の結果。既定の出力は templates/{名前}/template.json。
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, isMain, SKILL_DIR, EMU_PER_IN } from "./lib/template.mjs";
import { resolver } from "./lib/read.mjs";

const TEXT_TYPES = new Set(["TITLE", "CENTERED_TITLE", "SUBTITLE", "BODY"]);
// 画像の枠を見出しの下に置く時の、見出しとの間とページ下端の余白（inch）
const FRAME_GAP = 0.1;
const FRAME_BOTTOM = 0.35;
const round = (v) => Math.round(v * 100) / 100;

function geom(el) {
  const t = el.transform ?? {};
  return {
    x: round((t.translateX ?? 0) / EMU_PER_IN), y: round((t.translateY ?? 0) / EMU_PER_IN),
    w: round(((el.size?.width?.magnitude ?? 0) * (t.scaleX ?? 1)) / EMU_PER_IN), h: round(((el.size?.height?.magnitude ?? 0) * (t.scaleY ?? 1)) / EMU_PER_IN),
  };
}

export function importTemplate(read, { id, label, minPt = null } = {}) {
  const R = resolver(read);
  const warnings = [];
  const page = { width: round(read.pageSize.width.magnitude / EMU_PER_IN), height: round(read.pageSize.height.magnitude / EMU_PER_IN) };
  const fonts = {};
  const layouts = {};
  const shapes = {};
  for (const l of read.layouts ?? []) {
    const name = l.layoutProperties.name;
    const masterId = l.layoutProperties.masterObjectId;
    const master = (read.masters ?? []).find((m) => m.objectId === masterId);
    const fill = l.pageProperties?.pageBackgroundFill?.propertyState === "INHERIT" || !l.pageProperties?.pageBackgroundFill ? master?.pageProperties?.pageBackgroundFill : l.pageProperties.pageBackgroundFill;
    const bgImage = Boolean(fill?.stretchedPictureFill);
    const background = bgImage ? "#808080" : R.hex(fill?.solidFill?.color, masterId) ?? "#FFFFFF";
    const phs = (l.pageElements ?? []).filter((e) => TEXT_TYPES.has(e.shape?.placeholder?.type));
    if (!phs.length) continue;
    const boxes = {};
    const order = [...phs].sort((a, b) => ["CENTERED_TITLE", "TITLE", "SUBTITLE", "BODY"].indexOf(a.shape.placeholder.type) - ["CENTERED_TITLE", "TITLE", "SUBTITLE", "BODY"].indexOf(b.shape.placeholder.type) || (a.shape.placeholder.index ?? 0) - (b.shape.placeholder.index ?? 0));
    let bodies = 0;
    for (const e of order) {
      const ph = e.shape.placeholder;
      const els = R.chain(e);
      const g = geom(e);
      const size = R.first(els, (x) => R.run(x).fontSize?.magnitude) ?? 18;
      const font = R.first(els, (x) => R.run(x).fontFamily) ?? "Arial";
      fonts[font] = (fonts[font] ?? 0) + 1;
      const box = {
        ph: ph.type, ph_index: ph.index ?? 0, ...g, size,
        bold: Boolean(R.first(els, (x) => R.run(x).bold)),
        color: R.first(els, (x) => R.hex(R.run(x).foregroundColor?.opaqueColor, masterId)) ?? "#000000",
        align: R.first(els, (x) => R.para(x).alignment) ?? "START",
        anchor: R.first(els, (x) => x.shape?.shapeProperties?.contentAlignment) ?? "TOP",
        spaceBelow: R.first(els, (x) => R.para(x).spaceBelow?.magnitude) ?? 0,
        lineSpacing: R.first(els, (x) => R.para(x).lineSpacing) ?? 100,
        font,
      };
      const slot = ph.type === "TITLE" || ph.type === "CENTERED_TITLE" ? (boxes.title ? "title2" : "title") : bodies++ === 0 ? "body" : `body${bodies}`;
      boxes[slot] = box;
      if (minPt && size < minPt) warnings.push(`「${name}」の ${slot}（${ph.type}）が ${size}pt で、最小 ${minPt}pt を下回る`);
    }
    // 画像の枠の案: 2つ目の本文の場所 → 見出しだけなら見出しの下 → 本文の場所
    let frame = null;
    if (boxes.body2) frame = { x: boxes.body2.x, y: boxes.body2.y, w: boxes.body2.w, h: boxes.body2.h };
    else if (boxes.title && !boxes.body) {
      const top = round(boxes.title.y + boxes.title.h + FRAME_GAP);
      if (page.height - FRAME_BOTTOM - top > 1) frame = { x: boxes.title.x, y: top, w: boxes.title.w, h: round(page.height - FRAME_BOTTOM - top) };
    } else if (boxes.body) frame = { x: boxes.body.x, y: boxes.body.y, w: boxes.body.w, h: boxes.body.h };
    layouts[name] = { background, ...(bgImage ? { backgroundImage: true } : {}), boxes, ...(frame ? { frame } : {}) };
    shapes[name] = { title: Boolean(boxes.title), centered: boxes.title?.ph === "CENTERED_TITLE", bodies, subtitle: boxes.body?.ph === "SUBTITLE" };
  }

  // 役割 → レイアウトの案。既定のレイアウトの名前を先に使い、無ければ箱の組で探す
  const names = Object.keys(layouts);
  const pick = (...tests) => { for (const t of tests) { const n = names.find(t); if (n) return n; } return null; };
  const byName = (re) => (n) => re.test(n);
  const cover = pick((n) => n === "TITLE", (n) => shapes[n].centered) ?? names[0];
  const text = pick((n) => n === "TITLE_AND_BODY", (n) => shapes[n].title && shapes[n].bodies === 1 && !shapes[n].subtitle) ?? cover;
  const visual = pick((n) => n === "TITLE_ONLY", (n) => shapes[n].title && shapes[n].bodies === 0 && layouts[n].frame) ?? text;
  const both = pick((n) => n === "TITLE_AND_TWO_COLUMNS", (n) => shapes[n].title && shapes[n].bodies === 2) ?? text;
  const section = pick((n) => n === "SECTION_HEADER", byName(/区切り|セクション|section/i)) ?? cover;
  const end = pick(byName(/終わり|おわり|end|closing|thank/i)) ?? cover;
  const big = pick((n) => n === "MAIN_POINT", byName(/大きな|一文|main.?point|quote/i)) ?? text;
  const content = { text, visual, both };
  const roles = {
    表紙: cover, 区切り: section, 終わり: end, 主張: content, 図: content, 画面: visual,
    数字: { text: big, visual, both }, 引用: big, 問い: big, まとめ: content,
  };
  const font = Object.entries(fonts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Noto Sans JP";
  const tpl = {
    id, label: label ?? id, external: true,
    note: `外から与えるテンプレート「${read.title ?? id}」のレイアウトから起こした下書き。roles と frame は案なので、見本スライドのノートと照らして直し、著者が確かめてから使う`,
    page, font, colors: {}, inset: { l: 0.1, r: 0.1, t: 0.05, b: 0.05 }, lineSpacing: 100,
    todoFrame: { size: Math.max(18, minPt ?? 18), color: "#5A6372", colorOnDark: "#FFFFFF" },
    layouts, roles, samples: {},
  };
  return { tpl, warnings };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const id = opt("--id");
  if (id === "navy") { console.error("navy は内蔵のテンプレートなので、別の名前にする"); process.exit(2); }
  if (!opt("--read") || !id || !/^[a-z0-9-]+$/.test(id)) {
    console.error("usage: node import-template.mjs --read <read.json> --id <名前（小文字・数字・ハイフン）> [--label <表示名>] [--min 18] [--out <template.json>]");
    process.exit(2);
  }
  const { tpl, warnings } = importTemplate(readJson(opt("--read")), { id, label: opt("--label"), minPt: opt("--min") ? Number(opt("--min")) : null });
  const out = path.resolve(opt("--out") ?? path.join(SKILL_DIR, "templates", id, "template.json"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(tpl, null, 2) + "\n");
  for (const w of warnings) console.error(`! ${w}`);
  console.error(`定義の下書きを書きました: ${out}（レイアウト ${Object.keys(tpl.layouts).length}）`);
  console.error(`役割の案: ${Object.entries(tpl.roles).map(([r, v]) => `${r}→${typeof v === "string" ? v : `${v.text}/${v.visual}/${v.both}`}`).join("、")}`);
}

if (isMain(import.meta.url)) main();

#!/usr/bin/env node
/**
 * make-pptx.mjs — テンプレートの定義から .pptx を作る（Drive で Google スライドに変換して使う）
 *
 * 使い方:
 *   node make-pptx.mjs template [--template navy] --out <file.pptx>
 *       テンプレートのデッキの元。名前付きのレイアウトと、各レイアウトの見本スライド（ノートに用途）を持つ。
 *   node make-pptx.mjs deck <deck.md> [--template navy] --out <file.pptx>
 *       deck.md を、使うレイアウトとスライド・画像ごと .pptx にする（スピーカーノートは入れない）。
 *       connector が使えない時と、画像の公開を避けたい時の経路（著者が Drive に上げて「Google スライドとして保存」する）。
 *
 * どちらも、make-pptx で作るテンプレート（定義に master とテーマの色がある物）向け。外から与えるテンプレートには使わない。
 * 画像は `見せる:` のパス（deck.md からの相対）を読み、.pptx に埋め込む（公開の URL は要らない）。
 */
import fs from "node:fs";
import path from "node:path";
import { loadTemplate, deckModels, placeholderKeys, isMain, todoColor } from "./lib/template.mjs";
import { buildPackage, slidePh, pictureXml, todoXml, imageSize, fitInside } from "./lib/pptx.mjs";

export function templatePptx(tpl) {
  const layouts = Object.keys(tpl.layouts);
  const slides = layouts.map((name) => {
    const L = tpl.layouts[name];
    const keys = placeholderKeys(L);
    const sample = tpl.samples?.[name] ?? {};
    let id = 2;
    const shapes = Object.entries(L.boxes).map(([slot, box]) => slidePh(id++, box, keys[slot], String(sample[slot] ?? slot).split("\n"))).join("");
    return { layout: name, shapes, notes: sample.note ? [sample.note] : [] };
  });
  return buildPackage(tpl, { layouts, slides });
}

export function deckPptx(tpl, deckPath) {
  const { models } = deckModels(tpl, deckPath);
  const layouts = [...new Set(models.map((m) => m.layoutName))];
  const warnings = [];
  const slides = models.map((m) => {
    let id = 2;
    let shapes = m.slots.filter((s) => s.paras.length).map((s) => slidePh(id++, s.box, s.key, s.paras)).join("");
    const media = [];
    if (m.visual && m.frame) {
      const abs = m.visual.kind === "image" ? path.resolve(path.dirname(deckPath), m.visual.path) : null;
      if (abs && fs.existsSync(abs)) {
        const data = fs.readFileSync(abs);
        const size = imageSize(data);
        if (!size) warnings.push(`s${m.index}: 画像の縦横比を読めません（${m.visual.path}）。枠いっぱいに置いた`);
        const name = `image${m.index}${path.extname(abs).toLowerCase()}`;
        media.push({ rid: "rIdI1", name, data });
        shapes += pictureXml(id++, "rIdI1", fitInside(m.frame, size), path.basename(abs));
      } else {
        if (abs) warnings.push(`s${m.index}: 画像が見つかりません（${m.visual.path}）。仮置きの枠にした`);
        shapes += todoXml(tpl, id++, m.frame, abs ? `画像を入れる: ${m.visual.path}` : m.visual.text, todoColor(tpl, m.layout));
      }
    }
    for (const msg of m.issues) warnings.push(`s${m.index}: ${msg}`);
    return { layout: m.layoutName, shapes, media, notes: [] };
  });
  return { buf: buildPackage(tpl, { layouts, slides }), warnings };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  const out = opt("--out");
  if (!["template", "deck"].includes(cmd) || !out) {
    console.error("usage: node make-pptx.mjs template [--template navy] --out <file.pptx>\n       node make-pptx.mjs deck <deck.md> [--template navy] --out <file.pptx>");
    process.exit(2);
  }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  let buf;
  try {
    if (cmd === "template") buf = templatePptx(tpl);
    else {
      const deckPath = rest.find((a, i) => a.endsWith(".md") && !rest[i - 1]?.startsWith("--"));
      const r = deckPptx(tpl, path.resolve(deckPath));
      buf = r.buf;
      for (const w of r.warnings) console.error(`! ${w}`);
    }
  } catch (e) { console.error(`止めました: ${e.message}`); process.exit(1); }
  fs.writeFileSync(out, buf);
  console.error(`${out}: ${buf.length} バイト`);
}

if (isMain(import.meta.url)) main();

#!/usr/bin/env node
/**
 * make-pptx.mjs — テンプレートの定義から .pptx を作る（Drive で Google スライドに変換して使う）
 *
 * 使い方:
 *   node make-pptx.mjs template [--template navy] [--layouts 表紙,区切り] [--bare] --out <file.pptx>
 *       テンプレートのデッキの元。名前付きのレイアウトと、各レイアウトの見本スライド（ノートに用途）を持つ。
 *       --bare は書式を持たない（名前とプレースホルダの組と位置だけ）。書式は変換後に sync-template.mjs で当てる。
 *   node make-pptx.mjs deck <deck.md> [--template navy] --out <file.pptx>
 *       deck.md を、使うレイアウトとスライド・ノート・画像ごと .pptx にする。
 *       connector が使えない時の代わりの経路（著者が Drive に上げて「Google スライドとして保存」する）。
 *
 * 画像は `見せる:` のパス（deck.md からの相対）を読み、.pptx に埋め込む（公開の URL は要らない）。
 * 出力の大きさを stderr に出す。AI が create_file の base64 で確実に上げられるのは約 6KB（base64 で約 8 千字）までなので、
 * それを超えたら著者が Drive に上げる。
 */
import fs from "node:fs";
import path from "node:path";
import { loadTemplate, deckModels, placeholderKeys, notesText, isMain, todoColor } from "./lib/template.mjs";
import { buildPackage, slidePh, pictureXml, todoXml, pngSize, fitInside } from "./lib/pptx.mjs";

export function templatePptx(tpl, { only = null, bare = false } = {}) {
  const layouts = Object.keys(tpl.layouts).filter((n) => !only || only.includes(n));
  const slides = layouts.map((name) => {
    const L = tpl.layouts[name];
    const keys = placeholderKeys(L);
    const sample = tpl.samples?.[name] ?? {};
    let id = 2;
    const shapes = Object.entries(L.boxes).map(([slot, box]) => slidePh(id++, box, keys[slot], String(sample[slot] ?? slot).split("\n"))).join("");
    return { layout: name, shapes, notes: sample.note ? [sample.note] : [] };
  });
  return buildPackage(tpl, { layouts, slides, styled: !bare });
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
        const name = `image${m.index}${path.extname(abs).toLowerCase()}`;
        media.push({ rid: "rIdI1", name, data });
        shapes += pictureXml(id++, "rIdI1", fitInside(m.frame, pngSize(data)), path.basename(abs));
      } else {
        if (abs) warnings.push(`s${m.index}: 画像が見つかりません（${m.visual.path}）。仮置きの枠にした`);
        shapes += todoXml(tpl, id++, m.frame, abs ? `画像を入れる: ${m.visual.path}` : m.visual.text, todoColor(tpl, m.layout));
      }
    }
    const notes = notesText(m.notes);
    return { layout: m.layoutName, shapes, media, notes: notes ? notes.split("\n") : [] };
  });
  return { buf: buildPackage(tpl, { layouts, slides }), warnings };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  const out = opt("--out");
  if (!["template", "deck"].includes(cmd) || !out) {
    console.error("usage: node make-pptx.mjs template [--template navy] [--layouts a,b] [--bare] --out <file.pptx>\n       node make-pptx.mjs deck <deck.md> [--template navy] --out <file.pptx>");
    process.exit(1);
  }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  let buf;
  if (cmd === "template") buf = templatePptx(tpl, { only: opt("--layouts")?.split(","), bare: rest.includes("--bare") });
  else {
    const deckPath = rest.find((a) => a.endsWith(".md"));
    const r = deckPptx(tpl, path.resolve(deckPath));
    buf = r.buf;
    for (const w of r.warnings) console.error(`! ${w}`);
  }
  fs.writeFileSync(out, buf);
  console.error(`${out}: ${buf.length} バイト（base64 で ${Math.ceil(buf.length / 3) * 4} 字）`);
}

if (isMain(import.meta.url)) main();

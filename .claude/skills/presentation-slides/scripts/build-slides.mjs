#!/usr/bin/env node
/**
 * build-slides.mjs — deck.md から、テンプレートを複製したデッキに組む要求（update_presentation の requests）を作る
 *
 * HTML の一覧（render-slides.mjs）と同じ組み立て図（lib/template.mjs の slideModel）から作る。
 * スライドはレイアウトから作り（createSlide + placeholderIdMappings）、文字はプレースホルダに入れる。書式はレイアウトから継ぐ。
 * 使わないプレースホルダは消す。画像は公開 URL から差し込み、パスの無い `見せる:` は仮置きの枠にする。
 *
 * 使い方（ノートの図形の ID はスライドを作った後でないと分からないので、update_presentation を2回に分ける）:
 *   node build-slides.mjs slides <deck.md> --read <複製したデッキの読み出し.json> [--images <images.json>] [--template navy] [--tag d] [--out <req1.json>]
 *   node build-slides.mjs notes  <deck.md> --read <1回目の後の読み出し.json> [--template navy] [--tag d] [--out <req2.json>]
 *   node build-slides.mjs record <deck.md> --read <組んだ後の読み出し.json> [--images <images.json>] [--template navy] [--tag d] [--out <slides.json>]
 *
 * --images は { "figures/x.png": "https://lh3.googleusercontent.com/d/{ID}", ... }（deck.md の `見せる:` のパス → 公開中の URL）。
 *   画像の URL が無い時は、画像の代わりに仮置きの枠を置き、stderr で知らせる。
 * notes は、組んだスライドへ台詞をノートに入れ、組む前からあったスライド（テンプレートの見本）を消す要求を作る。
 * record は、デッキとスライドの ID と deck.md の対応を slides.json に書く（既定は deck.md と同じ階層）。取り込み（pull-slides.mjs）が読む。
 *   --images を渡すと、差し込みに使った画像の対応（パス → URL）も残す。組み直す時に、Drive の同じ複製を使い回せる。
 * 出力の requests には writeControl を付けない。呼ぶ側が、送る直前の読み出しの revisionId を付ける。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadTemplate, deckModels, readJson, isMain, rgb, notesText, todoColor, AUTO_PLACEHOLDERS, EMU_PER_IN } from "./lib/template.mjs";

const keyOf = (ph) => `${ph.type}#${ph.index ?? 0}`;
const SLOT_ID = { title: "title", body: "body", source: "src" };
export const slideId = (tag, i) => `${tag}${String(i).padStart(2, "0")}_slide`;
const objId = (tag, i, name) => `${tag}${String(i).padStart(2, "0")}_${name}`;

const emuBox = (f) => ({
  size: { width: { magnitude: Math.round(f.w * EMU_PER_IN), unit: "EMU" }, height: { magnitude: Math.round(f.h * EMU_PER_IN), unit: "EMU" } },
  transform: { scaleX: 1, scaleY: 1, translateX: Math.round(f.x * EMU_PER_IN), translateY: Math.round(f.y * EMU_PER_IN), unit: "EMU" },
});

/** 仮置きの枠（著者が後で画像を入れる場所）。点線の枠と説明の文字 */
function todoFrame(tpl, model, pageObjectId, objectId) {
  const size = tpl.todoFrame?.size ?? 18;
  const color = { opaqueColor: { rgbColor: rgb(tpl, todoColor(tpl, model.layout)) } };
  return [
    { createShape: { objectId, shapeType: "RECTANGLE", elementProperties: { pageObjectId, ...emuBox(model.frame) } } },
    {
      updateShapeProperties: {
        objectId,
        shapeProperties: {
          shapeBackgroundFill: { propertyState: "NOT_RENDERED" },
          outline: { outlineFill: { solidFill: { color: color.opaqueColor } }, weight: { magnitude: 1.5, unit: "PT" }, dashStyle: "DASH" },
          contentAlignment: "MIDDLE",
        },
        fields: "shapeBackgroundFill.propertyState,outline,contentAlignment",
      },
    },
    { insertText: { objectId, text: model.visual.text } },
    { updateTextStyle: { objectId, textRange: { type: "ALL" }, style: { fontFamily: tpl.font, fontSize: { magnitude: size, unit: "PT" }, foregroundColor: color }, fields: "fontFamily,fontSize,foregroundColor" } },
    { updateParagraphStyle: { objectId, textRange: { type: "ALL" }, style: { alignment: "CENTER" }, fields: "alignment" } },
  ];
}

/** 1回目: スライドを作り、文字・画像・仮置きの枠を入れ、使わないプレースホルダを消す */
export function slideRequests(tpl, models, read, { images = {}, tag = "d" } = {}) {
  const requests = [];
  const warnings = [];
  const plan = [];
  const layouts = new Map(read.layouts.map((l) => [l.layoutProperties.name, l]));
  const start = (read.slides ?? []).length; // 見本の後ろに足し、notes の段で見本を消す
  models.forEach((m, k) => {
    const L = layouts.get(m.layoutName);
    if (!L) { warnings.push(`s${m.index}: デッキにレイアウト「${m.layoutName}」がありません`); return; }
    const sid = slideId(tag, m.index);
    const phs = (L.pageElements ?? []).filter((e) => e.shape?.placeholder && !AUTO_PLACEHOLDERS.has(e.shape.placeholder.type));
    const bySlot = new Map(m.slots.map((s) => [keyOf(s.key), s]));
    const mappings = phs.map((e) => {
      const s = bySlot.get(keyOf(e.shape.placeholder));
      return { layoutPlaceholder: { type: e.shape.placeholder.type, index: e.shape.placeholder.index ?? 0 }, objectId: s ? objId(tag, m.index, SLOT_ID[s.slot] ?? s.slot) : objId(tag, m.index, `ph${keyOf(e.shape.placeholder).replace("#", "")}`.toLowerCase()) };
    });
    requests.push({ createSlide: { objectId: sid, insertionIndex: start + k, slideLayoutReference: { layoutId: L.objectId }, placeholderIdMappings: mappings } });
    const objects = {};
    for (const mp of mappings) {
      const s = bySlot.get(keyOf(mp.layoutPlaceholder));
      if (s && s.paras.length) {
        requests.push({ insertText: { objectId: mp.objectId, text: s.paras.join("\n") } });
        objects[s.slot] = mp.objectId;
      } else {
        requests.push({ deleteObject: { objectId: mp.objectId } }); // 空のプレースホルダを残さない
      }
    }
    if (m.visual && m.frame) {
      const url = m.visual.kind === "image" ? images[m.visual.path] : null;
      if (url) {
        const id = objId(tag, m.index, "img");
        requests.push({ createImage: { objectId: id, url, elementProperties: { pageObjectId: sid, ...emuBox(m.frame) } } });
        objects.image = id;
      } else {
        if (m.visual.kind === "image") warnings.push(`s${m.index}: 画像の URL がありません（${m.visual.path}）。仮置きの枠にした`);
        const id = objId(tag, m.index, "todo");
        const vm = m.visual.kind === "image" ? { ...m, visual: { kind: "todo", text: `画像を入れる: ${m.visual.path}` } } : m;
        requests.push(...todoFrame(tpl, vm, sid, id));
        objects.todo = id;
      }
    }
    for (const msg of m.issues) warnings.push(`s${m.index}: ${msg}`);
    plan.push({ deckIndex: m.index, heading: m.heading, layout: m.layoutName, slideId: sid, objects });
  });
  return { requests, warnings, plan, samples: (read.slides ?? []).map((s) => s.objectId) };
}

/** 2回目: 台詞をノートに入れ、組む前からあったスライド（見本）を消す */
export function notesRequests(models, read, { tag = "d" } = {}) {
  const requests = [];
  const warnings = [];
  const ours = new Set(models.map((m) => slideId(tag, m.index)));
  for (const m of models) {
    const s = (read.slides ?? []).find((x) => x.objectId === slideId(tag, m.index));
    if (!s) { warnings.push(`s${m.index}: 組んだスライドが見つかりません`); continue; }
    const notesId = s.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
    const text = notesText(m.notes);
    if (notesId && text) requests.push({ insertText: { objectId: notesId, text } });
  }
  for (const s of read.slides ?? []) if (!ours.has(s.objectId)) requests.push({ deleteObject: { objectId: s.objectId } });
  return { requests, warnings };
}

/** 組んだ後: デッキとスライドの ID と、deck.md の対応（slides.json） */
export function record(tpl, models, read, deckText, { tag = "d", images = null } = {}) {
  const slides = new Map((read.slides ?? []).map((s) => [s.objectId, new Set((s.pageElements ?? []).map((e) => e.objectId))]));
  const jst = new Date(Date.now() + 9 * 3600e3).toISOString();
  return {
    presentationId: read.presentationId,
    url: `https://docs.google.com/presentation/d/${read.presentationId}/edit`,
    template: tpl.id,
    builtAt: `${jst.slice(0, 10).replace(/-/g, "")} ${jst.slice(11, 16)} JST`,
    revisionId: read.revisionId,
    deckSha1: crypto.createHash("sha1").update(deckText).digest("hex"),
    ...(images ? { images } : {}),
    slides: models.filter((m) => slides.has(slideId(tag, m.index))).map((m) => {
      const els = slides.get(slideId(tag, m.index));
      const objects = {};
      for (const s of m.slots) {
        const id = objId(tag, m.index, SLOT_ID[s.slot] ?? s.slot);
        if (s.paras.length && els.has(id)) objects[s.slot] = id;
      }
      for (const name of ["img", "todo"]) if (els.has(objId(tag, m.index, name))) objects[name === "img" ? "image" : "todo"] = objId(tag, m.index, name);
      return { slideId: slideId(tag, m.index), deckIndex: m.index, heading: m.heading, layout: m.layoutName, objects };
    }),
  };
}

function main() {
  const [cmd, deckPath, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  if (!["slides", "notes", "record"].includes(cmd) || !deckPath || !opt("--read")) {
    console.error("usage: node build-slides.mjs slides|notes|record <deck.md> --read <read.json> [--images <images.json>] [--template navy] [--tag d] [--out <file>]");
    process.exit(1);
  }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  const deckAbs = path.resolve(deckPath);
  const { models } = deckModels(tpl, deckAbs);
  const read = readJson(opt("--read"));
  const tag = opt("--tag") ?? "d";
  if (cmd === "record") {
    const out = opt("--out") ?? path.join(path.dirname(deckAbs), "slides.json");
    const images = opt("--images") ? JSON.parse(fs.readFileSync(opt("--images"), "utf8")) : null;
    const r = record(tpl, models, read, fs.readFileSync(deckAbs, "utf8"), { tag, images });
    if (r.slides.length !== models.length) console.error(`! deck.md の ${models.length} 枚のうち、デッキで見つかったのは ${r.slides.length} 枚`);
    fs.writeFileSync(out, JSON.stringify(r, null, 1) + "\n");
    console.error(`slides.json を書きました: ${out}（${r.slides.length}枚、revision ${r.revisionId}）`);
    return;
  }
  const r = cmd === "slides"
    ? slideRequests(tpl, models, read, { images: opt("--images") ? JSON.parse(fs.readFileSync(opt("--images"), "utf8")) : {}, tag })
    : notesRequests(models, read, { tag });
  for (const w of r.warnings) console.error(`! ${w}`);
  const out = JSON.stringify(cmd === "slides" ? { requests: r.requests, plan: r.plan, samples: r.samples } : { requests: r.requests });
  if (opt("--out")) { fs.writeFileSync(opt("--out"), out); console.error(`requests ${r.requests.length} 件（${out.length} 字）→ ${opt("--out")}`); }
  else process.stdout.write(out);
}

if (isMain(import.meta.url)) main();

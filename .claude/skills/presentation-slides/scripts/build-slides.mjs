#!/usr/bin/env node
/**
 * build-slides.mjs — deck.md から、テンプレートを複製したデッキに組む要求（update_presentation の requests）を作る
 *
 * HTML の一覧（render-slides.mjs）と同じ組み立て図（lib/template.mjs の slideModel）から作る。
 * スライドはレイアウトから作り（createSlide + placeholderIdMappings）、文字はプレースホルダに入れる。書式はレイアウトから継ぐ。
 * 使わないプレースホルダは消す。画像は公開 URL から差し込み、パスの無い `見せる:` は仮置きの枠にする。
 * 組む前からあったスライド（テンプレートの見本）は同じ要求で消す。見本でないスライドがあれば、要求を作らずに止める。
 * スピーカーノートには書かない（台詞は deck.md に置き、ノートを使うかは著者が決める）。
 *
 * 使い方:
 *   node build-slides.mjs slides <deck.md> --read <複製したデッキの読み出し.json> [--images <images.json>] [--template navy] [--out <req.json>]
 *   node build-slides.mjs record <deck.md> --read <組んだ後の読み出し.json> [--images <images.json>] [--by-order] [--template navy] [--out <slides.json>]
 *
 * --images は { "figures/x.png": "https://lh3.googleusercontent.com/d/{ID}", ... }（deck.md の `見せる:` のパス → 公開中の URL）。
 *   値は slides.json の images と同じ { "url": … } でもよい。URL が無い画像は仮置きの枠にし、stderr で知らせる。
 * record は、デッキとスライドの ID と deck.md の対応を slides.json に書く（既定は deck.md と同じ階層）。取り込み（pull-slides.mjs）が読む。
 *   --images を渡すと、差し込んだ図の URL と、その時の図の SHA-1 も残す（組み直す時に、図が同じなら Drive の複製を使い回すため）。
 *   --by-order は、.pptx を変換したデッキ（スライドの ID を変換器が振る）で、スライドを並び順で deck.md に対応させる。
 * 出力の requests には writeControl を付けない。呼ぶ側が、送る直前の読み出しの revisionId を付ける。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadTemplate, deckModels, readJson, isMain, rgb, todoColor, placeholderKeys, AUTO_PLACEHOLDERS, EMU_PER_IN } from "./lib/template.mjs";
import { keyOf, jstStamp } from "./lib/read.mjs";

// 組んだスライドと要素の ID の頭。ID は「d01_slide」「d01_title」の形になる
const TAG = "d";
const SLOT_ID = { title: "title", body: "body", source: "src" };
export const slideId = (i) => `${TAG}${String(i).padStart(2, "0")}_slide`;
const objId = (i, name) => `${TAG}${String(i).padStart(2, "0")}_${name}`;
const urlOf = (v) => (typeof v === "string" ? v : v?.url) ?? null;

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

/** 組む前からあるスライドが、すべてテンプレートの見本か（見本のあるレイアウトを使い、1レイアウト1枚まで） */
export function samplesOf(tpl, read) {
  const layoutName = new Map((read.layouts ?? []).map((l) => [l.objectId, l.layoutProperties?.name]));
  const seen = new Set();
  const strangers = [];
  for (const s of read.slides ?? []) {
    const name = layoutName.get(s.slideProperties?.layoutObjectId);
    if (!name || !tpl.samples?.[name] || seen.has(name)) strangers.push(`${s.objectId}（${name ?? "?"}）`);
    seen.add(name);
  }
  return { ids: (read.slides ?? []).map((s) => s.objectId), strangers };
}

/** スライドを作り、文字・画像・仮置きの枠を入れ、使わないプレースホルダと見本を消す */
export function slideRequests(tpl, models, read, { images = {} } = {}) {
  const { ids: samples, strangers } = samplesOf(tpl, read);
  if (strangers.length) {
    throw new Error(`組む先のデッキに、テンプレートの見本でないスライドがあります: ${strangers.join("、")}。組むのはテンプレートの複製だけにする（全体デッキへは importSlides で入れる）`);
  }
  const requests = [];
  const warnings = [];
  const layouts = new Map(read.layouts.map((l) => [l.layoutProperties.name, l]));
  models.forEach((m, k) => {
    const L = layouts.get(m.layoutName);
    if (!L) { warnings.push(`s${m.index}: デッキにレイアウト「${m.layoutName}」がありません`); return; }
    const sid = slideId(m.index);
    const phs = (L.pageElements ?? []).filter((e) => e.shape?.placeholder && !AUTO_PLACEHOLDERS.has(e.shape.placeholder.type));
    const bySlot = new Map(m.slots.map((s) => [keyOf(s.key), s]));
    const mappings = phs.map((e) => {
      const s = bySlot.get(keyOf(e.shape.placeholder));
      return { layoutPlaceholder: { type: e.shape.placeholder.type, index: e.shape.placeholder.index ?? 0 }, objectId: s ? objId(m.index, SLOT_ID[s.slot] ?? s.slot) : objId(m.index, `ph${keyOf(e.shape.placeholder).replace("#", "")}`.toLowerCase()) };
    });
    requests.push({ createSlide: { objectId: sid, insertionIndex: samples.length + k, slideLayoutReference: { layoutId: L.objectId }, placeholderIdMappings: mappings } });
    for (const mp of mappings) {
      const s = bySlot.get(keyOf(mp.layoutPlaceholder));
      if (s && s.paras.length) requests.push({ insertText: { objectId: mp.objectId, text: s.paras.join("\n") } });
      else requests.push({ deleteObject: { objectId: mp.objectId } }); // 空のプレースホルダを残さない
    }
    if (m.visual && m.frame) {
      const url = m.visual.kind === "image" ? urlOf(images[m.visual.path]) : null;
      if (url) {
        requests.push({ createImage: { objectId: objId(m.index, "img"), url, elementProperties: { pageObjectId: sid, ...emuBox(m.frame) } } });
      } else {
        if (m.visual.kind === "image") warnings.push(`s${m.index}: 画像の URL がありません（${m.visual.path}）。仮置きの枠にした`);
        const vm = m.visual.kind === "image" ? { ...m, visual: { kind: "todo", text: `画像を入れる: ${m.visual.path}` } } : m;
        requests.push(...todoFrame(tpl, vm, sid, objId(m.index, "todo")));
      }
    }
    for (const msg of m.issues) warnings.push(`s${m.index}: ${msg}`);
  });
  for (const id of samples) requests.push({ deleteObject: { objectId: id } });
  return { requests, warnings, samples };
}

/** 組んだ後: デッキとスライドの ID と、deck.md の対応（slides.json） */
export function record(tpl, models, read, deckText, { images = null, deckDir = ".", byOrder = false } = {}) {
  const warnings = [];
  const slides = read.slides ?? [];
  const pick = (m, k) => {
    if (!byOrder) return slides.find((s) => s.objectId === slideId(m.index)) ?? null;
    const s = slides[k];
    const layoutName = (read.layouts ?? []).find((l) => l.objectId === s?.slideProperties?.layoutObjectId)?.layoutProperties?.name;
    if (s && layoutName !== m.layoutName) warnings.push(`s${m.index}: 並び順で対応させた Slides の ${k + 1}枚目のレイアウトが「${layoutName}」（deck.md では「${m.layoutName}」）`);
    return s ?? null;
  };
  if (byOrder && slides.length !== models.length) warnings.push(`deck.md は ${models.length}枚、デッキは ${slides.length}枚。並び順の対応は先頭から取った`);
  const out = [];
  models.forEach((m, k) => {
    const s = pick(m, k);
    if (!s) return;
    const els = s.pageElements ?? [];
    const keys = placeholderKeys(m.layout);
    const objects = {};
    for (const slot of m.slots) {
      if (!slot.paras.length) continue;
      const el = els.find((e) => e.objectId === objId(m.index, SLOT_ID[slot.slot] ?? slot.slot))
        ?? els.find((e) => e.shape?.placeholder && keyOf(e.shape.placeholder) === keyOf(keys[slot.slot]));
      if (el) objects[slot.slot] = el.objectId;
    }
    const img = els.find((e) => e.image);
    const todo = els.find((e) => e.objectId.endsWith("_todo") || e.description === "仮置きの枠" || e.title === "仮置きの枠");
    if (img) objects.image = img.objectId;
    if (todo) objects.todo = todo.objectId;
    out.push({ slideId: s.objectId, deckIndex: m.index, heading: m.heading, layout: m.layoutName, objects });
  });
  const imageRecord = images && Object.fromEntries(Object.entries(images).map(([p, v]) => {
    const abs = path.resolve(deckDir, p);
    const sha1 = fs.existsSync(abs) ? crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex") : null;
    return [p, { url: urlOf(v), sha1 }];
  }));
  return {
    json: {
      presentationId: read.presentationId,
      url: `https://docs.google.com/presentation/d/${read.presentationId}/edit`,
      template: tpl.id,
      builtAt: jstStamp(),
      revisionId: read.revisionId,
      deckSha1: crypto.createHash("sha1").update(deckText).digest("hex"),
      ...(imageRecord ? { images: imageRecord } : {}),
      slides: out,
    },
    warnings,
  };
}

function main() {
  const [cmd, deckPath, ...rest] = process.argv.slice(2);
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  if (!["slides", "record"].includes(cmd) || !deckPath || !opt("--read")) {
    console.error("usage: node build-slides.mjs slides|record <deck.md> --read <read.json> [--images <images.json>] [--by-order] [--template navy] [--out <file>]");
    process.exit(2);
  }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  const deckAbs = path.resolve(deckPath);
  const { models } = deckModels(tpl, deckAbs);
  const read = readJson(opt("--read"));
  const images = opt("--images") ? JSON.parse(fs.readFileSync(opt("--images"), "utf8")) : null;
  if (cmd === "record") {
    const out = opt("--out") ?? path.join(path.dirname(deckAbs), "slides.json");
    const { json, warnings } = record(tpl, models, read, fs.readFileSync(deckAbs, "utf8"), { images, deckDir: path.dirname(deckAbs), byOrder: rest.includes("--by-order") });
    for (const w of warnings) console.error(`! ${w}`);
    if (json.slides.length !== models.length) console.error(`! deck.md の ${models.length} 枚のうち、デッキで見つかったのは ${json.slides.length} 枚`);
    fs.writeFileSync(out, JSON.stringify(json, null, 1) + "\n");
    console.error(`slides.json を書きました: ${out}（${json.slides.length}枚、revision ${json.revisionId}）`);
    return;
  }
  let r;
  try { r = slideRequests(tpl, models, read, { images: images ?? {} }); }
  catch (e) { console.error(`止めました: ${e.message}`); process.exit(1); }
  for (const w of r.warnings) console.error(`! ${w}`);
  const out = JSON.stringify({ requests: r.requests });
  if (opt("--out")) fs.writeFileSync(opt("--out"), out);
  else process.stdout.write(out);
  console.error(`requests ${r.requests.length} 件（${out.length} 字）。テンプレートの見本 ${r.samples.length} 枚を消す${opt("--out") ? ` → ${opt("--out")}` : ""}`);
}

if (isMain(import.meta.url)) main();

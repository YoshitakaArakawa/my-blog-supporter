#!/usr/bin/env node
/**
 * sync-template.mjs — Drive のテンプレートのデッキを、テンプレートの定義（template.json）に合わせる要求を作る
 *
 * レイアウトの「構造」（名前とプレースホルダの組）は .pptx の変換でしか作れない（API にレイアウトを作る要求が無い）。
 * 「書式」（位置・大きさ・書体・色・揃え・背景）は REST で当て直せる。定義を変えた時は .pptx を上げ直さず、この要求で同期する。
 * デッキの今の値と定義を比べ、違う所だけを要求にする。要求が 0 件なら、デッキは定義どおり。
 *
 * 使い方:
 *   node sync-template.mjs --read <テンプレートのデッキの読み出し.json> [--template navy] [--samples] [--out <requests.json>]
 *
 * --read はマスクなしの read_presentation の結果（app がファイルに保存したもの。{"content": {...}} でも中身だけでもよい）。
 * --samples を付けると、見本スライド（各レイアウト1枚）の文字・ノートの用途・並びも定義に合わせる。
 * テンプレートのデッキは著者のファイルなので、要求の件数と中身を著者に示し、承認を得てから送る。
 * 定義の中で文字の箱と画像の枠が重なる所があれば、stderr で知らせる。
 * 出力は update_presentation の requests。writeControl は呼ぶ側が付ける。
 * 食い違い（定義にあってデッキに無いレイアウトなど）は stderr に出す。構造の食い違いは .pptx を作り直して上げ直す。
 */
import fs from "node:fs";
import { loadTemplate, placeholderKeys, rgb, readJson, isMain, layoutOverlaps, EMU_PER_IN, EMU_PER_PT } from "./lib/template.mjs";
import { keyOf, textOf } from "./lib/read.mjs";

// 0.1pt。変換や丸めで生じる位置の差は、同じとみなす
const EMU_TOL = EMU_PER_PT / 10;
// 色の成分（0〜1）の丸めの差。8bit の半分の段より小さければ同じ色
const COLOR_TOL = 0.5 / 255;

const firstRun = (el) => (el.shape?.text?.textElements ?? []).find((e) => e.textRun)?.textRun?.style ?? {};
const firstPara = (el) => (el.shape?.text?.textElements ?? []).find((e) => e.paragraphMarker)?.paragraphMarker?.style ?? {};
const mag = (v) => v?.magnitude ?? 0;

function sameColor(a, b) {
  if (!a || !b) return false;
  return ["red", "green", "blue"].every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) <= COLOR_TOL);
}

/** 要素の実際の位置と大きさ（EMU）。size × scale + translate */
function geomOf(el) {
  const t = el.transform ?? {};
  return {
    x: t.translateX ?? 0, y: t.translateY ?? 0,
    w: (el.size?.width?.magnitude ?? 0) * (t.scaleX ?? 1), h: (el.size?.height?.magnitude ?? 0) * (t.scaleY ?? 1),
  };
}

/** 1つのプレースホルダ（レイアウトかマスターの上）を、定義の箱に合わせる要求。違う所だけを返す */
function boxRequests(tpl, el, box) {
  const out = [];
  const want = { x: box.x * EMU_PER_IN, y: box.y * EMU_PER_IN, w: box.w * EMU_PER_IN, h: box.h * EMU_PER_IN };
  const g = geomOf(el);
  if (["x", "y", "w", "h"].some((k) => Math.abs(g[k] - want[k]) > EMU_TOL)) {
    out.push({
      updatePageElementTransform: {
        objectId: el.objectId,
        applyMode: "ABSOLUTE",
        transform: {
          scaleX: want.w / el.size.width.magnitude, scaleY: want.h / el.size.height.magnitude,
          translateX: Math.round(want.x), translateY: Math.round(want.y), unit: "EMU",
        },
      },
    });
  }
  const anchor = box.anchor ?? "TOP";
  if (el.shape?.shapeProperties?.contentAlignment !== anchor) {
    out.push({ updateShapeProperties: { objectId: el.objectId, shapeProperties: { contentAlignment: anchor }, fields: "contentAlignment" } });
  }
  const run = firstRun(el);
  const color = rgb(tpl, box.color);
  if (run.fontFamily !== tpl.font || mag(run.fontSize) !== box.size || Boolean(run.bold) !== Boolean(box.bold) || !sameColor(run.foregroundColor?.opaqueColor?.rgbColor, color)) {
    out.push({
      updateTextStyle: {
        objectId: el.objectId, textRange: { type: "ALL" },
        style: { fontFamily: tpl.font, fontSize: { magnitude: box.size, unit: "PT" }, bold: Boolean(box.bold), foregroundColor: { opaqueColor: { rgbColor: color } } },
        fields: "fontFamily,fontSize,bold,foregroundColor",
      },
    });
  }
  const p = firstPara(el);
  const align = box.align ?? "START";
  const spacing = tpl.lineSpacing ?? 100;
  if (p.alignment !== align || (p.lineSpacing ?? 100) !== spacing || mag(p.spaceAbove) !== 0 || mag(p.spaceBelow) !== (box.spaceBelow ?? 0)) {
    out.push({
      updateParagraphStyle: {
        objectId: el.objectId, textRange: { type: "ALL" },
        style: { alignment: align, lineSpacing: spacing, spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: box.spaceBelow ?? 0, unit: "PT" } },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow",
      },
    });
  }
  return out;
}

function bgRequests(tpl, page, color) {
  const want = rgb(tpl, color);
  if (sameColor(page.pageProperties?.pageBackgroundFill?.solidFill?.color?.rgbColor, want)) return [];
  return [{ updatePageProperties: { objectId: page.objectId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: want } } } }, fields: "pageBackgroundFill.solidFill.color" } }];
}

/** 文字を差し替える（同じなら何もしない。空の箱に deleteText を送ると失敗するので、中身がある時だけ消す） */
function replaceText(objectId, current, next) {
  const now = current.replace(/\n$/, "");
  if (now === (next ?? "")) return [];
  const out = [];
  if (now.length) out.push({ deleteText: { objectId, textRange: { type: "ALL" } } });
  if (next) out.push({ insertText: { objectId, insertionIndex: 0, text: next } });
  return out;
}

export function syncRequests(tpl, read, { samples = false } = {}) {
  const requests = [];
  const warnings = [];
  const layoutsByName = new Map(read.layouts.map((l) => [l.layoutProperties.name, l]));
  for (const name of Object.keys(tpl.layouts)) if (!layoutsByName.has(name)) warnings.push(`定義のレイアウト「${name}」がデッキにありません（構造は .pptx で足す）`);
  for (const l of read.layouts) if (!tpl.layouts[l.layoutProperties.name]) warnings.push(`デッキのレイアウト「${l.layoutProperties.name}」は定義にありません（同期しない）`);

  for (const w of layoutOverlaps(tpl)) warnings.push(w);
  // マスター: 背景と、見出し・本文の既定（定義の master のレイアウトに合わせる）
  const base = tpl.layouts[tpl.master ?? "見出しと本文"];
  for (const m of read.masters ?? []) {
    requests.push(...bgRequests(tpl, m, base?.background ?? "paper"));
    for (const el of m.pageElements ?? []) {
      const t = el.shape?.placeholder?.type;
      if (base && t === "TITLE") requests.push(...boxRequests(tpl, el, base.boxes.title));
      if (base && t === "BODY") requests.push(...boxRequests(tpl, el, base.boxes.body));
    }
  }

  // レイアウト: 背景と、各プレースホルダの位置・書式
  for (const [name, def] of Object.entries(tpl.layouts)) {
    const l = layoutsByName.get(name);
    if (!l) continue;
    requests.push(...bgRequests(tpl, l, def.background));
    const keys = placeholderKeys(def);
    const els = new Map((l.pageElements ?? []).filter((e) => e.shape?.placeholder).map((e) => [keyOf(e.shape.placeholder), e]));
    for (const [slot, key] of Object.entries(keys)) {
      const el = els.get(keyOf(key));
      if (!el) { warnings.push(`「${name}」に ${key.type} #${key.index}（${slot}）のプレースホルダがありません`); continue; }
      els.delete(keyOf(key));
      requests.push(...boxRequests(tpl, el, def.boxes[slot]));
    }
    for (const k of els.keys()) warnings.push(`「${name}」のプレースホルダ ${k} は定義にありません`);
  }

  // 見本スライド（各レイアウト1枚）: 見本の文字と、ノートの用途。並びは定義のレイアウトの順
  if (samples) {
    const layoutName = new Map(read.layouts.map((l) => [l.objectId, l.layoutProperties.name]));
    const parentKey = new Map(read.layouts.flatMap((l) => (l.pageElements ?? []).filter((e) => e.shape?.placeholder).map((e) => [e.objectId, keyOf(e.shape.placeholder)])));
    const order = Object.keys(tpl.layouts);
    const sampleSlides = [];
    for (const s of read.slides ?? []) {
      const name = layoutName.get(s.slideProperties.layoutObjectId);
      const sample = tpl.samples?.[name];
      if (!sample) { warnings.push(`スライド ${s.objectId} のレイアウト「${name}」に見本の定義がありません`); continue; }
      sampleSlides.push({ s, rank: order.indexOf(name) });
      const keys = placeholderKeys(tpl.layouts[name]);
      const slotByKey = new Map(Object.entries(keys).map(([slot, k]) => [keyOf(k), slot]));
      for (const el of s.pageElements ?? []) {
        const ph = el.shape?.placeholder;
        if (!ph) continue;
        const slot = slotByKey.get(parentKey.get(ph.parentObjectId) ?? keyOf(ph));
        requests.push(...replaceText(el.objectId, textOf(el.shape), slot ? sample[slot] ?? "" : ""));
      }
      const notesId = s.slideProperties.notesPage?.notesProperties?.speakerNotesObjectId;
      const notesEl = (s.slideProperties.notesPage?.pageElements ?? []).find((e) => e.objectId === notesId);
      if (notesId) requests.push(...replaceText(notesId, textOf(notesEl?.shape), sample.note));
    }
    // updateSlidesPosition は「今の並びのまま塊で動かす」要求なので、並び替える時は1枚ずつ前から置く
    const sorted = [...sampleSlides].sort((a, b) => a.rank - b.rank);
    if (sorted.some((x, i) => x !== sampleSlides[i])) {
      sorted.forEach((x, i) => requests.push({ updateSlidesPosition: { slideObjectIds: [x.s.objectId], insertionIndex: i } }));
    }
  }
  return { requests, warnings };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const readPath = opt("--read");
  if (!readPath) { console.error("usage: node sync-template.mjs --read <read.json> [--template navy] [--samples] [--out <requests.json>]"); process.exit(1); }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  const { requests, warnings } = syncRequests(tpl, readJson(readPath), { samples: args.includes("--samples") });
  for (const w of warnings) console.error(`! ${w}`);
  const out = JSON.stringify({ requests }, null, 1);
  if (opt("--out")) fs.writeFileSync(opt("--out"), out);
  else process.stdout.write(out);
  console.error(requests.length ? `定義と違う所 ${requests.length} 件の要求${opt("--out") ? ` → ${opt("--out")}` : ""}` : "デッキは定義どおり（要求 0 件）");
}

if (isMain(import.meta.url)) main();

/**
 * template.mjs — テンプレートの定義（templates/{名前}/template.json）と deck.md から、スライドの組み立て図（model）を作る共通部品
 *
 * HTML の一覧（render-slides.mjs）と組上の要求（build-slides.mjs）は、どちらもこの model から作る。
 * 2つが同じ model を使うので、HTML で合意した形がそのまま Slides になる。
 * deck.md の解析は、リポジトリの scripts/lib/deck.mjs（書式の正本は presentation-write の deck-spec.md）に任せる。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REPO_ROOT = path.resolve(SKILL_DIR, "..", "..", "..");
export const EMU_PER_IN = 914400;
export const EMU_PER_PT = 12700;
export const PROVISIONAL = "（仮）";
// 文字を自動で持つプレースホルダ。組上で ID を振らず、消さず、点検で「空」と数えない
export const AUTO_PLACEHOLDERS = new Set(["SLIDE_NUMBER", "FOOTER", "DATE_AND_TIME", "HEADER", "SLIDE_IMAGE"]);

// deck.md の解析器（リポジトリの共通部品）を読み込む
export const deckLib = await import(pathToFileURL(path.join(REPO_ROOT, "scripts", "lib", "deck.mjs")).href);

// `見せる:` の値から画像のパスを拾う（render-deck.mjs と同じく webp・svg も画像とみなす）
const IMAGE_PATH = /([^\s（(、,]+\.(?:png|jpe?g|gif|webp|svg))/i;
// Google スライドの画像の差し込みが受け付ける形式
const SLIDES_IMAGE = /\.(?:png|jpe?g|gif)$/i;
// event.md に最小文字が無い時に使う値（スライドの本文の目安）
export const DEFAULT_MIN_PT = 18;

/** スクリプトが直接実行された時だけ true（import された時は false） */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(metaUrl)); } catch { return false; }
}

/** read_presentation などの結果を読む（{"content": {...}} でも中身だけでもよい） */
export function readJson(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  return j.content ?? j;
}

/** テンプレートを名前（templates/ 以下のフォルダ名）か template.json のパスで読む */
export function loadTemplate(ref = "navy") {
  const file = ref.endsWith(".json") ? path.resolve(ref) : path.join(SKILL_DIR, "templates", ref, "template.json");
  if (!fs.existsSync(file)) throw new Error(`テンプレート「${ref}」がありません（${file}）`);
  const tpl = JSON.parse(fs.readFileSync(file, "utf8"));
  return { colors: {}, ...tpl, file };
}

/** 色の名前（定義の colors）か "#RRGGBB" を "#RRGGBB" にする */
export const colorHex = (tpl, name) => tpl.colors?.[name] ?? name;

/** "#1D3461" や色の名前 → Slides の rgbColor（0〜1） */
export function rgb(tpl, name) {
  const hex = colorHex(tpl, name).replace("#", "");
  const n = (i) => Math.round((parseInt(hex.slice(i, i + 2), 16) / 255) * 1e4) / 1e4;
  return { red: n(0), green: n(2), blue: n(4) };
}

/** 背景が暗いか（相対輝度が 0.4 未満）。仮置きの枠の色を、背景に負けない側に切り替えるのに使う */
export function isDark(tpl, name) {
  const { red, green, blue } = rgb(tpl, name);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(red) + 0.7152 * lin(green) + 0.0722 * lin(blue) < 0.4;
}

/** 仮置きの枠の文字と線の色（背景の明暗で切り替える） */
export function todoColor(tpl, layout) {
  const t = tpl.todoFrame ?? {};
  return colorHex(tpl, isDark(tpl, layout.background) ? t.colorOnDark ?? "#FFFFFF" : t.color ?? "#5A6372");
}

/**
 * レイアウトの各スロット（title / body / source …）が、Slides のどのプレースホルダか。
 * Slides は .pptx の idx を引き継がず、同じ種類の中の並び順で index を振り直す。
 * そのため boxes の並び順から { type, index } を決める（外から与えるテンプレートは、読み出した index を ph_index に持つ）。
 */
export function placeholderKeys(layout) {
  const seen = {};
  const out = {};
  for (const [slot, box] of Object.entries(layout.boxes)) {
    const index = box.ph_index ?? seen[box.ph] ?? 0;
    seen[box.ph] = (seen[box.ph] ?? 0) + 1;
    out[slot] = { type: box.ph, index };
  }
  return out;
}

/** event.md の `最小文字:`（"18pt"）を数にする。無ければ null */
export function minFontPt(event) {
  const m = String(event?.values?.["最小文字"] ?? "").match(/(\d+(?:\.\d+)?)\s*pt/i);
  return m ? Number(m[1]) : null;
}

/** 点検に使う最小文字。event.md に無ければ既定の値を使い、そのことを note に書く */
export function minFont(event) {
  const pt = minFontPt(event);
  return pt ? { pt, note: `${pt}pt（event.md）` } : { pt: DEFAULT_MIN_PT, note: `${DEFAULT_MIN_PT}pt（event.md に無いので既定）` };
}

/** 画面に出す文字から AI の印を外す */
export const clean = (s) => String(s ?? "").replaceAll(PROVISIONAL, "").trim();

/** `見せる:` を、画像（パスあり）か、著者が後で入れる物の説明（パスなし）に分ける。Slides に入らない形式は仮置きの枠にする */
export function visualOf(slide) {
  const v = slide.fields["見せる"];
  if (!v) return null;
  const m = v.match(IMAGE_PATH);
  if (!m) return { kind: "todo", text: v };
  if (!SLIDES_IMAGE.test(m[1])) return { kind: "todo", text: `PNG にして差し替える: ${m[1]}`, unsupported: m[1] };
  return { kind: "image", path: m[1], note: v };
}

/** 役割と中身（本文・見せる の有無）から、使うレイアウトの名前を決める */
export function resolveLayout(tpl, slide) {
  const role = slide.fields["役割"];
  const entry = tpl.roles[role] ?? tpl.roles["主張"];
  if (typeof entry === "string") return entry;
  const hasBody = slide.body.length > 0;
  const hasVisual = Boolean(slide.fields["見せる"]);
  if (hasBody && hasVisual) return entry.both;
  if (hasVisual) return entry.visual;
  return entry.text;
}

/**
 * deck.md の1枚を、テンプレートの上の組み立て図にする。
 * 戻り値: { index, heading, layoutName, layout, slots: [{slot, box, key, paras}], visual, frame, notes, issues }
 */
export function slideModel(tpl, slide) {
  const issues = [];
  const layoutName = resolveLayout(tpl, slide);
  const layout = tpl.layouts[layoutName];
  if (!layout) throw new Error(`テンプレート ${tpl.id} にレイアウト「${layoutName}」がありません`);
  const keys = placeholderKeys(layout);
  const title = clean(deckLib.screenTitle(slide));
  const source = clean(slide.fields["出典"]);
  const texts = {
    title: title ? title.split("／").map((t) => t.trim()).filter(Boolean) : [],
    body: slide.body.map(clean).filter(Boolean),
    source: source ? [source] : [],
  };
  // 見出しの枠が無いレイアウト（大きな一文など）では、本文が空なら画面の見出しを本文の枠に出す
  if (!layout.boxes.title && layout.boxes.body && texts.title.length && !texts.body.length) {
    texts.body = texts.title;
    texts.title = [];
  }
  for (const [slot, paras] of Object.entries(texts)) {
    if (paras.length && !layout.boxes[slot]) issues.push(`${slotLabel(slot)}を置く枠がレイアウト「${layoutName}」にありません`);
  }
  const slots = Object.entries(layout.boxes).map(([slot, box]) => ({ slot, box, key: keys[slot], paras: texts[slot] ?? [] }));
  const visual = visualOf(slide);
  if (visual?.unsupported) issues.push(`見せる: の ${visual.unsupported} は Google スライドに入らない形式。PNG にする`);
  let frame = null;
  if (visual) {
    frame = !texts.source.length && layout.frameNoSource ? layout.frameNoSource : layout.frame;
    if (!frame) issues.push(`見せる: を置く枠がレイアウト「${layoutName}」にありません`);
  }
  return {
    index: slide.index,
    heading: slide.heading,
    provisional: slide.provisional,
    layoutName,
    layout,
    slots,
    visual,
    frame,
    notes: slide.lines,
    issues,
  };
}

export function slotLabel(slot) {
  return { title: "見出し", body: "本文", source: "出典" }[slot] ?? slot;
}

/** deck.md を読んで、全スライドの組み立て図を返す */
export function deckModels(tpl, deckPath) {
  const deck = deckLib.parseDeck(fs.readFileSync(deckPath, "utf8"));
  return { title: deck.title, event: deckLib.readEvent(deckPath), models: deck.slides.map((s) => slideModel(tpl, s)) };
}

/** 定義の中で、文字の箱と画像の枠が重なる所（同じレイアウトで両方を使うと、組んだスライドで重なる） */
export function layoutOverlaps(tpl) {
  const out = [];
  const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.01 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.01;
  for (const [name, L] of Object.entries(tpl.layouts)) {
    const boxes = Object.entries(L.boxes).map(([k, b]) => [slotLabel(k), b]);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (hit(boxes[i][1], boxes[j][1])) out.push(`「${name}」の${boxes[i][0]}と${boxes[j][0]}が重なる`);
    }
    // 出典が無い時の広い枠（frameNoSource）は出典の箱と重なってよい
    for (const [key, label] of [["frame", "画像の枠"], ["frameNoSource", "出典が無い時の画像の枠"]]) {
      if (!L[key]) continue;
      for (const [slot, b] of Object.entries(L.boxes)) {
        if (key === "frameNoSource" && slot === "source") continue;
        if (hit(L[key], b)) out.push(`「${name}」の${label}と${slotLabel(slot)}が重なる`);
      }
    }
  }
  return out;
}

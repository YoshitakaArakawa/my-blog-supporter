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

// `見せる:` の値から画像のパスを拾う（render-deck.mjs と同じ規則）
const IMAGE_PATH = /([^\s（(、,]+\.(?:png|jpe?g|gif))/i;

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

/** 画面に出す文字から AI の印を外す */
export const clean = (s) => String(s ?? "").replaceAll(PROVISIONAL, "").trim();

/** `見せる:` を、画像（パスあり）か、著者が後で入れる物の説明（パスなし）に分ける */
export function visualOf(slide) {
  const v = slide.fields["見せる"];
  if (!v) return null;
  const m = v.match(IMAGE_PATH);
  return m ? { kind: "image", path: m[1], note: v } : { kind: "todo", text: v };
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
  for (const [slot, paras] of Object.entries(texts)) {
    if (paras.length && !layout.boxes[slot]) issues.push(`${slotLabel(slot)}を置く枠がレイアウト「${layoutName}」にありません`);
  }
  const slots = Object.entries(layout.boxes).map(([slot, box]) => ({ slot, box, key: keys[slot], paras: texts[slot] ?? [] }));
  const visual = visualOf(slide);
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

/** 台詞をスピーカーノートの文字にする（印は残す。メモ: と 反応: は入れない） */
export function notesText(lines) {
  return lines.map((l) => (l.mark === "著者" ? "（著者）" : l.mark === "仮" ? "（仮）" : "") + l.text).join("\n");
}

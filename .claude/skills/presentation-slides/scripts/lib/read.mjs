/**
 * read.mjs — read_presentation の結果（デッキの読み出し）を解く共通部品
 *
 * 点検（check-slides）・取り込み（pull-slides）・同期（sync-template）・登録（import-template）・組上（build-slides）が使う。
 * 書式は継承（スライド → レイアウト → マスター）をたどり、最初に見つかる値を使う。
 */
import { EMU_PER_IN } from "./template.mjs";

/** プレースホルダの種類と番号を1つの鍵にする */
export const keyOf = (ph) => `${ph.type}#${ph.index ?? 0}`;

/** 図形の文字（自動の文字を含む） */
export const textOf = (shape) => (shape?.text?.textElements ?? []).map((e) => e.textRun?.content ?? e.autoText?.content ?? "").join("");

/** 段落ごとの文字（空の段落は除く） */
export const parasOf = (shape) => textOf(shape).replace(/\n$/, "").split("\n").map((s) => s.trim()).filter(Boolean);

/** 仮置きの枠か（組上は objectId を _todo で終え、.pptx の経路は代替テキストに「仮置きの枠」と書く） */
export const isTodo = (el) => el.objectId.endsWith("_todo") || el.description === "仮置きの枠" || el.title === "仮置きの枠";

/** 要素の実際の位置と大きさ（inch）。size × scale + translate */
export function geom(el) {
  if (!el?.size || !el?.transform) return null;
  const t = el.transform;
  return {
    x: (t.translateX ?? 0) / EMU_PER_IN, y: (t.translateY ?? 0) / EMU_PER_IN,
    w: (el.size.width.magnitude * (t.scaleX ?? 1)) / EMU_PER_IN, h: (el.size.height.magnitude * (t.scaleY ?? 1)) / EMU_PER_IN,
  };
}

/** いまの日時（JST）を "yyyymmdd HH:MM JST" にする */
export function jstStamp(now = Date.now()) {
  const s = new Date(now + 9 * 3600e3).toISOString();
  return `${s.slice(0, 10).replace(/-/g, "")} ${s.slice(11, 16)} JST`;
}

/**
 * 継承を解く道具。read はマスクなしの読み出し。
 *   chain(el): その要素から親（レイアウト・マスターのプレースホルダ）へたどった列
 *   run(el) / para(el): その要素が持つ文字と段落の書式（無ければ {}）。文字の書式は箇条の既定（lists）も見る
 *   first(els, get): 列の中で最初に見つかる値
 *   hex(color, masterId): rgbColor か、マスターの配色のテーマの色を "#rrggbb" にする
 */
export function resolver(read) {
  const byId = new Map();
  for (const p of [...(read.masters ?? []), ...(read.layouts ?? []), ...(read.slides ?? [])]) for (const e of p.pageElements ?? []) byId.set(e.objectId, e);
  const themes = new Map();
  for (const m of read.masters ?? []) for (const c of m.pageProperties?.colorScheme?.colors ?? []) themes.set(`${m.objectId}:${c.type}`, c.color);
  const chain = (el) => { const out = []; let cur = el; while (cur) { out.push(cur); const pid = cur.shape?.placeholder?.parentObjectId; cur = pid ? byId.get(pid) : null; } return out; };
  const visibleRun = (e) => (e.shape?.text?.textElements ?? []).find((x) => x.textRun && x.textRun.content.trim())?.textRun?.style;
  const anyRun = (e) => (e.shape?.text?.textElements ?? []).find((x) => x.textRun)?.textRun?.style;
  const run = (e) => ({ ...(e.shape?.text?.lists?.bodyPlaceholderListEntity?.nestingLevel?.["0"]?.bulletStyle ?? {}), ...(visibleRun(e) ?? anyRun(e) ?? {}) });
  const para = (e) => (e.shape?.text?.textElements ?? []).find((x) => x.paragraphMarker)?.paragraphMarker?.style ?? {};
  const first = (els, get) => { for (const e of els) { const v = get(e); if (v !== undefined && v !== null) return v; } return undefined; };
  const hex = (c, masterId) => {
    const o = c?.opaqueColor ?? c;
    const v = o?.rgbColor ?? (o?.themeColor ? themes.get(`${masterId}:${o.themeColor}`) : null);
    if (!v) return null;
    const h = (x) => Math.round((x ?? 0) * 255).toString(16).padStart(2, "0");
    return `#${h(v.red)}${h(v.green)}${h(v.blue)}`.toUpperCase();
  };
  return { byId, chain, run, para, first, hex };
}

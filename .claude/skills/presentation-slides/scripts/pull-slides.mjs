#!/usr/bin/env node
/**
 * pull-slides.mjs — 組んだ後に著者が Slides で直した版を、deck.md と同じ書式の deck_user.md に取り込む
 *
 * Slides の並びのまま、見出し・本文・出典・スピーカーノート（台詞）を読む。
 * deck.md にしかない項目（段・役割・見せる・秒・核・反応・メモ）は、slides.json のスライドの ID で deck.md から戻す。
 * Slides で変わっていない文字には、deck.md の印（見出しと台詞の （仮））を戻す。変わった文字は Slides のとおりに書く。
 * 追加・削除・並べ替え・レイアウトの変更・プレースホルダの外の文字・印の無い台詞は、冒頭の ℹ️ メモに書く。
 *
 * 使い方:
 *   node pull-slides.mjs <deck.md> --read <デッキの読み出し.json> [--slides <slides.json>] [--template navy] [--out <deck_user.md>]
 *
 * --read はマスクなしの read_presentation の結果。--slides の既定は deck.md と同じ階層の slides.json。
 * 既定の出力は deck.md と同じ階層の deck_user.md（上書き）。deck.md は書き換えない。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadTemplate, readJson, isMain, deckLib, clean, AUTO_PLACEHOLDERS, PROVISIONAL } from "./lib/template.mjs";

const TITLE_TYPES = new Set(["TITLE", "CENTERED_TITLE"]);
const BODY_TYPES = new Set(["BODY", "SUBTITLE"]);
const textOf = (shape) => (shape?.text?.textElements ?? []).map((e) => e.textRun?.content ?? e.autoText?.content ?? "").join("");
const parasOf = (shape) => textOf(shape).replace(/\n$/, "").split("\n").map((s) => s.trim()).filter(Boolean);
const isTodo = (el) => el.objectId.endsWith("_todo") || el.description === "仮置きの枠" || el.title === "仮置きの枠";

/** 台詞の1行を { mark, text } にする（deck.mjs と同じ印） */
function parseLine(raw) {
  const t = raw.trim();
  if (t.startsWith(deckLib.AUTHOR)) return { mark: "著者", text: t.slice(deckLib.AUTHOR.length).trim() };
  if (t.startsWith(PROVISIONAL)) return { mark: "仮", text: t.slice(PROVISIONAL.length).trim() };
  return { mark: null, text: t };
}
const markOf = (l) => (l.mark === "著者" ? deckLib.AUTHOR : l.mark === "仮" ? PROVISIONAL : "");

/** Slides の1枚から、見出し・本文・出典・台詞・その他の文字を読む */
function readSlide(s, rec, tpl) {
  const els = s.pageElements ?? [];
  const byId = new Map(els.map((e) => [e.objectId, e]));
  const phs = els.filter((e) => e.shape?.placeholder && !AUTO_PLACEHOLDERS.has(e.shape.placeholder.type));
  const pick = (id, test) => (id && byId.get(id)) || phs.find(test);
  const title = pick(rec?.objects?.title, (e) => TITLE_TYPES.has(e.shape.placeholder.type));
  const sourceIndex = rec && tpl.layouts[rec.layout]?.boxes?.source?.ph_index;
  const source = pick(rec?.objects?.source, (e) => rec?.objects?.source && e.shape.placeholder.type === "BODY" && (e.shape.placeholder.index ?? 0) === (sourceIndex ?? 1));
  const body = pick(rec?.objects?.body, (e) => BODY_TYPES.has(e.shape.placeholder.type) && e !== source);
  const used = new Set([title, body, source].filter(Boolean));
  const stray = els.filter((e) => e.shape && !used.has(e) && !isTodo(e) && !AUTO_PLACEHOLDERS.has(e.shape.placeholder?.type) && textOf(e.shape).trim())
    .map((e) => textOf(e.shape).trim().replace(/\s+/g, " ").slice(0, 40));
  const notesId = s.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
  const notesEl = (s.slideProperties?.notesPage?.pageElements ?? []).find((e) => e.objectId === notesId);
  return {
    title: title ? parasOf(title.shape) : [],
    body: body ? parasOf(body.shape) : [],
    source: source ? parasOf(source.shape).join(" ") : "",
    lines: parasOf(notesEl?.shape).map(parseLine),
    stray,
    todo: els.some(isTodo),
    images: els.filter((e) => e.image).length,
  };
}

/** deck.md の1枚と Slides の1枚から、deck_user.md の1枚を作る。notes に気づきを足す */
function mergeSlide(orig, got, label, notes) {
  const fields = { ...orig.fields };
  let heading = orig.heading;
  let provisional = orig.provisional;
  // 画面の見出し: `画面:` が無い時は `##` がそのまま画面に出ているので、`##` を直す。ある時は `画面:` を直す
  const shownBefore = clean(deckLib.screenTitle(orig)).split("／").map((t) => t.trim()).filter(Boolean).join("／");
  const shownNow = got.title.join("／");
  if (shownNow !== shownBefore) {
    if (orig.fields["画面"] === undefined) {
      if (shownNow) { heading = shownNow; provisional = false; } else fields["画面"] = "なし";
      notes.push(`${label}: 見出しが Slides で変わった`);
    } else {
      fields["画面"] = shownNow || "なし";
      notes.push(`${label}: 画面の見出しが Slides で変わった（\`##\` の主張は deck.md のまま）`);
    }
  }
  const bodyBefore = orig.body.map(clean).filter(Boolean);
  const body = got.body.join("\n") === bodyBefore.join("\n") ? orig.body : got.body;
  if (body !== orig.body) notes.push(`${label}: 本文が Slides で変わった`);
  const sourceBefore = clean(orig.fields["出典"]);
  if (got.source !== sourceBefore) {
    if (got.source) fields["出典"] = got.source; else delete fields["出典"];
    notes.push(`${label}: 出典が Slides で変わった`);
  }
  // 台詞: deck.md と同じ行（印と文字）はそのまま。変わった行・足された行は Slides のとおり（印も Slides のとおり）
  const before = new Set(orig.lines.map((l) => markOf(l) + l.text));
  const lines = got.lines;
  const changed = lines.filter((l) => !before.has(markOf(l) + l.text));
  if (changed.length || lines.length !== orig.lines.length) notes.push(`${label}: 台詞が Slides で変わった（${changed.length}行）`);
  const unmarked = lines.filter((l) => !l.mark).length;
  if (unmarked) notes.push(`${label}: 印の無い台詞 ${unmarked}行。著者の言葉なら （著者）、AI の言い回しなら （仮） を付ける`);
  if (changed.some((l) => l.mark === "仮")) notes.push(`${label}: Slides で直された （仮） の台詞がある。著者の言葉として採るなら （著者） に替える`);
  return { heading, provisional, fields, body, lines };
}

/** deck.md の書式で1枚を書く */
function slideMd(s) {
  const out = [`## ${s.heading}${s.provisional ? PROVISIONAL : ""}`];
  for (const k of deckLib.FIELDS) {
    if (k === "本文") { if (s.body.length) out.push("本文:", ...s.body.map((b) => `- ${b}`)); continue; }
    if (s.fields[k] !== undefined && s.fields[k] !== "") out.push(`${k}: ${s.fields[k]}`);
  }
  if (s.lines.length) out.push("", ...s.lines.map((l) => `> ${markOf(l)}${l.text}`));
  return out.join("\n");
}

export function pull(deckText, read, slidesJson, tpl) {
  const deck = deckLib.parseDeck(deckText);
  const notes = [];
  const recById = new Map((slidesJson.slides ?? []).map((r) => [r.slideId, r]));
  const origByIndex = new Map(deck.slides.map((s) => [s.index, s]));
  // レイアウト → 役割の逆引き（追加されたスライドの役割の案）
  const roleOf = new Map();
  for (const [role, v] of Object.entries(tpl.roles ?? {})) for (const name of typeof v === "string" ? [v] : Object.values(v)) if (!roleOf.has(name)) roleOf.set(name, role);
  const layoutName = new Map((read.layouts ?? []).map((l) => [l.objectId, l.layoutProperties?.name]));
  const out = [];
  const seen = new Set();
  let prevIndex = 0;
  let reordered = false;
  (read.slides ?? []).forEach((s, k) => {
    const rec = recById.get(s.objectId);
    const layout = layoutName.get(s.slideProperties?.layoutObjectId) ?? "?";
    const got = readSlide(s, rec, tpl);
    const label = `Slides の ${k + 1}枚目`;
    for (const t of got.stray) notes.push(`${label}: プレースホルダの外の文字（取り込まない）「${t}」`);
    const orig = rec ? origByIndex.get(rec.deckIndex) : null;
    if (!orig) {
      const heading = got.title.join("／") || got.body[0] || "（見出しなし）";
      notes.push(`${label}: Slides で足されたスライド「${heading}」。段・秒・核は未記入`);
      out.push({ heading, provisional: false, fields: { 役割: roleOf.get(layout) ?? "" }, body: got.title.length ? got.body : got.body.slice(1), lines: got.lines });
      for (const l of got.lines) if (!l.mark) { notes.push(`${label}: 印の無い台詞 ${got.lines.filter((x) => !x.mark).length}行。著者の言葉なら （著者）、AI の言い回しなら （仮） を付ける`); break; }
      return;
    }
    seen.add(rec.deckIndex);
    if (rec.deckIndex < prevIndex) reordered = true;
    prevIndex = rec.deckIndex;
    if (layout !== rec.layout) notes.push(`${label}（deck.md の ${rec.deckIndex}枚目）: レイアウトが「${rec.layout}」から「${layout}」に変わった（役割は deck.md のまま）`);
    if (rec.objects?.todo && !got.todo) notes.push(`${label}（deck.md の ${rec.deckIndex}枚目）: 仮置きの枠が無くなった${got.images ? "（画像が入った）" : ""}。見せる: は deck.md のまま`);
    out.push(mergeSlide(orig, got, `${label}（deck.md の ${rec.deckIndex}枚目）`, notes));
  });
  for (const s of deck.slides) if (!seen.has(s.index) && (slidesJson.slides ?? []).some((r) => r.deckIndex === s.index)) notes.push(`deck.md の ${s.index}枚目「${s.heading}」は Slides で消された`);
  if (reordered) notes.unshift("スライドの並びが Slides で変わった（deck_user.md は Slides の並び）");
  const sha = crypto.createHash("sha1").update(deckText).digest("hex");
  if (slidesJson.deckSha1 && slidesJson.deckSha1 !== sha) notes.unshift("deck.md は組んだ後に変わっている。deck.md 側の直しは、この取り込みでは deck.md の項目（段・役割・秒など）にだけ効く");

  // deck.md の冒頭（`# デッキ:` から最初の `##` の前まで）は、そのまま引き継ぐ
  const rows = deckText.split(/\r?\n/);
  const first = rows.findIndex((r) => /^##\s/.test(r));
  const head = (first >= 0 ? rows.slice(0, first) : rows).join("\n").trimEnd();
  const jst = new Date(Date.now() + 9 * 3600e3).toISOString();
  const stamp = `${jst.slice(0, 10).replace(/-/g, "")} ${jst.slice(11, 16)} JST`;
  const unchanged = read.revisionId === slidesJson.revisionId;
  const memo = [
    `> ℹ️ 取り込み: ${stamp}、Slides（revision ${read.revisionId}）から pull-slides.mjs で作った。組んだ後は Slides が正で、このファイルは手で直さない`,
    ...(unchanged ? ["> ℹ️ 組んだ時から Slides は変わっていない"] : notes.map((n) => `> ℹ️ ${n}`)),
  ];
  const md = `${head}\n\n${memo.join("\n")}\n\n${out.map(slideMd).join("\n\n")}\n`;
  return { md, notes, slides: out.length, unchanged };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const deckPath = args.find((a) => a.endsWith(".md") && !args[args.indexOf(a) - 1]?.startsWith("--"));
  if (!deckPath || !opt("--read")) { console.error("usage: node pull-slides.mjs <deck.md> --read <read.json> [--slides <slides.json>] [--template navy] [--out <deck_user.md>]"); process.exit(2); }
  const dir = path.dirname(path.resolve(deckPath));
  const slidesPath = opt("--slides") ?? path.join(dir, "slides.json");
  if (!fs.existsSync(slidesPath)) { console.error(`slides.json がありません: ${slidesPath}（組んだ時に build-slides.mjs record で作る）`); process.exit(2); }
  const slidesJson = JSON.parse(fs.readFileSync(slidesPath, "utf8"));
  const read = readJson(opt("--read"));
  if (slidesJson.presentationId && read.presentationId && slidesJson.presentationId !== read.presentationId) {
    console.error(`読み出しのデッキ（${read.presentationId}）が slides.json のデッキ（${slidesJson.presentationId}）と違います`);
    process.exit(2);
  }
  const tpl = loadTemplate(opt("--template") ?? slidesJson.template ?? "navy");
  const r = pull(fs.readFileSync(path.resolve(deckPath), "utf8"), read, slidesJson, tpl);
  const out = path.resolve(opt("--out") ?? path.join(dir, "deck_user.md"));
  fs.writeFileSync(out, r.md);
  console.error(`deck_user.md を書きました: ${out}（${r.slides}枚${r.unchanged ? "。組んだ時から変わっていない" : ""}）`);
  for (const n of r.notes) console.error(`- ${n}`);
}

if (isMain(import.meta.url)) main();

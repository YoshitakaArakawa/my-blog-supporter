#!/usr/bin/env node
/**
 * pull-slides.mjs — 組んだ後に著者が Slides で直した版を、deck.md と同じ書式の deck_user.md に取り込む
 *
 * Slides の並びのまま、画面の文字（見出し・本文・出典）を読む。スピーカーノートは読まない。
 * 画面に出ない項目（段・伝える・役割・見せる・秒・核・反応・メモ）と台詞は、slides.json の対応で deck.md から戻す。
 * 対応は、組んだ時の番号と見出しの両方で確かめ、組んだ後に deck.md の並びが変わっていたら見出しで引き直す。引けない時は混ぜない。
 * Slides で変わっていない文字には、deck.md の印（見出しの （仮））を戻す。変わった文字は Slides のとおりに書く。
 * 気づき（並べ替え・追加・削除・レイアウトの変更・仮置きの枠への画像・プレースホルダの外の文字・deck.md との食い違い）は、冒頭の ℹ️ メモに書く。
 *
 * 使い方:
 *   node pull-slides.mjs <deck.md> --read <デッキの読み出し.json> [--slides <slides.json>] [--template navy] [--out <deck_user.md>]
 *
 * --read はマスクなしの read_presentation の結果で、slides.json と同じデッキ（自分で組んだ複製）のもの。全体デッキからは取り込まない。
 * --slides の既定は deck.md と同じ階層の slides.json。既定の出力は deck.md と同じ階層の deck_user.md（上書き）。deck.md は書き換えない。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadTemplate, readJson, isMain, deckLib, clean, placeholderKeys, AUTO_PLACEHOLDERS, PROVISIONAL } from "./lib/template.mjs";
import { keyOf, textOf, parasOf, isTodo, jstStamp } from "./lib/read.mjs";

const TITLE_TYPES = new Set(["TITLE", "CENTERED_TITLE"]);
const BODY_TYPES = new Set(["BODY", "SUBTITLE"]);
const markOf = (l) => (l.mark === "著者" ? deckLib.AUTHOR : l.mark === "仮" ? PROVISIONAL : "");
const norm = (s) => clean(s).replace(/[／\s]/g, "");

/** Slides の1枚から、見出し・本文・出典・その他の文字を読む */
function readSlide(s, rec, tpl, layoutName) {
  const els = s.pageElements ?? [];
  const byId = new Map(els.map((e) => [e.objectId, e]));
  const phs = els.filter((e) => e.shape?.placeholder && !AUTO_PLACEHOLDERS.has(e.shape.placeholder.type));
  // 出典の枠は、記録の ID か、定義のレイアウトの source の鍵で見つける
  const def = tpl.layouts[rec?.layout ?? layoutName];
  const sourceKey = def?.boxes?.source ? keyOf(placeholderKeys(def).source) : null;
  const pick = (id, test) => (id && byId.get(id)) || phs.find(test);
  const source = pick(rec?.objects?.source, (e) => sourceKey && keyOf(e.shape.placeholder) === sourceKey);
  const title = pick(rec?.objects?.title, (e) => TITLE_TYPES.has(e.shape.placeholder.type));
  const body = pick(rec?.objects?.body, (e) => BODY_TYPES.has(e.shape.placeholder.type) && e !== source);
  const used = new Set([title, body, source].filter(Boolean));
  const stray = els.filter((e) => e.shape && !used.has(e) && !isTodo(e) && !AUTO_PLACEHOLDERS.has(e.shape.placeholder?.type) && textOf(e.shape).trim())
    .map((e) => textOf(e.shape).trim().replace(/\s+/g, " ").slice(0, 40));
  return {
    title: title ? parasOf(title.shape) : [],
    body: body ? parasOf(body.shape) : [],
    source: source ? parasOf(source.shape).join(" ") : "",
    stray,
    todo: els.some(isTodo),
    images: els.filter((e) => e.image).length,
  };
}

/** deck.md の1枚と Slides の1枚から、deck_user.md の1枚を作る。notes に気づきを足す */
function mergeSlide(orig, got, label, notes, diff) {
  const fields = { ...orig.fields };
  let heading = orig.heading;
  let provisional = orig.provisional;
  // 画面の見出し: `画面:` が無い時は `##` がそのまま画面に出ているので、`##` を直す。ある時は `画面:` を直す
  const shownBefore = clean(deckLib.screenTitle(orig)).split("／").map((t) => t.trim()).filter(Boolean).join("／");
  const shownNow = got.title.join("／");
  const bodyBefore = orig.body.map(clean).filter(Boolean);
  // 見出しの枠が無いレイアウト（大きな一文）では、画面の見出しが本文の枠に出ている
  const titleInBody = !got.title.length && !bodyBefore.length && shownBefore && got.body.length;
  const titleNow = titleInBody ? got.body.join("／") : shownNow;
  if (titleNow !== shownBefore) {
    if (orig.fields["画面"] === undefined) {
      if (titleNow) { heading = titleNow; provisional = false; } else fields["画面"] = "なし";
      notes.push(`${label}: 見出しが${diff}`);
    } else {
      fields["画面"] = titleNow || "なし";
      notes.push(`${label}: 画面の見出しが${diff}（\`##\` の主張は deck.md のまま）`);
    }
  }
  const bodyNow = titleInBody ? [] : got.body;
  const body = bodyNow.join("\n") === bodyBefore.join("\n") ? orig.body : bodyNow;
  if (body !== orig.body) notes.push(`${label}: 本文が${diff}`);
  const sourceBefore = clean(orig.fields["出典"]);
  if (got.source !== sourceBefore) {
    if (got.source) fields["出典"] = got.source; else delete fields["出典"];
    notes.push(`${label}: 出典が${diff}`);
  }
  return { heading, provisional, fields, convey: orig.convey ?? [], body, lines: orig.lines };
}

/** deck.md の書式で1枚を書く */
function slideMd(s) {
  const out = [`## ${s.heading}${s.provisional ? PROVISIONAL : ""}`];
  // 箇条書きで書く項目と、parseDeck がその箇条を置く所
  const lists = { 伝える: s.convey ?? [], 本文: s.body };
  for (const k of deckLib.FIELDS) {
    if (lists[k]) { if (lists[k].length) out.push(`${k}:`, ...lists[k].map((b) => `- ${b}`)); continue; }
    if (s.fields[k] !== undefined && s.fields[k] !== "") out.push(`${k}: ${s.fields[k]}`);
  }
  if (s.lines.length) out.push("", ...s.lines.map((l) => `> ${markOf(l)}${l.text}`));
  return out.join("\n");
}

/** slides.json の1件を、いまの deck.md の1枚に対応させる。番号と見出しが合えばそれ、合わなければ見出しで引き直す */
function matchOrig(rec, deck, used) {
  const byIndex = deck.slides.find((s) => s.index === rec.deckIndex);
  if (byIndex && norm(byIndex.heading) === norm(rec.heading) && !used.has(byIndex)) return { orig: byIndex, moved: false };
  const same = deck.slides.filter((s) => norm(s.heading) === norm(rec.heading) && !used.has(s));
  if (same.length === 1) return { orig: same[0], moved: true };
  return { orig: null, moved: false };
}

export function pull(deckText, read, slidesJson, tpl) {
  const deck = deckLib.parseDeck(deckText);
  const notes = [];
  const sha = crypto.createHash("sha1").update(deckText).digest("hex");
  const deckChanged = Boolean(slidesJson.deckSha1 && slidesJson.deckSha1 !== sha);
  const unchanged = read.revisionId === slidesJson.revisionId;
  // deck.md が組んだ後に変わっていたら、食い違いが Slides の直しなのか deck.md の直しなのかは分からない
  const diff = deckChanged ? "、deck.md と Slides で違う（Slides のとおりにした）" : " Slides で変わった";
  const recById = new Map((slidesJson.slides ?? []).map((r) => [r.slideId, r]));
  // レイアウト → 役割の逆引き（足されたスライドの役割の案）
  const roleOf = new Map();
  for (const [role, v] of Object.entries(tpl.roles ?? {})) for (const name of typeof v === "string" ? [v] : Object.values(v)) if (!roleOf.has(name)) roleOf.set(name, role);
  const layoutName = new Map((read.layouts ?? []).map((l) => [l.objectId, l.layoutProperties?.name]));
  const out = [];
  const used = new Set();
  let prevIndex = 0;
  let reordered = false;
  (read.slides ?? []).forEach((s, k) => {
    const rec = recById.get(s.objectId);
    const layout = layoutName.get(s.slideProperties?.layoutObjectId) ?? "?";
    const got = readSlide(s, rec, tpl, layout);
    const label = `Slides の ${k + 1}枚目`;
    for (const t of got.stray) notes.push(`${label}: プレースホルダの外の文字（取り込まない）「${t}」`);
    const { orig, moved } = rec ? matchOrig(rec, deck, used) : { orig: null, moved: false };
    if (rec && !orig) notes.push(`${label}: 組んだ時の「${rec.heading}」が、いまの deck.md に見つからない。deck.md の項目は混ぜず、Slides の文字だけを取った`);
    if (!orig) {
      const heading = got.title.join("／") || got.body[0] || "（見出しなし）";
      if (!rec) notes.push(`${label}: Slides で足されたスライド「${heading}」。段・秒・核は未記入`);
      out.push({ heading, provisional: false, fields: { 役割: roleOf.get(layout) ?? "", ...(got.source ? { 出典: got.source } : {}) }, body: got.title.length ? got.body : got.body.slice(1), lines: [] });
      return;
    }
    used.add(orig);
    if (moved) notes.push(`${label}: 組んだ後に deck.md の並びが変わっていたので、見出しで deck.md の ${orig.index}枚目に対応させた`);
    if (orig.index < prevIndex) reordered = true;
    prevIndex = orig.index;
    const lab = `${label}（deck.md の ${orig.index}枚目）`;
    if (layout !== rec.layout) notes.push(`${lab}: レイアウトが「${rec.layout}」から「${layout}」に変わった（役割は deck.md のまま）`);
    if (rec.objects?.todo && !got.todo) notes.push(`${lab}: 仮置きの枠が無くなった${got.images ? "（画像が入った）" : ""}。見せる: は deck.md のまま`);
    out.push(mergeSlide(orig, got, lab, notes, diff));
  });
  for (const s of deck.slides) {
    if (used.has(s)) continue;
    const wasBuilt = (slidesJson.slides ?? []).some((r) => norm(r.heading) === norm(s.heading));
    notes.push(wasBuilt ? `deck.md の ${s.index}枚目「${s.heading}」は Slides で消された` : `deck.md の ${s.index}枚目「${s.heading}」は組んだ後に deck.md に足された（Slides に無い）`);
  }
  if (reordered) notes.unshift("スライドの並びが Slides で変わった（deck_user.md は Slides の並び）");
  if (deckChanged) notes.unshift("deck.md は組んだ後に変わっている。食い違いは「deck.md と Slides で違う」と書き、画面の文字は Slides のとおりにした");
  if (unchanged) notes.unshift("組んだ時から Slides は変わっていない");

  // deck.md の冒頭（`# デッキ:` から最初の `##` の前まで）は、そのまま引き継ぐ
  const rows = deckText.split(/\r?\n/);
  const first = rows.findIndex((r) => /^##\s/.test(r));
  const head = (first >= 0 ? rows.slice(0, first) : rows).join("\n").trimEnd();
  const memo = [`> ℹ️ 取り込み: ${jstStamp()}、Slides（revision ${read.revisionId}）から pull-slides.mjs で作った。組んだ後は Slides が正で、このファイルは手で直さない`, ...notes.map((n) => `> ℹ️ ${n}`)];
  const md = `${head}\n\n${memo.join("\n")}\n\n${out.map(slideMd).join("\n\n")}\n`;
  return { md, notes, slides: out.length, unchanged };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const deckPath = args.find((a, i) => a.endsWith(".md") && !args[i - 1]?.startsWith("--"));
  if (!deckPath || !opt("--read")) { console.error("usage: node pull-slides.mjs <deck.md> --read <read.json> [--slides <slides.json>] [--template navy] [--out <deck_user.md>]"); process.exit(2); }
  const dir = path.dirname(path.resolve(deckPath));
  const slidesPath = opt("--slides") ?? path.join(dir, "slides.json");
  if (!fs.existsSync(slidesPath)) { console.error(`slides.json がありません: ${slidesPath}（組んだ時に build-slides.mjs record で作る）`); process.exit(2); }
  const slidesJson = JSON.parse(fs.readFileSync(slidesPath, "utf8"));
  const read = readJson(opt("--read"));
  if (slidesJson.presentationId && read.presentationId && slidesJson.presentationId !== read.presentationId) {
    console.error(`読み出しのデッキ（${read.presentationId}）が slides.json のデッキ（${slidesJson.presentationId}）と違います。取り込みは自分で組んだデッキから行う`);
    process.exit(2);
  }
  const tpl = loadTemplate(opt("--template") ?? slidesJson.template ?? "navy");
  const r = pull(fs.readFileSync(path.resolve(deckPath), "utf8"), read, slidesJson, tpl);
  const out = path.resolve(opt("--out") ?? path.join(dir, "deck_user.md"));
  fs.writeFileSync(out, r.md);
  console.error(`deck_user.md を書きました: ${out}（${r.slides}枚）`);
  for (const n of r.notes) console.error(`- ${n}`);
}

if (isMain(import.meta.url)) main();

#!/usr/bin/env node
/**
 * lint-deck.mjs — 登壇の deck.md を機械で点検する（判定は警告で、ブロックしない）
 *
 * 書式の正本は .claude/skills/presentation-write/references/deck-spec.md、閾値の正本は
 * scripts/deck-lint.config.json。見るのは数えられることだけで、中身の良し悪しは review（audience・drift）が見る。
 *
 * 使い方:
 *   node scripts/lint-deck.mjs <deck.md> [--json]   レポートを出す
 *   node scripts/lint-deck.mjs --hook                PostToolUse hook（stdin に hook JSON）
 *
 * hook モードは、対象パス（config.targetPattern）の deck.md を書いた時だけレポートを
 * hookSpecificOutput.additionalContext として返し、それ以外は何も出さず exit 0 で終わる。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeck, readEvent, spokenChars, screenTitle } from "./lib/deck.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "deck-lint.config.json"), "utf8"));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// 読み上げの照合で無視する記号（句読点・括弧・空白）
const normalize = (s) => s.replace(/[\s、。，．,.!?！？「」『』（）()\/／・:：]/g, "");
const label = (s) => `s${String(s.index).padStart(2, "0")}「${s.heading.length > 24 ? s.heading.slice(0, 24) + "…" : s.heading}」`;

/** deck.md を点検し、{ ng, warn, info, stats } を返す */
export function lintDeck(file) {
  const text = fs.readFileSync(file, "utf8");
  const deck = parseDeck(text);
  const event = readEvent(file);
  const hasStoryline = fs.existsSync(path.join(path.dirname(file), "storyline.md"));
  const ng = [], warn = [], info = [];
  let totalSec = 0;
  let provisionalTitles = 0, provisionalLines = 0, unmarkedLines = 0;

  if (!deck.slides.length) ng.push("スライドが1枚もありません（`## ` で始まる見出しが無い）");

  for (const s of deck.slides) {
    const f = s.fields;
    const role = f["役割"];
    const structural = CONFIG.structuralRoles.includes(role);

    // 必須の項目
    if (!role) ng.push(`${label(s)} 役割: がありません`);
    else if (!CONFIG.roles.includes(role)) warn.push(`${label(s)} 役割「${role}」は語彙にありません（${CONFIG.roles.join("・")}）`);
    const sec = f["秒"] !== undefined ? Number(String(f["秒"]).replace(/[^\d.]/g, "")) : NaN;
    if (Number.isNaN(sec)) ng.push(`${label(s)} 秒: がありません（または数字でない）`);
    else totalSec += sec;
    if (!structural) {
      const rows = (f["核"] ?? "").split(/[・、,，\s]+/).filter(Boolean);
      if (!rows.length) warn.push(`${label(s)} 核: がありません（構造のスライド以外は、効く core.md の行を添える）`);
      else for (const r of rows) if (!CONFIG.coreRows.includes(r)) warn.push(`${label(s)} 核「${r}」は core.md の行名ではありません（${CONFIG.coreRows.join("・")}）`);
    }
    if (hasStoryline && !f["段"]) warn.push(`${label(s)} 段: がありません（storyline.md の段の番号）`);

    // 見出しの長さ（画面に出す見出しで数える。改行の ／ は数えない）
    const title = screenTitle(s).replace(/[／\s]/g, "");
    if (title.length > CONFIG.titleCharsMax) warn.push(`${label(s)} 画面の見出しが ${title.length}字（上限 ${CONFIG.titleCharsMax}字）`);

    // 台詞の時間の見積もり（上限寄りの目安。短い分には警告しない）
    const chars = spokenChars(s.lines);
    if (!Number.isNaN(sec) && chars) {
      const est = Math.round((chars / CONFIG.charsPerMinute) * 60);
      if (est > sec * (1 + CONFIG.scriptOverTolerance)) warn.push(`${label(s)} 台詞の見積もり ${est}秒 > 秒: ${sec}（台詞 ${chars}字 ÷ ${CONFIG.charsPerMinute}字/分）`);
    }

    // 画面の文の読み上げ（長い文だけ。短い語はキーワードとして画面に出してよい）
    const spoken = normalize(s.lines.map((l) => l.text).join(""));
    const screenTexts = [screenTitle(s), ...s.body].flatMap((t) => t.split("／")).map(normalize).filter((t) => t.length >= CONFIG.redundantMinChars);
    for (const t of screenTexts) if (spoken.includes(t)) info.push(`${label(s)} 画面の文を台詞がそのまま読み上げています:「${t.slice(0, 30)}」`);

    // 印
    if (s.provisional) provisionalTitles++;
    for (const l of s.lines) {
      if (l.mark === "仮") provisionalLines++;
      if (!l.mark) unmarkedLines++;
    }
    if (s.lines.some((l) => !l.mark)) warn.push(`${label(s)} 印の無い台詞があります（著者の言葉は（著者）、AI の言い回しは（仮））`);
  }

  // 持ち時間
  if (event?.seconds) {
    if (totalSec > event.seconds) ng.push(`秒: の合計 ${totalSec}秒が持ち時間 ${event.seconds}秒（event.md の 時間:）を超えています`);
  } else {
    info.push("持ち時間が分からないので、秒: の合計と比べていません（event.md の 時間: を書く）");
  }
  if (provisionalTitles || provisionalLines) info.push(`（仮）の残り: 見出し ${provisionalTitles} / 台詞 ${provisionalLines}`);

  const stats = { slides: deck.slides.length, totalSec, limitSec: event?.seconds ?? null, provisionalTitles, provisionalLines, unmarkedLines };
  return { ng, warn, info, stats };
}

function report(file, r, maxLines = Infinity) {
  const s = r.stats;
  const head = `[deck lint] ${rel(file)}\n${s.slides}枚 / 秒: の合計 ${s.totalSec}秒${s.limitSec ? ` / 持ち時間 ${s.limitSec}秒` : ""}`;
  const out = [head];
  const push = (name, list) => { if (list.length) out.push(`${name} ${list.length}:`, ...list.map((m) => `- ${m}`)); };
  push("NG", r.ng);
  push("注意", r.warn);
  push("参考", r.info);
  if (!r.ng.length && !r.warn.length) out.push("NG・注意なし");
  const lines = out.join("\n").split("\n");
  return lines.length > maxLines ? [...lines.slice(0, maxLines), `…ほか ${lines.length - maxLines}行（node scripts/lint-deck.mjs ${rel(file)} で全文）`].join("\n") : lines.join("\n");
}

function hook() {
  let file;
  try { file = JSON.parse(fs.readFileSync(0, "utf8"))?.tool_input?.file_path; } catch { return; }
  if (!file) return;
  const abs = path.resolve(file);
  if (!new RegExp(CONFIG.targetPattern).test(rel(abs)) || !fs.existsSync(abs)) return;
  let msg;
  try { msg = `${report(abs, lintDeck(abs), CONFIG.hookReportMaxLines)}`; } catch (e) { msg = `[deck lint] 実行に失敗: ${e.message}`; }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--hook")) { hook(); return; }
  const files = args.filter((a) => !a.startsWith("--"));
  if (files.length !== 1) { console.error("usage: node scripts/lint-deck.mjs <deck.md> [--json]"); process.exit(1); }
  const file = path.resolve(files[0]);
  if (!fs.existsSync(file)) { console.error(`not found: ${file}`); process.exit(1); }
  const r = lintDeck(file);
  console.log(args.includes("--json") ? JSON.stringify(r, null, 2) : report(file, r));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

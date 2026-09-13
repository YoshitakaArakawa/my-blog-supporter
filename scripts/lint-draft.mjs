#!/usr/bin/env node
/**
 * lint-draft.mjs — 記事ドラフトの機械ゲート
 *
 * voice-style.md「0. 数値仕様」の閾値と禁止句（scripts/draft-lint.config.json）を数え、
 * 併せて textlint（.textlintrc.json）を走らせて、1つの Markdown レポートにまとめる。
 * LLM の自己申告チェックリストでは縮まなかった指標（分量・段落文数・「」個数・禁止句）を
 * 決定的に検出するのが役割。判定は「警告」であり、ブロックはしない。
 *
 * 使い方:
 *   node scripts/lint-draft.mjs <file.md> [--json] [--no-textlint]   レポートを stdout に出す
 *   node scripts/lint-draft.mjs --metrics <a.md> [<b.md> ...] [--csv] 指標表だけを出す（比較用）
 *   node scripts/lint-draft.mjs --hook                               PostToolUse hook（stdin に hook JSON）
 *
 * hook モードでは対象パス（config.targetGlobs）にマッチした時だけレポートを
 * hookSpecificOutput.additionalContext として返し、それ以外は何も出さず exit 0 で終わる。
 * 同じファイルへの2回目以降の hook は、前回（一時ディレクトリに保存した状態）との差分だけを返す。
 * Edit のたびに全文レポートが会話に積み上がり、本文より lint が目立つのを防ぐため。
 * 全文が要る時は手動で `node scripts/lint-draft.mjs <file>` を実行する。
 */
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "draft-lint.config.json"), "utf8"));
const T = CONFIG.thresholds;

// 文の区切り。全角と半角の終端記号を両方見る
const SENTENCE_END = /[。！？!?]/;
// 「思う系」語尾。ヘッジは文体資産なので警告せず参考値として数える
const HEDGE_END = /(思います|思っています|気がします|感じます|感じています|考えています|かもしれません|ように見えます)[。！？]?$/;
// 英文引用とみなす目安: ASCII 英字が 6 割以上で 25 字以上の文
const ENGLISH_RATIO = 0.6;
const ENGLISH_MIN_LEN = 25;
// 冒頭判定に見る範囲（見出しを除いた本文の先頭）。著者の導入は 3〜6 段落で 600 字前後
const INTRO_CHARS = 600;
// hook で Claude に返すレポートの上限（長すぎると本文より目立つ）
const HOOK_REPORT_MAX = 4000;
// textlint の同一ルールで表示する最大件数（info ルールが数十件出るため）
const TEXTLINT_PER_RULE_MAX = 5;

// ---------- 前処理 ----------

/** 著者向けメモ・コード・HTMLコメントを落として、行番号を保ったまま本文行を返す */
function bodyLines(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let inComment = false;
  let inMemo = false; // ℹ️/✍️ で始まる引用ブロック。空行または引用でない行まで丸ごと除外する
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inComment) {
      if (line.includes("-->")) { inComment = false; line = line.slice(line.indexOf("-->") + 3); } else { out.push({ n: i + 1, text: "" }); continue; }
    }
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push({ n: i + 1, text: "" }); continue; }
    if (inFence) { out.push({ n: i + 1, text: "" }); continue; }
    if (line.includes("<!--") && !line.includes("-->")) { inComment = true; line = line.slice(0, line.indexOf("<!--")); }
    line = line.replace(/<!--.*?-->/g, "");
    const isQuoteLine = /^\s*>/.test(line);
    if (inMemo && !isQuoteLine) inMemo = false;
    if (isQuoteLine && CONFIG.skipBlockquoteMarkers.some((m) => line.includes(m))) inMemo = true;
    if (inMemo) { out.push({ n: i + 1, text: "" }); continue; }
    out.push({ n: i + 1, text: line });
  }
  return out;
}

const isHeading = (s) => /^#{1,6}\s/.test(s);
const isList = (s) => /^\s*([-*+]|\d+\.)\s/.test(s);
const isQuote = (s) => /^\s*>/.test(s);
const isHr = (s) => /^\s*-{3,}\s*$/.test(s);
const isHtml = (s) => /^\s*</.test(s);
// 図だけの行（![alt](path)）。段落に数えると字数 0 の段落になり、段落あたりの指標が下がるため除外する
const isImage = (s) => /^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(s);

/** リンク記法と URL を落とした素の文字列 */
function plain(s) {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/\*\*/g, "");
}

/** リンクを丸ごと落とした素の文字列（英文引用の検出用。リンクタイトルの英語を数えないため） */
function plainNoLinks(s) {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, "").replace(/https?:\/\/\S+/g, "").replace(/\*\*/g, "");
}

function splitSentences(s) {
  return plain(s).split(/(?<=[。！？!?])/).map((x) => x.replace(/\s+/g, "")).filter((x) => x.length >= 4);
}

/** 段落（空行区切り）を、先頭行番号つきで返す。見出し・リスト・引用・罫線・HTMLは除外 */
function paragraphs(lines) {
  const paras = [];
  let cur = [];
  let start = 0;
  const flush = () => {
    if (cur.length) {
      const text = cur.join("\n");
      const first = cur[0];
      if (!(isHeading(first) || isList(first) || isQuote(first) || isHr(first) || isHtml(first) || isImage(first))) paras.push({ n: start, text });
    }
    cur = [];
  };
  for (const l of lines) {
    if (l.text.trim() === "") { flush(); continue; }
    if (!cur.length) start = l.n;
    cur.push(l.text);
  }
  flush();
  return paras;
}

// ---------- 指標 ----------

function metrics(text) {
  const lines = bodyLines(text);
  const nonHeading = lines.filter((l) => !isHeading(l.text));
  const bodyText = nonHeading.map((l) => plain(l.text)).join("\n");
  const paras = paragraphs(lines);
  const paraSent = paras.map((p) => ({ n: p.n, count: splitSentences(p.text).length, head: plain(p.text).replace(/\s+/g, "").slice(0, 24) }));
  // 段落あたり字数。1文ずつ改行して並べると文数の仕様は満たしたまま段落が痩せるため、字数でも見る
  const paraChars = paras.map((p) => ({ n: p.n, len: plain(p.text).replace(/\s+/g, "").length, head: plain(p.text).replace(/\s+/g, "").slice(0, 24) }));
  const paraCharsAvg = paraChars.length ? Math.round(paraChars.reduce((a, p) => a + p.len, 0) / paraChars.length) : 0;
  const parasShort = paraChars.filter((p) => p.len < T.shortParagraphCharsMax);

  // 章ごとの字数（判定しない。outline.md の目安と比べるための参考値）。## と ### をそれぞれ1章として数える
  const sections = [];
  let curSec = { title: "導入", chars: 0 };
  for (const l of lines) {
    const hm = l.text.match(/^#{2,3}\s+(.*)/);
    if (hm) {
      if (curSec.chars > 0 || curSec.title !== "導入") sections.push(curSec);
      curSec = { title: hm[1].trim(), chars: 0 };
      continue;
    }
    if (isHeading(l.text) || isHr(l.text)) continue;
    curSec.chars += plain(l.text).replace(/\s/g, "").length;
  }
  sections.push(curSec);
  const sentences = nonHeading.flatMap((l) => splitSentences(l.text));
  const headings = lines.filter((l) => isHeading(l.text)).map((l) => ({ n: l.n, text: l.text }));
  const kagi = (bodyText.match(/「/g) || []).length;
  const bold = (text.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const dashes = (bodyText.match(/[—―]|――|——/g) || []).length;
  const nakaguro = (bodyText.match(/[ぁ-んァ-ン一-龥]・[ぁ-んァ-ン一-龥]/g) || []).length;
  const chars = bodyText.replace(/\s/g, "").length;
  const longSentences = sentences.filter((s) => s.length > T.sentenceCharsMax).length;
  const hedge = sentences.filter((s) => HEDGE_END.test(s)).length;
  const sentencesNoLinks = nonHeading.flatMap((l) => plainNoLinks(l.text).split(/(?<=[。！？!?])/).map((x) => x.replace(/\s+/g, "")).filter((x) => x.length >= 4));
  const english = sentencesNoLinks.filter((s) => s.length >= ENGLISH_MIN_LEN && (s.match(/[A-Za-z]/g) || []).length / s.length >= ENGLISH_RATIO).length;

  // 「」で囲まれた語の反復
  const phraseCount = new Map();
  for (const m of bodyText.matchAll(/「([^「」\n]{2,24})」/g)) phraseCount.set(m[1], (phraseCount.get(m[1]) || 0) + 1);
  const repeated = [...phraseCount].filter(([, c]) => c > T.keyphraseRepeatMax).sort((a, b) => b[1] - a[1]);
  const inHeading = [...phraseCount.keys()].filter((k) => headings.some((h) => h.text.includes(k)) && (phraseCount.get(k) || 0) >= 2);

  // 冒頭
  const intro = nonHeading.map((l) => plain(l.text)).join("").replace(/\s+/g, "").slice(0, INTRO_CHARS);
  const introKind = /この記事では/.test(intro) ? "宣言" : /(参加|登壇)してきました/.test(intro) ? "体験" : "不明";
  const introHasRefBlock = lines.slice(0, 20).some((l) => /参考資料/.test(l.text));
  const introHasFixedHeader = /Tableau NOTE/.test(text);

  // 結び
  const closingIdx = lines.findIndex((l) => /^##\s*最後に/.test(l.text));
  // 結びは次の見出しまで。「## 最後に」の後ろに置く「### 余談」は結びに数えない
  const closingEnd = closingIdx >= 0 ? lines.findIndex((l, i) => i > closingIdx && /^#{2,3}\s/.test(l.text)) : -1;
  const closingLines = closingIdx >= 0 ? lines.slice(closingIdx + 1, closingEnd >= 0 ? closingEnd : undefined) : [];
  const closingSentences = closingLines.flatMap((l) => splitSentences(l.text));
  const closingText = closingLines.map((l) => l.text).join("\n");

  const authorSignals = Object.fromEntries(CONFIG.authorSignals.map((p) => [p.replace(/\\/g, ""), (bodyText.match(new RegExp(p, "g")) || []).length]));

  return {
    chars, paragraphs: paras.length, sentences: sentences.length,
    avgSentenceLen: sentences.length ? +(sentences.reduce((a, s) => a + s.length, 0) / sentences.length).toFixed(1) : 0,
    sentPerPara: paraSent.length ? +(paraSent.reduce((a, p) => a + p.count, 0) / paraSent.length).toFixed(2) : 0,
    parasOver: paraSent.filter((p) => p.count > T.sentencesPerParagraphMax),
    paraCharsAvg, parasShort, sections,
    h2: headings.filter((h) => /^##\s/.test(h.text)).length,
    // 余談の ### は構成上の例外として数えない（voice-style ルール8・11）
    h3: headings.filter((h) => /^###\s/.test(h.text) && !/^###\s*余談/.test(h.text)).length,
    headings, kagi, bold, dashes, nakaguro, longSentences, hedge, english, repeated, inHeading,
    introKind, introHasRefBlock, introHasFixedHeader,
    closingFound: closingIdx >= 0, closingSentences: closingSentences.length, closingText,
    authorSignals, lines,
  };
}

// ---------- 禁止句 ----------

function bannedHits(m) {
  const hits = [];
  for (const rule of CONFIG.bannedPhrases) {
    const re = new RegExp(rule.pattern, "g");
    for (const l of m.lines) {
      if (!l.text || isHeading(l.text)) continue;
      const src = plain(l.text);
      for (const mt of src.matchAll(re)) hits.push({ n: l.n, group: rule.group, text: mt[0].replace(/^[。]/, ""), hint: rule.hint });
    }
  }
  return hits;
}

// ---------- textlint ----------

async function runTextlint(file) {
  let textlint;
  try { textlint = await import("textlint"); } catch { return { error: "textlint が未導入です。リポジトリ直下で `npm install` を実行してください" }; }
  const configFilePath = path.join(ROOT, ".textlintrc.json");
  const descriptor = await textlint.loadTextlintrc({ configFilePath });
  const linter = textlint.createLinter({ descriptor, cwd: ROOT });
  const results = await linter.lintFiles([file]);
  const messages = results.flatMap((r) => r.messages);
  return { messages };
}

// ---------- 判定とレポート ----------

function evaluate(m, banned, tl) {
  const rows = [];
  const add = (label, value, limit, ok, note = "") => rows.push({ label, value, limit, ok, note });
  // 字数は判定しない（参考値）。長さは主張の数で決まり、字数を目標に削ると著者が残したい段落まで痩せる。レンジ外は注記だけ出す
  const charsNote = m.chars > T.bodyCharsMax ? `参考: 公開記事の上限 ${T.bodyCharsMax} を ${m.chars - T.bodyCharsMax} 字超。保険文・道案内・多段論証があれば削る` : m.chars < T.bodyCharsMin ? `参考: 公開記事の下限 ${T.bodyCharsMin} より短い` : "";
  add("本文字数（参考）", m.chars, `${T.bodyCharsMin}〜${T.bodyCharsMax}`, true, charsNote);
  const overRatio = m.paragraphs ? m.parasOver.length / m.paragraphs : 0;
  add("段落あたり文数（平均）", m.sentPerPara, `≤${T.sentencesPerParagraphMax}`, m.sentPerPara <= T.sentencesPerParagraphMax + 0.3);
  add(`${T.sentencesPerParagraphMax + 1}文以上の段落`, `${m.parasOver.length}/${m.paragraphs}`, `≤${Math.round(T.paragraphsOverLimitRatioMax * 100)}%`, overRatio <= T.paragraphsOverLimitRatioMax);
  add("段落あたり字数（平均）", m.paraCharsAvg, `≥${T.paragraphCharsAvgMin}`, m.paraCharsAvg >= T.paragraphCharsAvgMin, m.paraCharsAvg < T.paragraphCharsAvgMin ? "1文ずつ改行して並べている。同じ論点の段落をまとめ、背景・理由・例を1段落で運ぶ" : "");  add("「」の個数", m.kagi, `≤${T.kagiKakkoMax}`, m.kagi <= T.kagiKakkoMax);
  add("## の本数", m.h2, `≤${T.h2Max}`, m.h2 <= T.h2Max);
  add("### の本数（余談を除く）", m.h3, `≤${T.h3Max}`, m.h3 <= T.h3Max);
  add("太字", m.bold, `${T.boldMax}`, m.bold <= T.boldMax);
  add("ダッシュ（—―）", m.dashes, "0", m.dashes === 0);
  add("和文の中黒（・）", m.nakaguro, `≤${T.nakaguroMax}`, m.nakaguro <= T.nakaguroMax);
  add(`${T.sentenceCharsMax}字超の文`, m.longSentences, "0", m.longSentences === 0);
  add("英文引用（文）", m.english, `≤${T.englishQuoteMax}`, m.english <= T.englishQuoteMax);
  add("「」語の反復", m.repeated.length ? m.repeated.map(([k, c]) => `「${k}」×${c}`).join(" ") : 0, `各≤${T.keyphraseRepeatMax}`, m.repeated.length === 0);
  add("見出しに使った「」語", m.inHeading.length ? m.inHeading.map((k) => `「${k}」`).join(" ") : 0, "0", m.inHeading.length === 0);
  add("冒頭", m.introKind, "宣言 or 体験", m.introKind !== "不明");
  add("冒頭の参考資料ブロック／固定ヘッダ", `${m.introHasRefBlock ? "参考資料あり" : "なし"}${m.introHasFixedHeader ? "・Tableau NOTEあり" : ""}`, "なし", !m.introHasRefBlock && !m.introHasFixedHeader);
  if (m.closingFound) {
    const closingBad = CONFIG.closingBanned.filter((r) => new RegExp(r.pattern).test(m.closingText));
    add("結び（## 最後に）の文数", m.closingSentences, `≤${T.closingSentencesMax}`, m.closingSentences <= T.closingSentencesMax);
    add("結びの問い返し", closingBad.length ? "あり" : "なし", "なし", closingBad.length === 0, closingBad.map((r) => r.hint).join("; "));
  } else {
    add("結び（## 最後に）", "なし", "あり", false);
  }
  add("禁止句", banned.length, "0", banned.length === 0);
  const tlErr = tl.messages ? tl.messages.filter((x) => x.severity === 2).length : 0;
  const tlWarn = tl.messages ? tl.messages.filter((x) => x.severity === 1).length : 0;
  add("textlint error / warning", `${tlErr} / ${tlWarn}`, "0 / 0", tlErr === 0 && tlWarn === 0);
  return rows;
}

function report(file, m, banned, tl, rows) {
  const ng = rows.filter((r) => !r.ok);
  const out = [];
  out.push(`# draft lint: ${path.relative(ROOT, file).replace(/\\/g, "/")}`);
  out.push("");
  out.push(ng.length ? `**NG ${ng.length} 件**: ${ng.map((r) => r.label).join(" / ")}` : "**NG なし**（機械ゲート通過）");
  out.push("");
  out.push("| 指標 | 値 | 閾値 | 判定 |");
  out.push("|---|---|---|---|");
  for (const r of rows) out.push(`| ${r.label} | ${r.value} | ${r.limit} | ${r.ok ? "OK" : "NG"}${r.note ? " " + r.note : ""} |`);
  if (m.parasOver.length) {
    out.push("");
    out.push(`## ${T.sentencesPerParagraphMax + 1}文以上の段落（${m.parasOver.length} 件）`);
    for (const p of m.parasOver.slice(0, 15)) out.push(`- L${p.n}（${p.count}文）${p.head}…`);
    if (m.parasOver.length > 15) out.push(`- …ほか ${m.parasOver.length - 15} 件`);
  }
  if (m.paraCharsAvg < T.paragraphCharsAvgMin && m.parasShort.length) {
    out.push("");
    out.push(`## ${T.shortParagraphCharsMax}字未満の段落（${m.parasShort.length} 件。まとめる候補）`);
    for (const p of m.parasShort.slice(0, 15)) out.push(`- L${p.n}（${p.len}字）${p.head}…`);
    if (m.parasShort.length > 15) out.push(`- …ほか ${m.parasShort.length - 15} 件`);
  }
  if (banned.length) {
    out.push("");
    out.push(`## 禁止句（${banned.length} 件）`);
    for (const b of banned) out.push(`- L${b.n} [${b.group}] 「${b.text}」 → ${b.hint}`);
  }
  if (tl.error) {
    out.push("");
    out.push(`## textlint: ${tl.error}`);
  } else if (tl.messages && tl.messages.length) {
    const sev = { 2: "error", 1: "warning", 0: "info" };
    const byRule = new Map();
    for (const x of tl.messages) { const k = `${sev[x.severity]}:${x.ruleId}`; if (!byRule.has(k)) byRule.set(k, []); byRule.get(k).push(x); }
    out.push("");
    out.push(`## textlint（${tl.messages.length} 件）`);
    for (const [k, xs] of [...byRule].sort((a, b) => b[1][0].severity - a[1][0].severity)) {
      out.push(`- ${k}（${xs.length}）`);
      for (const x of xs.slice(0, TEXTLINT_PER_RULE_MAX)) out.push(`  - L${x.line}: ${x.message.replace(/\n/g, " ").slice(0, 140)}`);
      if (xs.length > TEXTLINT_PER_RULE_MAX) out.push(`  - …ほか ${xs.length - TEXTLINT_PER_RULE_MAX} 件`);
    }
  }
  out.push("");
  out.push("## 参考（判定しない）");
  out.push(`- 著者の指紋: ${Object.entries(m.authorSignals).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  out.push(`- 思う系語尾 ${m.hedge} / 文 ${m.sentences}、平均文長 ${m.avgSentenceLen} 字、段落 ${m.paragraphs}、${T.shortParagraphCharsMax}字未満の段落 ${m.parasShort.length}`);
  out.push(`- 章ごとの字数（outline.md の目安と比べる）: ${m.sections.map((s) => `${s.title} ${s.chars}`).join(" / ")}`);
  return out.join("\n");
}

function metricsTable(files, csv) {
  const cols = ["chars", "paragraphs", "sentPerPara", "paraCharsAvg", "avgSentenceLen", "h2", "h3", "kagi", "bold", "english", "hedge"];
  const labels = ["本文字数", "段落数", "文/段落", "字/段落", "平均文長", "##", "###（余談除く）", "「」", "太字", "英文引用", "思う系語尾"];
  const data = files.map((f) => {
    const m = metrics(fs.readFileSync(f, "utf8"));
    const banned = bannedHits(m).length;
    return { file: path.relative(ROOT, f).replace(/\\/g, "/"), ...Object.fromEntries(cols.map((c) => [c, m[c]])), banned, signals: Object.values(m.authorSignals).reduce((a, b) => a + b, 0) };
  });
  if (csv) {
    const head = ["date", "file", ...cols, "banned", "authorSignals"];
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return [head.join(","), ...data.map((d) => [today, d.file, ...cols.map((c) => d[c]), d.banned, d.signals].join(","))].join("\n");
  }
  const head = ["指標", ...data.map((d) => d.file)];
  const lines = [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`];
  cols.forEach((c, i) => lines.push(`| ${labels[i]} | ${data.map((d) => d[c]).join(" | ")} |`));
  lines.push(`| 禁止句 | ${data.map((d) => d.banned).join(" | ")} |`);
  lines.push(`| 著者の指紋（合計） | ${data.map((d) => d.signals).join(" | ")} |`);
  return lines.join("\n");
}

// ---------- hook の差分 ----------

// hook の前回状態を置く場所。リポジトリ外（一時ディレクトリ）に置き、ファイルの絶対パスで引く
const HOOK_STATE_DIR = path.join(os.tmpdir(), "draft-lint-state");

function hookStatePath(file) {
  const key = crypto.createHash("sha1").update(path.resolve(file)).digest("hex");
  return path.join(HOOK_STATE_DIR, `${key}.json`);
}

/** 差分比較に使う「論点の集合」。行番号は Edit で動くので鍵に含めず、内容で同一視する */
function issueSet(r) {
  const rows = {};
  for (const x of r.rows) rows[x.label] = { value: String(x.value), ok: x.ok };
  // 件数と出現行を持つ。行番号は Edit で動くので同一視の鍵にはせず、増えた時にどこかを示す用途だけに使う
  const count = (list, keyOf, lineOf) => { const m = {}; for (const it of list) { const k = keyOf(it); (m[k] ||= { n: 0, lines: [] }); m[k].n += 1; m[k].lines.push(lineOf(it)); } return m; };
  const banned = count(r.banned, (b) => `[${b.group}] 「${b.text}」 → ${b.hint}`, (b) => b.n);
  const sev = { 2: "error", 1: "warning", 0: "info" };
  const tl = count((r.tl.messages || []).filter((x) => x.severity >= 1), (x) => `${sev[x.severity]}:${x.ruleId} ${x.message.replace(/\n/g, " ").slice(0, 80)}`, (x) => x.line);
  return { rows, banned, tl };
}

/** 前回状態との差分レポート。変化が無ければ1行で返す */
function diffReport(file, prev, cur, r) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const ngNow = Object.entries(cur.rows).filter(([, v]) => !v.ok).map(([k]) => k);
  const head = `# draft lint: ${rel} — ${ngNow.length ? `NG ${ngNow.length} 件: ${ngNow.join(" / ")}` : "NG なし"}`;
  const lines = [];
  const keys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const k of keys(prev.rows, cur.rows)) {
    const p = prev.rows[k], c = cur.rows[k];
    if (!c) continue;
    if (!p) { lines.push(`- 新規: ${k} = ${c.value}（${c.ok ? "OK" : "NG"}）`); continue; }
    if (p.ok && !c.ok) lines.push(`- NG になった: ${k} ${p.value} → ${c.value}`);
    else if (!p.ok && c.ok) lines.push(`- 解消: ${k} ${p.value} → ${c.value}`);
    else if (!c.ok && p.value !== c.value) lines.push(`- NG のまま変化: ${k} ${p.value} → ${c.value}`);
  }
  const diffCount = (label, a, b) => {
    for (const k of keys(a, b)) {
      const pa = a[k] || { n: 0, lines: [] }, pb = b[k] || { n: 0, lines: [] };
      const d = pb.n - pa.n;
      if (d > 0) {
        // 前回に無かった行を「増えた場所」として示す（行ずれで外れたら末尾の出現で代替）
        const fresh = pb.lines.filter((l) => !pa.lines.includes(l));
        const where = (fresh.length ? fresh : pb.lines.slice(-d)).map((l) => `L${l}`).join(", ");
        lines.push(`- ${label}が増えた（${where}）: ${k}${d > 1 ? ` ×${d}` : ""}`);
      } else if (d < 0) lines.push(`- ${label}が減った: ${k.split(" → ")[0]}${d < -1 ? ` ×${-d}` : ""}`);
    }
  };
  diffCount("禁止句", prev.banned, cur.banned);
  diffCount("textlint", prev.tl, cur.tl);
  if (!lines.length) return `${head}\n変化なし。全文は \`node scripts/lint-draft.mjs ${rel}\``;
  return `${head}\n前回からの差分:\n${lines.join("\n")}`;
}

function loadHookState(file) {
  try { return JSON.parse(fs.readFileSync(hookStatePath(file), "utf8")); } catch { return null; }
}

function saveHookState(file, state) {
  try { fs.mkdirSync(HOOK_STATE_DIR, { recursive: true }); fs.writeFileSync(hookStatePath(file), JSON.stringify(state)); } catch { /* 状態が書けなくても lint 自体は返す */ }
}

// ---------- 入口 ----------

function globToRegex(g) {
  return new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
}

function isTarget(file) {
  const rel = path.relative(ROOT, path.resolve(file)).replace(/\\/g, "/");
  if (rel.startsWith("..")) return false;
  return CONFIG.targetGlobs.some((g) => globToRegex(g).test(rel));
}

/** ファイル名で判定種別を切り替える。draft*.md は本文判定、core.md は専用の軽量判定 */
function fileKind(file) {
  const base = path.basename(file);
  if (base === "core.md") return "core";
  return "draft";
}

/** draft 以外（core）向けの簡易レポート。指標表だけを出し、段落・禁止句・textlint のセクションは持たない */
function reportSimple(file, rows, extraSections = []) {
  const ng = rows.filter((r) => !r.ok);
  const out = [];
  out.push(`# draft lint: ${path.relative(ROOT, file).replace(/\\/g, "/")}`);
  out.push("");
  out.push(ng.length ? `**NG ${ng.length} 件**: ${ng.map((r) => r.label).join(" / ")}` : "**NG なし**（機械ゲート通過）");
  out.push("");
  out.push("| 指標 | 値 | 閾値 | 判定 |");
  out.push("|---|---|---|---|");
  for (const r of rows) out.push(`| ${r.label} | ${r.value} | ${r.limit} | ${r.ok ? "OK" : "NG"}${r.note ? " " + r.note : ""} |`);
  for (const s of extraSections) { out.push(""); out.push(s); }
  return out.join("\n");
}

/** core.md: 箇条書き行数と各行の字数だけを見る。見出し行・承認:・改訂: の行は数えない */
function lintCore(file, text) {
  const rawLines = text.split(/\r?\n/);
  const items = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (!trimmed || isHeading(trimmed) || /^(承認|改訂)\s*[:：]/.test(trimmed)) continue;
    if (!isList(trimmed)) continue;
    items.push({ n: i + 1, text: trimmed, len: trimmed.length });
  }
  const overLines = items.filter((it) => it.len > T.coreLineCharsMax);
  const rows = [
    { label: "箇条書き行数", value: items.length, limit: `≤${T.coreLinesMax}`, ok: items.length <= T.coreLinesMax },
    { label: `${T.coreLineCharsMax}字超の行`, value: overLines.length, limit: "0", ok: overLines.length === 0 },
  ];
  const extra = overLines.length
    ? [`## ${T.coreLineCharsMax}字超の行（${overLines.length} 件）\n` + overLines.map((it) => `- L${it.n}（${it.len}字）${it.text.slice(0, 40)}…`).join("\n")]
    : [];
  return { m: { items }, banned: [], tl: { messages: [] }, rows, text: reportSimple(file, rows, extra) };
}

async function lintOne(file, opts) {
  const text = fs.readFileSync(file, "utf8");
  const kind = fileKind(file);
  if (kind === "core") return lintCore(file, text);
  const m = metrics(text);
  const banned = bannedHits(m);
  const tl = opts.noTextlint ? { messages: [] } : await runTextlint(file);
  const rows = evaluate(m, banned, tl);
  return { m, banned, tl, rows, text: report(file, m, banned, tl, rows) };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const files = args.filter((a) => !a.startsWith("--"));

  if (flag("--hook")) {
    let input = "";
    try { input = fs.readFileSync(0, "utf8"); } catch { return; }
    let file;
    try { file = JSON.parse(input)?.tool_input?.file_path; } catch { return; }
    if (!file || !fs.existsSync(file) || !isTarget(file)) return;
    try {
      const r = await lintOne(file, { noTextlint: false });
      const cur = issueSet(r);
      const prev = loadHookState(file);
      saveHookState(file, cur);
      // 初回は全文、2回目以降は差分だけ（同じレポートの積み上がりを防ぐ）
      let ctx = prev ? diffReport(file, prev, cur, r) : r.text;
      if (ctx.length > HOOK_REPORT_MAX) ctx = ctx.slice(0, HOOK_REPORT_MAX) + "\n…（省略。全文は `node scripts/lint-draft.mjs <file>`）";
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `[draft lint / 機械ゲート]\n${ctx}` } }));
    } catch (e) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `[draft lint] 実行に失敗: ${e.message}` } }));
    }
    return;
  }

  if (flag("--metrics")) {
    if (!files.length) { console.error("usage: lint-draft.mjs --metrics <a.md> [<b.md> ...] [--csv]"); process.exit(1); }
    console.log(metricsTable(files.map((f) => path.resolve(f)), flag("--csv")));
    return;
  }

  if (files.length !== 1) { console.error("usage: lint-draft.mjs <file.md> [--json] [--no-textlint]"); process.exit(1); }
  const file = path.resolve(files[0]);
  if (!fs.existsSync(file)) { console.error(`not found: ${file}`); process.exit(1); }
  const r = await lintOne(file, { noTextlint: flag("--no-textlint") });
  if (flag("--json")) {
    const { lines, ...m } = r.m;
    console.log(JSON.stringify({ file, metrics: m, banned: r.banned, textlint: r.tl.messages || [], rows: r.rows }, null, 1));
  } else {
    console.log(r.text);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

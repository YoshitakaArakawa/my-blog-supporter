#!/usr/bin/env node
/**
 * render-map.mjs — 記事の地図（map.html）を map.json から決定的にレンダリングする
 *
 * 背景: 地図は記事づくりの節目ごとに更新するため、LLM が毎回テンプレート全体（300行超）を
 * Write するとトークンを食う。LLM は抽出結果を map.json に書くだけにし、置換という
 * 決定的な操作はこのスクリプトに寄せる。抽出規則・検算は
 * .claude/skills/article/references/map-spec.md を参照。
 *
 * 使い方:
 *   node .claude/skills/article/scripts/render-map.mjs <map.json> [--template <path>] [--out <path>]
 *   --template 省略時: ../templates/map-template.html（同じ Skill 内のテンプレート）
 *                      （このスクリプトからの相対パスで解決。カレントディレクトリに依存しない）
 *   --out      省略時: map.json と同じディレクトリの map.html
 *
 * 依存: Node 標準モジュールのみ（fs / path / url）。npm install 不要。
 *
 * ---------------------------------------------------------------------------
 * map.json スキーマ
 * ---------------------------------------------------------------------------
 * すべてのキーは必須（値は null や空配列でよい＝未定として描画される）。
 *
 * {
 *   "meta": {
 *     "yyyymmdd": string,          // 例: "20260913"
 *     "title": string,             // 記事タイトル（仮）
 *     "lede": string,              // この地図の読み方（1〜2文）
 *     "bodyChars": number|null,    // 本文字数（draft.md があれば）
 *     "chapterSummary": string|null, // 例: "大見出し4本＋結び"
 *     "category": string|null
 *   },
 *   "core": {                      // core.md の5行。そのまま写す（言い換えない）
 *     "question": string, "reader": string, "afterRead": string,
 *     "motivation": string, "whereNow": string
 *   },
 *   "thesis": string,              // この記事の一番伝えたい一文
 *   "mapLede": string,             // 展開の型とその理由（1〜2文）
 *   "chapters": [{                 // 順序が表示順。空配列可（未定1列で描画）
 *     "num": string,               // 例: "導入" "01" "結び"
 *     "title": string|null,
 *     "chars": number|null,        // ゲージは章内の最大値を100%とした相対値をスクリプトが計算する
 *     "hot": boolean,              // 重心。true は1章のみを想定（複数あっても止めない）
 *     "claim": { "role": string, "text": string } | null,
 *     "issues": { "main": string[], "sub": string[], "note": string } | null,
 *     "materials": { "items": string[], "source": string } | null
 *   }],
 *   "threads": [{                  // 貫く軸。空配列可（未定1本で描画）
 *     "label": string, "kind": "normal"|"alt"|"dash", "desc": string,
 *     "start": number,             // 開始章のインデックス（1始まり、chapters の並び順）
 *     "end": number                // 終了章のインデックス（1始まり、含む）
 *   }],
 *   "questions": [{ "question": string, "answer": string, "chapterLabel": string|null }],
 *   "openQuestions": [{ "question": string, "coreRef": string[] }], // coreRef: 問い/読者/読後/動機/現在地
 *   "boundaries": [{ "what": string, "why": string, "parking": boolean }],
 *   "canonicalFiles": string[]     // フッタに列挙する正本ファイル名
 * }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");           // .claude/skills/article
const ROOT = path.resolve(SKILL_DIR, "../../..");           // リポジトリルート（出力パスの表示用）
const DEFAULT_TEMPLATE = path.join(SKILL_DIR, "templates/map-template.html");

const TBD = "未定";

// ---------- 小さなユーティリティ ----------

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** 未定なら esc(TBD) を、値があれば esc(値) を返す */
function escOr(v) {
  return v === null || v === undefined || v === "" ? esc(TBD) : esc(v);
}

function fmtNum(n) {
  return n.toLocaleString("en-US"); // 桁区切り。手書き版（skeleton.html）の "6,000 字" 表記に合わせる
}

/** {{KEY}} を単純な文字列一致で置換する（正規表現の特殊文字・$ 置換パターンを避けるため split/join を使う） */
function fillScalars(html, map) {
  let out = html;
  for (const [key, value] of Object.entries(map)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** <!-- NAME:START --> ... <!-- NAME:END --> を丸ごと content に差し替える */
function fillBlock(html, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si === -1 || ei === -1 || ei < si) {
    console.error(`テンプレートのマーカーが壊れています: ${name}（${start} 〜 ${end} が見つからない）`);
    process.exit(1);
  }
  return html.slice(0, si) + content + html.slice(ei + end.length);
}

// ---------- map.json の検証 ----------

function need(obj, key, parentLabel, missing) {
  if (obj === null || typeof obj !== "object" || !(key in obj)) missing.push(`${parentLabel}.${key}`);
}

function validate(doc) {
  const missing = [];
  const topKeys = ["meta", "core", "thesis", "mapLede", "chapters", "threads", "questions", "openQuestions", "boundaries", "canonicalFiles"];
  for (const k of topKeys) need(doc, k, "(root)", missing);

  // 個々のサブキー検査は need() が親オブジェクト不在も検出するので、トップレベル欠落時も
  // 続けて検査してよい（1回の実行で複数の欠落を報告できたほうが直しやすい）
  for (const k of ["yyyymmdd", "title", "lede", "bodyChars", "chapterSummary", "category"]) need(doc.meta, k, "meta", missing);
  for (const k of ["question", "reader", "afterRead", "motivation", "whereNow"]) need(doc.core, k, "core", missing);

  if (!Array.isArray(doc.chapters)) missing.push("chapters (配列である必要があります)");
  else doc.chapters.forEach((c, i) => {
    for (const k of ["num", "title", "chars", "hot", "claim", "issues", "materials"]) need(c, k, `chapters[${i}]`, missing);
    if (c.claim) for (const k of ["role", "text"]) need(c.claim, k, `chapters[${i}].claim`, missing);
    if (c.issues) for (const k of ["main", "sub", "note"]) need(c.issues, k, `chapters[${i}].issues`, missing);
    if (c.materials) for (const k of ["items", "source"]) need(c.materials, k, `chapters[${i}].materials`, missing);
  });

  if (!Array.isArray(doc.threads)) missing.push("threads (配列である必要があります)");
  else doc.threads.forEach((t, i) => { for (const k of ["label", "kind", "desc", "start", "end"]) need(t, k, `threads[${i}]`, missing); });

  if (!Array.isArray(doc.questions)) missing.push("questions (配列である必要があります)");
  else doc.questions.forEach((q, i) => { for (const k of ["question", "answer", "chapterLabel"]) need(q, k, `questions[${i}]`, missing); });

  if (!Array.isArray(doc.openQuestions)) missing.push("openQuestions (配列である必要があります)");
  else doc.openQuestions.forEach((q, i) => { for (const k of ["question", "coreRef"]) need(q, k, `openQuestions[${i}]`, missing); });

  if (!Array.isArray(doc.boundaries)) missing.push("boundaries (配列である必要があります)");
  else doc.boundaries.forEach((b, i) => { for (const k of ["what", "why", "parking"]) need(b, k, `boundaries[${i}]`, missing); });

  if (!Array.isArray(doc.canonicalFiles)) missing.push("canonicalFiles (配列である必要があります)");

  return missing;
}

// ---------- Map セクション（章・主張・論点・素材・貫く軸） ----------

/** 空配列は「未定」の1件に差し替える。全フィールド null の1件は、以降の描画ロジックが自然に 未定 を出す */
function withPlaceholder(arr, placeholder) {
  return arr.length ? arr : [placeholder];
}

function renderChapterCells(chapters) {
  const known = chapters.filter((c) => typeof c.chars === "number");
  const maxChars = known.length ? Math.max(...known.map((c) => c.chars)) : 0;
  const rows = { ch: [], claim: [], issue: [], material: [] };

  chapters.forEach((c) => {
    const hotClass = c.hot ? " hot" : "";
    const num = escOr(c.num) + (c.hot ? " ／ 重心" : "");
    const gauge = typeof c.chars === "number" && maxChars > 0 ? Math.round((c.chars / maxChars) * 100) : 0;
    const cnt = typeof c.chars === "number" ? `${fmtNum(c.chars)} 字` : TBD;
    rows.ch.push(
      `<div class="ch${hotClass}"><span class="num">${num}</span><span class="ttl">${escOr(c.title)}</span><span class="cnt">${esc(cnt)}</span><span class="gauge"><i style="width:${gauge}%"></i></span></div>`
    );

    if (c.claim) {
      rows.claim.push(`<div class="cell${hotClass}"><span class="role">${escOr(c.claim.role)}</span><span class="claim">${escOr(c.claim.text)}</span></div>`);
    } else {
      rows.claim.push(`<div class="cell tbd-cell"><span class="tbd">${esc(TBD)}</span></div>`);
    }

    if (c.issues) {
      const main = (c.issues.main || []).map((m) => `<span class="chip main">${esc(m)}</span>`).join("");
      const sub = (c.issues.sub || []).map((s) => `<span class="chip sub">${esc(s)}</span>`).join("");
      const chips = main + sub || `<span class="tbd">${esc(TBD)}</span>`;
      rows.issue.push(`<div class="cell${hotClass}"><div class="chips">${chips}</div><span>${escOr(c.issues.note)}</span></div>`);
    } else {
      rows.issue.push(`<div class="cell tbd-cell"><span class="tbd">${esc(TBD)}</span></div>`);
    }

    if (c.materials) {
      const items = (c.materials.items || []).map((m) => `<li>${esc(m)}</li>`).join("") || `<li>${esc(TBD)}</li>`;
      rows.material.push(`<div class="cell${hotClass}"><ul>${items}</ul><span class="src">${escOr(c.materials.source)}</span></div>`);
    } else {
      rows.material.push(`<div class="cell tbd-cell"><span class="tbd">${esc(TBD)}</span></div>`);
    }
  });

  return rows;
}

/** grid-column の行番号を計算する。列1は行ラベル、章 i（1始まり）は列 i+1 に対応するため、
 * 開始章 start は行番号 start+1、終了章 end は end+2（グリッド線は境界を指すため区間の右端は+1余分に要る） */
function threadGridColumn(start, end) {
  return `${start + 1} / ${end + 2}`;
}

function renderThreadRows(threads, chapterCount) {
  return threads
    .map((t, i) => {
      const rowlab = i === 0 ? "貫く軸" : "";
      const kindClass = t.kind === "alt" ? " alt" : t.kind === "dash" ? " dash" : "";
      const start = typeof t.start === "number" ? t.start : 1;
      const end = typeof t.end === "number" ? t.end : chapterCount;
      const col = threadGridColumn(start, end);
      return `<span class="rowlab">${esc(rowlab)}</span>\n      <div class="thread${kindClass}" style="grid-column:${col}"><span class="lbl">${escOr(t.label)}</span><span class="d">${escOr(t.desc)}</span></div>`;
    })
    .join("\n      ");
}

// ---------- Questions / Open / Boundaries ----------

function renderQuestionCards(questions) {
  return questions
    .map((q) => `<div class="q"><span class="qt">${escOr(q.question)}</span><span class="qa">${escOr(q.answer)}</span><span class="qw">${q.chapterLabel ? esc(q.chapterLabel) + " で返す" : esc(TBD)}</span></div>`)
    .join("\n    ");
}

function renderOpenCards(openQuestions) {
  return openQuestions
    .map((q) => {
      const refs = Array.isArray(q.coreRef) && q.coreRef.length ? q.coreRef.map(esc).join("・") : TBD;
      return `<div class="open"><span class="ot">${escOr(q.question)}</span><span class="ow">効く核: ${refs}</span></div>`;
    })
    .join("\n    ");
}

function renderBoundaryRows(boundaries) {
  return boundaries
    .map((b) => {
      const chip = b.parking ? `<span class="chip sub">駐車場</span> ` : "";
      return `<div class="outrow"><span class="what">${chip}${escOr(b.what)}</span><span class="why">${escOr(b.why)}</span></div>`;
    })
    .join("\n    ");
}

// ---------- 本体 ----------

function render(doc, templateHtml) {
  const chapters = withPlaceholder(doc.chapters, { num: "01", title: null, chars: null, hot: false, claim: null, issues: null, materials: null });
  const threads = withPlaceholder(doc.threads, { label: null, kind: "dash", desc: null, start: 1, end: chapters.length });
  const questions = withPlaceholder(doc.questions, { question: null, answer: null, chapterLabel: null });
  const openQuestions = withPlaceholder(doc.openQuestions, { question: null, coreRef: [] });
  const boundaries = withPlaceholder(doc.boundaries, { what: null, why: null, parking: false });

  const cells = renderChapterCells(chapters);
  const chapterCount = chapters.length;

  // メタ行: 元配列が空だったものは「未定」、そうでなければ件数を出す（withPlaceholder 後の配列は常に長さ>=1 なので元の入力で判定する）
  const claimsMeta = doc.chapters.length ? `主張 ${doc.chapters.filter((c) => c.claim).length} 本` : `主張 ${TBD}`;
  const threadsMeta = doc.threads.length ? `貫く軸 ${doc.threads.length} 本` : `貫く軸 ${TBD}`;

  let html = templateHtml;
  html = fillScalars(html, {
    CHAPTER_COUNT: String(chapterCount),
    DATE: escOr(doc.meta.yyyymmdd),
    TITLE: escOr(doc.meta.title),
    LEDE: escOr(doc.meta.lede),
    THESIS: escOr(doc.thesis),
    META_BODY: doc.meta.bodyChars != null ? `本文 ${fmtNum(doc.meta.bodyChars)} 字` : `本文 ${TBD}`,
    META_HEADINGS: escOr(doc.meta.chapterSummary),
    META_CLAIMS: esc(claimsMeta),
    META_THREADS: esc(threadsMeta),
    META_CATEGORY: escOr(doc.meta.category),
    CORE_Q: escOr(doc.core.question),
    CORE_READER: escOr(doc.core.reader),
    CORE_AFTER: escOr(doc.core.afterRead),
    CORE_MOTIVE: escOr(doc.core.motivation),
    CORE_NOW: escOr(doc.core.whereNow),
    MAP_LEDE: escOr(doc.mapLede),
    CANONICAL_FILES: doc.canonicalFiles.length ? doc.canonicalFiles.map(esc).join("、") : esc(TBD),
  });

  html = fillBlock(html, "CH_CELLS", `<span class="rowlab">章</span>\n      ${cells.ch.join("\n      ")}`);
  html = fillBlock(html, "CLAIM_CELLS", `<span class="rowlab">主張</span>\n      ${cells.claim.join("\n      ")}`);
  html = fillBlock(html, "ISSUE_CELLS", `<span class="rowlab">論点</span>\n      ${cells.issue.join("\n      ")}`);
  html = fillBlock(html, "MATERIAL_CELLS", `<span class="rowlab">素材</span>\n      ${cells.material.join("\n      ")}`);
  html = fillBlock(html, "THREAD_ROWS", renderThreadRows(threads, chapterCount));
  html = fillBlock(html, "QUESTIONS_CARDS", renderQuestionCards(questions));
  html = fillBlock(html, "OPEN_CARDS", renderOpenCards(openQuestions));
  html = fillBlock(html, "BOUNDARIES_ROWS", renderBoundaryRows(boundaries));

  return html;
}

function main() {
  const args = process.argv.slice(2);
  const positional = [];
  let templatePath = DEFAULT_TEMPLATE;
  let outPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--template") { templatePath = path.resolve(args[++i] ?? ""); continue; }
    if (args[i] === "--out") { outPath = path.resolve(args[++i] ?? ""); continue; }
    positional.push(args[i]);
  }
  if (positional.length !== 1) {
    console.error("usage: node .claude/skills/article/scripts/render-map.mjs <map.json> [--template <path>] [--out <path>]");
    process.exit(1);
  }
  const mapJsonPath = path.resolve(positional[0]);

  if (!fs.existsSync(mapJsonPath)) { console.error(`map.json が見つかりません: ${mapJsonPath}`); process.exit(1); }
  if (!fs.existsSync(templatePath)) { console.error(`テンプレートが見つかりません: ${templatePath}`); process.exit(1); }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(mapJsonPath, "utf8"));
  } catch (e) {
    console.error(`map.json の JSON 解析に失敗しました: ${e.message}`);
    process.exit(1);
  }

  const missing = validate(doc);
  if (missing.length) {
    console.error(`map.json に必須キーが不足しています（${missing.length} 件）:`);
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, "utf8");
  const html = render(doc, templateHtml);

  const out = outPath ?? path.join(path.dirname(mapJsonPath), "map.html");
  fs.writeFileSync(out, html, "utf8");
  console.log(`地図を書き出しました: ${path.relative(ROOT, out).replace(/\\/g, "/")}`);
}

main();

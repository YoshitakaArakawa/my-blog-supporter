#!/usr/bin/env node
/**
 * shoot-preview.mjs — 記事のプレビューを、スマホ幅とデスクトップ幅の画面として連番の PNG に撮る
 *
 * review スキルの readers レンズが、読者が実際に見る画面で記事を読むための入力を作る。
 * Markdown を渡すと render-preview.mjs で HTML にしてから撮る。HTML を渡すとそのまま撮る。
 * 入力は読むだけで書き換えない。
 *
 * 使い方:
 *   node scripts/shoot-preview.mjs <draft.md|page.html> --out-dir <dir> [--session <name>]
 *
 * 出力（--out-dir の中。無ければ作る）:
 *   page.html        Markdown を渡した時だけ。render-preview.mjs の出力（図は入力からの相対で解決される）
 *   mobile_NN.png    スマホ幅の画面。上から1画面ずつ（1始まり・2桁）
 *   desktop_NN.png   デスクトップ幅の画面
 *   screens.json     画面ごとの見出し・図の位置、スマホ幅での図の縮尺、図と図の間隔（画面数）
 *
 * 1枚の縦長の全体像（--full-page）にしない。縦長の画像は読む側で縮小され、本文の文字が読めなくなるため。
 *
 * 依存: Node 標準モジュールと playwright-cli（npm のグローバル）。カレントディレクトリはどこでもよい。
 *
 * playwright-cli の扱い（illustrate の render-figure.sh と同じ制約）:
 *   - file: URL はブロックされるので、ベア絶対パスで open する
 *   - 同じセッションを並列で使うと壊れるので、既定のセッション名をプロセスごとに変える
 *   - カレントディレクトリに作業フォルダ（.playwright-cli/）を作るので、一時ディレクトリをカレントにして実行し、終わったら消す
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

// 撮る画面の大きさ（CSS px）。スマホは iPhone 12〜15 の CSS ビューポート。
// デスクトップはノート PC の一般的な幅で、本文（最大 720px）の両側に余白が出る
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 1000 },
];

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
const pad = (n) => String(n).padStart(2, "0");
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// ---------- playwright-cli ----------

/** playwright-cli の本体（npm のグローバルにある JS）。シェルを通さずに node で呼ぶ（Windows の引数の分割を避ける） */
function cliPath() {
  let root;
  try {
    root = execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32" }).trim();
  } catch {
    throw new Error("npm root -g が失敗しました。Node と npm が使えるか確かめてください");
  }
  const cli = path.join(root, "@playwright", "cli", "playwright-cli.js");
  if (!fs.existsSync(cli)) throw new Error(`playwright-cli が見つかりません: ${cli}（npm i -g @playwright/cli で入れる）`);
  return cli;
}

function browser(session, workDir) {
  const cli = cliPath();
  const run = (...a) => execFileSync(process.execPath, [cli, `-s=${session}`, ...a], { cwd: workDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const evalFile = path.join(workDir, "eval.json");
  return {
    run,
    /** ページで関数を評価し、戻り値（JSON の文字列）をオブジェクトにして返す。--filename には JSON の文字列として書かれる（二重に JSON） */
    evalJson(fn) {
      fs.rmSync(evalFile, { force: true });
      run("eval", fn, `--filename=${evalFile}`);
      if (!fs.existsSync(evalFile)) throw new Error("eval の結果が書かれませんでした");
      return JSON.parse(JSON.parse(fs.readFileSync(evalFile, "utf8")));
    },
  };
}

// ---------- 測定（ページの中で評価する関数） ----------

// 画像の読み込みとフォントを待ってから、見出し・図・未作図の枠の位置を測る。
// render-preview.mjs の縦長判定（読み込み後に portrait を付ける）が済んだ後の配置を測るため、1フレーム待つ
const MEASURE = `async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.complete ? null
    : new Promise((r) => { img.addEventListener("load", r); img.addEventListener("error", r); })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const article = document.querySelector(".article") || document.body;
  const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, width: b.width }; };
  const text = (el) => (el.textContent || "").replace(/\\s+/g, " ").trim();
  const blocks = [...article.querySelectorAll("h2, h3, figure, .placeholder")].map((el) => {
    const b = box(el);
    if (el.tagName === "FIGURE") {
      const img = el.querySelector("img");
      const cap = el.querySelector("figcaption");
      return { type: "figure", top: b.top, bottom: b.bottom, src: img ? img.getAttribute("src") : "",
        caption: cap ? text(cap) : "", renderedWidth: img ? img.getBoundingClientRect().width : 0,
        naturalWidth: img ? img.naturalWidth : 0, naturalHeight: img ? img.naturalHeight : 0 };
    }
    if (el.classList.contains("placeholder")) return { type: "placeholder", top: b.top, bottom: b.bottom, text: text(el) };
    return { type: el.tagName.toLowerCase(), top: b.top, bottom: b.bottom, text: text(el) };
  });
  const a = box(article);
  const last = article.lastElementChild ? box(article.lastElementChild).bottom : a.bottom;
  return JSON.stringify({ vw: innerWidth, vh: innerHeight, pageHeight: document.documentElement.scrollHeight,
    contentTop: a.top, contentBottom: last, blocks });
}`;

// ---------- 集計 ----------

/** 図の src（HTML からの相対）を、入力ファイルからの相対パスに直す。URL はそのまま */
function srcFromInput(src, htmlDir, inputDir) {
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
  return path.relative(inputDir, path.resolve(htmlDir, decodeURI(src))).replace(/\\/g, "/");
}

function summarize(vp, m, files, htmlDir, inputDir) {
  const offsets = files.map((_, i) => Math.max(0, Math.min(i * m.vh, m.pageHeight - m.vh)));
  // y を含む最初の画面（1始まり）。最後の画面は手前の画面と重なるので、先に当たる画面を採る
  const screenOf = (y) => {
    const i = offsets.findIndex((o) => y >= o && y < o + m.vh);
    return (i < 0 ? offsets.length - 1 : i) + 1;
  };
  const blocks = m.blocks.map((b) => {
    const out = { type: b.type, screen: screenOf(b.top) };
    if (b.type !== "figure") return { ...out, text: b.text };
    const scale = b.naturalWidth ? round(b.renderedWidth / b.naturalWidth) : null;
    return { ...out, src: srcFromInput(b.src, htmlDir, inputDir), caption: b.caption, renderedWidth: Math.round(b.renderedWidth),
      naturalWidth: b.naturalWidth, naturalHeight: b.naturalHeight, scale, ...(b.naturalWidth ? {} : { broken: true }) };
  });
  // 図（作図済み・未作図の枠）の無い区間を、画面の高さを単位に測る
  const visuals = m.blocks.map((b, i) => ({ ...b, label: labelOf(blocks[i]) })).filter((b) => b.type === "figure" || b.type === "placeholder");
  const edges = [{ bottom: m.contentTop, label: "冒頭" }, ...visuals, { top: m.contentBottom, label: "末尾" }];
  const gaps = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const from = edges[i].bottom;
    const to = edges[i + 1].top;
    if (to <= from) continue;
    gaps.push({ from: edges[i].label, to: edges[i + 1].label, screens: round((to - from) / m.vh, 1), range: [screenOf(from), screenOf(to - 1)] });
  }
  return {
    name: vp.name, width: m.vw, height: m.vh, pageHeight: m.pageHeight,
    screens: files.map((f, i) => ({ file: f, scrollY: offsets[i] })),
    blocks, gaps,
  };
}

function labelOf(b) {
  if (b.type === "figure") return `図 ${b.src}`;
  if (b.type === "placeholder") return `未作図 ${b.text.replace(/^画像（未作図）/, "").slice(0, 30)}`;
  return b.text;
}

// ---------- 入口 ----------

function parseArgs(argv) {
  const opts = { input: null, outDir: null, session: `shoot-${process.pid}` };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out-dir") opts.outDir = argv[++i];
    else if (a === "--session") opts.session = argv[++i];
    else if (!opts.input) opts.input = a;
    else opts.extra = a;
  }
  if (!opts.input || !opts.outDir || opts.extra) {
    console.error("usage: node scripts/shoot-preview.mjs <draft.md|page.html> --out-dir <dir> [--session <name>]");
    process.exit(1);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const input = path.resolve(opts.input);
  if (!fs.existsSync(input)) { console.error(`入力が見つかりません: ${input}`); process.exit(1); }
  const outDir = path.resolve(opts.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  // Markdown は render-preview.mjs で HTML にする。図の欠落の警告はそのまま見せる
  let html = input;
  if (/\.md$/i.test(input)) {
    html = path.join(outDir, "page.html");
    try {
      const r = execFileSync(process.execPath, [path.join(SCRIPT_DIR, "render-preview.mjs"), input, "--out", html], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      process.stdout.write(r);
    } catch (e) {
      console.error(`HTML の生成に失敗しました: ${e.stderr || e.message}`);
      process.exit(1);
    }
  } else if (!/\.html?$/i.test(input)) {
    console.error("入力は .md か .html にしてください");
    process.exit(1);
  }

  // 前回の撮影の残りを消す（画面数が減った時に古い連番が残らないように）
  for (const f of fs.readdirSync(outDir)) if (/^(mobile|desktop)_\d+\.png$/.test(f)) fs.rmSync(path.join(outDir, f));

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "shoot-preview-"));
  const b = browser(opts.session, workDir);
  const result = { input: rel(input), html: rel(html), viewports: [] };
  try {
    b.run("open", html);
    for (const vp of VIEWPORTS) {
      b.run("resize", String(vp.width), String(vp.height));
      const m = b.evalJson(MEASURE);
      const count = Math.max(1, Math.ceil(m.pageHeight / m.vh));
      const files = [];
      for (let i = 0; i < count; i++) {
        const file = `${vp.name}_${pad(i + 1)}.png`;
        b.run("eval", `() => { window.scrollTo(0, ${i * m.vh}); }`);
        b.run("screenshot", `--filename=${path.join(outDir, file)}`);
        files.push(file);
      }
      result.viewports.push(summarize(vp, m, files, path.dirname(html), path.dirname(input)));
    }
  } catch (e) {
    console.error(`撮影に失敗しました: ${e.stderr || e.message}`);
    process.exitCode = 1;
  } finally {
    try { b.run("close"); } catch { /* 開く前に失敗した時は閉じるものが無い */ }
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  if (process.exitCode) return;

  fs.writeFileSync(path.join(outDir, "screens.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  report(result, outDir);
}

function report(result, outDir) {
  const counts = result.viewports.map((v) => `${v.name} ${v.screens.length} 画面`).join("・");
  console.log(`画面を撮りました: ${rel(outDir)}/（${counts}）`);
  const mobile = result.viewports.find((v) => v.name === "mobile");
  if (!mobile) return;
  const figs = mobile.blocks.filter((b) => b.type === "figure");
  const phs = mobile.blocks.filter((b) => b.type === "placeholder");
  console.log(`図 ${figs.length} / 未作図 ${phs.length}`);
  for (const f of figs) {
    const s = f.broken ? "読み込めない" : `縮尺 ${f.scale}（原寸 ${f.naturalWidth}px → ${f.renderedWidth}px）`;
    console.log(`  スマホ ${pad(f.screen)} 画面目: ${f.src} ${s}`);
  }
  const longest = [...mobile.gaps].sort((x, y) => y.screens - x.screens)[0];
  if (longest) console.log(`図の無い最長の区間（スマホ）: ${longest.screens} 画面（${longest.from} → ${longest.to}、${pad(longest.range[0])}〜${pad(longest.range[1])} 画面目）`);
}

main();

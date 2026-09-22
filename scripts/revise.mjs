#!/usr/bin/env node
/**
 * revise.mjs — 「固めた時点」を基準に、その後の直し・追記だけを色付きで見返す
 *
 * 使いどころ: ほぼ完成した本文に細かい修正や追記を入れたい時、公開後に一節を足したい時。
 * 「公開版かどうか」は問わない。固めたと思った時点で基準（baseline）を切り、あとは本文を
 * 直し続ければ、基準からの差分だけが HTML に出る。
 *
 * 使い方（<draft> は直している本文。draft_user.md でも draft.md でもよい）:
 *   node scripts/revise.mjs freeze <draft>    今の本文を基準として保存する（revision/baseline.md）
 *   node scripts/revise.mjs show   <draft>    基準と今の本文を比べ、revision/index.html を作る
 *   node scripts/revise.mjs status <draft>    基準の有無と日時を表示する
 *   node scripts/revise.mjs apply  <draft>    revision/draft_revision.md のマーカーを剥がして <draft> に書き戻す
 *
 * freeze を打ち直すと基準が更新され、前の基準は revision/_archive/baseline_{yyyymmddHHMM}.md に退避する。
 * 差分の正本は revision/draft_revision.md（{+ +} {- -} マーカー）。手で {? 確認メモ ?} を足してから
 * render-revision.mjs だけを再実行してもよい。
 * apply は {+ +} を採用し {- -} を捨て {? ?} を落とす。{? ?} が残っている時は未解決の確認があるとして止まる
 * （--force で無視して進める）。書き戻す前の <draft> は revision/_archive/before-apply_{yyyymmddHHMM}.md に退避する。
 *
 * 依存: scripts/diff-drafts.mjs と scripts/render-revision.mjs（どちらも Node 標準モジュールのみ）
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const force = argv.includes("--force");
const [cmd, draftArg] = argv.filter((a) => a !== "--force");
if (!cmd || !draftArg || !["freeze", "show", "status", "apply"].includes(cmd)) {
  console.error("usage: node scripts/revise.mjs <freeze|show|status|apply> <draft.md> [--force]");
  process.exit(1);
}
const draft = path.resolve(draftArg);
if (!fs.existsSync(draft)) { console.error(`not found: ${draftArg}`); process.exit(1); }

const dir = path.join(path.dirname(draft), "revision");
const baseline = path.join(dir, "baseline.md");
const revision = path.join(dir, "draft_revision.md");
const rel = (p) => path.relative(process.cwd(), p).replace(/\\/g, "/");
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
};

if (cmd === "status") {
  if (!fs.existsSync(baseline)) { console.log(`基準なし。固めるには: node scripts/revise.mjs freeze ${rel(draft)}`); process.exit(0); }
  const st = fs.statSync(baseline);
  console.log(`基準: ${rel(baseline)}（${st.mtime.toLocaleString("ja-JP")}）`);
  process.exit(0);
}

if (cmd === "freeze") {
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(baseline)) {
    const archive = path.join(dir, "_archive");
    fs.mkdirSync(archive, { recursive: true });
    const moved = path.join(archive, `baseline_${stamp()}.md`);
    fs.renameSync(baseline, moved);
    console.log(`前の基準を退避: ${rel(moved)}`);
  }
  fs.copyFileSync(draft, baseline);
  console.log(`基準を保存: ${rel(baseline)}（元: ${rel(draft)}）`);
  process.exit(0);
}

if (cmd === "apply") {
  if (!fs.existsSync(revision)) { console.error(`差分がありません: ${rel(revision)}`); process.exit(1); }
  let text = fs.readFileSync(revision, "utf8").replace(/\r\n?/g, "\n");
  const notes = text.match(/\{\?[\s\S]*?\?\}/g) ?? [];
  if (notes.length && !force) {
    console.error(`未解決の確認メモが ${notes.length} 件あります。解決してから apply するか、--force で無視します:`);
    for (const n of notes) console.error(`  ${n.slice(0, 80)}`);
    process.exit(1);
  }
  text = text
    .replace(/\{\?[\s\S]*?\?\}/g, "")           // 確認メモは本文に残さない
    .replace(/\{-[\s\S]*?-\}/g, "")             // 削除は捨てる
    .replace(/\{\+\s?([\s\S]*?)\s?\+\}/g, "$1")  // 追加は採用する
    .replace(/\n{3,}/g, "\n\n");
  const archive = path.join(dir, "_archive");
  fs.mkdirSync(archive, { recursive: true });
  const before = path.join(archive, `before-apply_${stamp()}.md`);
  fs.copyFileSync(draft, before);
  fs.writeFileSync(draft, text, "utf8");
  console.log(`書き戻し: ${rel(draft)}（直前の本文を退避: ${rel(before)}）`);
  process.exit(0);
}

// show
if (!fs.existsSync(baseline)) {
  console.error(`基準がありません。先に固めてください: node scripts/revise.mjs freeze ${rel(draft)}`);
  process.exit(1);
}
// Wix から取った本文（fetch-page）では画像が <!-- 画像: キャプション --> のプレースホルダーになり、
// 直後にキャプションの行が続く。基準に同じキャプション（title または alt）の図があればその行に戻し、
// リンクのプレビュー（直後が同じ文言のリンク行）はプレースホルダーを落とす。差分に図の消失が出ないようにする
function restoreImages(text, base) {
  const byCaption = new Map();
  const byPrev = new Map();   // キャプション無しの図は、直前の非空行が同じ図に当てる
  const baseLines = base.split("\n");
  for (let i = 0; i < baseLines.length; i++) {
    const line = baseLines[i];
    const m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
    if (!m) continue;
    if (m[3]) byCaption.set(m[3].trim(), line.trim());
    if (m[1]) byCaption.set(m[1].trim(), line.trim());
    let k = i - 1;
    while (k >= 0 && !baseLines[k].trim()) k--;
    if (k >= 0) byPrev.set(baseLines[k].trim(), line.trim());
  }
  const lines = text.split("\n");
  const out = [];
  const used = new Set();
  const pending = [];   // どの図にも当たらなかったキャプション無しの位置（out の index）
  let restored = 0, dropped = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*<!--\s*画像[:：]\s*(.*?)\s*-->\s*$/);
    if (!m) { out.push(lines[i]); continue; }
    const desc = m[1];
    if (!desc) {
      let k = out.length - 1;
      while (k >= 0 && !out[k].trim()) k--;
      const hitPrev = k >= 0 && byPrev.get(out[k].trim());
      if (hitPrev) { out.push(hitPrev); used.add(hitPrev); restored++; continue; }
      pending.push(out.length);
      out.push(lines[i]);
      continue;
    }
    // 直後の空行を挟んだ行
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const next = lines[j] ?? "";
    const link = next.match(/^\s*\[([^\]]+)\]\([^)]+\)\s*$/);
    if (desc && link && link[1].trim() === desc) { dropped++; continue; }           // リンクのプレビュー画像
    const hit = desc && byCaption.get(desc);
    if (hit) {
      out.push(hit); used.add(hit); restored++;
      if (next.trim() === desc) i = j;                                                // キャプション行は図の title に含まれる
      continue;
    }
    out.push(lines[i]);
  }
  // 残ったキャプション無しの位置には、基準の図のうち未使用の作図（images/*.png、Keynote の切り抜きでないもの）を
  // 出現順に当てる。著者が図の位置を動かした時の推定で、当てた図は報告に出す
  const spare = [...new Set(baseLines.map((l) => l.trim()).filter((l) => /^!\[.*\]\(images\/[^)]*\.png(\s|\))/.test(l) && !/images\/keynote-/.test(l) && !used.has(l)))];
  const guessed = [];
  for (const idx of pending) {
    const fig = spare.shift();
    if (!fig) break;
    out[idx] = fig; guessed.push(fig.match(/\(([^)\s]+)/)[1]); restored++;
  }
  return { text: out.join("\n"), restored, dropped, guessed };
}
const restoredDraft = restoreImages(fs.readFileSync(draft, "utf8"), fs.readFileSync(baseline, "utf8"));
const diffInput = path.join(dir, ".draft_for_diff.md");
fs.writeFileSync(diffInput, restoredDraft.text, "utf8");
if (restoredDraft.restored || restoredDraft.dropped) console.log(`図の復元: ${restoredDraft.restored} 枚を基準の図に戻し、リンクのプレビュー ${restoredDraft.dropped} 件を除外${restoredDraft.guessed.length ? `（位置から推定: ${restoredDraft.guessed.join(", ")}）` : ""}`);
try {
  execFileSync(process.execPath, [path.join(SCRIPT_DIR, "diff-drafts.mjs"), baseline, diffInput, "--out", revision], { stdio: "inherit" });
} finally {
  fs.rmSync(diffInput, { force: true });
}
execFileSync(process.execPath, [path.join(SCRIPT_DIR, "render-revision.mjs"), revision], { stdio: "inherit" });

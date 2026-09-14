#!/usr/bin/env node
/**
 * diff-drafts.mjs — 2つの Markdown（推敲前／推敲後）を比べ、差分をマーカー付き Markdown にする
 *
 * 出力は scripts/render-revision.mjs の入力形式（{+ 追加 +} / {- 削除 -}）。
 * 「公開した文章に対して、何を足して何を削ったか」を色付き HTML で見返すための前処理。
 *
 * 使い方:
 *   node scripts/diff-drafts.mjs <before.md> <after.md> [--out <revision.md>]
 *   --out 省略時は標準出力へ。通常は続けて render-revision.mjs に渡す:
 *   node scripts/diff-drafts.mjs published/X/draft_user.md output/X/draft_user.md --out output/X/revision/draft_revision.md
 *   node scripts/render-revision.mjs output/X/revision/draft_revision.md
 *
 * 比べ方（決定的・依存なし）:
 *   1. 段落（空行区切り）単位で LCS を取り、同一段落はそのまま通す
 *   2. 変わった区間は、前後の段落数が同じなら対応する段落どうしを文字単位の LCS で比べ、
 *      変更部分だけをマーカーで囲む（日本語は分かち書きが無いので文字単位）
 *   3. 段落数が違う区間は、段落ごとに丸ごと {- -} / {+ +} にする
 *   文字差分が段落の大半に及ぶ時（既定 60% 超）は、細切れにせず段落丸ごとの置き換えにする
 *
 * 見出し・区切り線（---）・リスト行も段落として扱う。マーカーは段落をまたがない。
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let out = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") { out = path.resolve(args[++i] ?? ""); continue; }
  files.push(args[i]);
}
if (files.length !== 2) {
  console.error("usage: node scripts/diff-drafts.mjs <before.md> <after.md> [--out <revision.md>]");
  process.exit(1);
}
const REPLACE_THRESHOLD = 0.6;

const read = (p) => fs.readFileSync(path.resolve(p), "utf8").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const paras = (t) => t.split(/\n\n/);

/** 汎用 LCS。等価判定は eq。戻り値は [{type:"same"|"del"|"add", a?, b?}] の列 */
function lcsDiff(A, B, eq) {
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(A[i], B[j])) { ops.push({ type: "same", a: A[i], b: B[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", a: A[i] }); i++; }
    else { ops.push({ type: "add", b: B[j] }); j++; }
  }
  while (i < n) ops.push({ type: "del", a: A[i++] });
  while (j < m) ops.push({ type: "add", b: B[j++] });
  return ops;
}

/** 文字単位の差分を、マーカー付きの1段落にする。変更率が高ければ null（丸ごと置換に回す） */
function charDiff(a, b) {
  const ops = lcsDiff([...a], [...b], (x, y) => x === y);
  const changed = ops.filter((o) => o.type !== "same").length;
  if (changed / Math.max(a.length, b.length, 1) > REPLACE_THRESHOLD) return null;
  let s = "";
  let run = null; // { type, text }
  const flush = () => {
    if (!run) return;
    s += run.type === "del" ? `{-${run.text}-}` : run.type === "add" ? `{+${run.text}+}` : run.text;
    run = null;
  };
  for (const o of ops) {
    const ch = o.type === "del" ? o.a : o.b;
    if (run && run.type === o.type) { run.text += ch; continue; }
    flush();
    run = { type: o.type, text: ch };
  }
  flush();
  return s;
}

const A = paras(read(files[0]));
const B = paras(read(files[1]));
const ops = lcsDiff(A, B, (x, y) => x === y);

const result = [];
let k = 0;
while (k < ops.length) {
  if (ops[k].type === "same") { result.push(ops[k].a); k++; continue; }
  // 変更区間を集める
  const dels = [], adds = [];
  while (k < ops.length && ops[k].type !== "same") {
    if (ops[k].type === "del") dels.push(ops[k].a); else adds.push(ops[k].b);
    k++;
  }
  // 追加側の順に並べ、似ている削除段落があれば対にして文字差分にする（段落の挿入で対応がずれても拾う）
  let remaining = dels.slice();
  const anyPair = adds.some((a) => remaining.some((d) => charDiff(d, a) !== null));
  if (!anyPair) {
    // 対応する段落が無い区間は、旧文（削除）を先に、新文（追加）を後に並べる
    for (const d of remaining) result.push(wrap("-", d));
    remaining = [];
  }
  for (const a of adds) {
    let idx = -1, merged = null;
    for (let t = 0; t < remaining.length; t++) {
      const m = charDiff(remaining[t], a);
      if (m !== null) { idx = t; merged = m; break; }
    }
    if (idx >= 0) {
      for (const d of remaining.splice(0, idx)) result.push(wrap("-", d));
      remaining.shift();
      result.push(merged);
    } else {
      result.push(wrap("+", a));
    }
  }
  for (const d of remaining) result.push(wrap("-", d));
}

/** 区切り線は編集対象にならないので素通しにする */
function wrap(sign, p) {
  if (/^-{3,}$/.test(p.trim())) return sign === "+" ? p : "";
  return `{${sign}${p}${sign}}`;
}

const text = result.filter((p) => p !== "").join("\n\n") + "\n";
const counts = { add: (text.match(/\{\+/g) || []).length, del: (text.match(/\{-/g) || []).length };
if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text, "utf8");
  console.log(`${path.relative(process.cwd(), out).replace(/\\/g, "/")}: 追加 ${counts.add} / 削除 ${counts.del}`);
} else {
  process.stdout.write(text);
}

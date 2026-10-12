#!/usr/bin/env node
/**
 * promote-to-public.mjs — 記事の作業層（output/）から公開層（published/）へ、公開してよい成果物だけを昇格させる
 *
 * /promote-to-public スキルの機械部分。ホワイトリストでコピーし、コピー後のファイルを
 * 公開に不向きな記述の典型（職場・進退の語彙、メールアドレス、個人マシンの絶対パス、鍵らしき文字列）で走査する。
 * 走査は見落とし防止の補助であり、5観点の通読（スキル側）の代替ではない。コミットはしない。
 *
 * 使い方:
 *   node scripts/promote-to-public.mjs <記事> [--with-review] [--dry-run]
 *   <記事>         output/ 配下のディレクトリ名（日付プレフィックス付き）か、テーマ名だけ（output/*_{テーマ} を探す）
 *   --with-review  review/ 配下の lens 別ファイルもコピーする（著者が工程ごと見せたい記事だけ）
 *   --dry-run      コピーせず、対象の一覧と上書きになるものだけを表示する
 *
 * ホワイトリスト: core.md / references.md / thinking.md / outline.md / draft.md / draft_user.md / draft_user_*.md / published.md
 * それ以外（references/ の raw 素材、map.*、wix*.json、wix-snapshots/、revision/、preview/、images/ 等）は指定されてもコピーしない。
 *
 * 依存: Node 標準モジュールのみ。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = path.join(ROOT, "output");
const PUB_ROOT = path.join(ROOT, "published");

const WHITELIST = [/^core\.md$/, /^references\.md$/, /^thinking\.md$/, /^outline\.md$/, /^draft\.md$/, /^draft_user(_[A-Za-z0-9-]+)?\.md$/, /^published\.md$/];
const REVIEW_FILE = /^(critique|drift|readers|author)_\d{2}\.md$/;

// 走査パターン。group はスキル側の5観点に対応する
const SCAN = [
  { group: "職場・進退", re: /離職|退職|転職|同僚|上司|部下|チームメンバー/g },
  { group: "メールアドレス", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { group: "絶対パス", re: /[A-Za-z]:\\Users\\|\/Users\/[^\s/]+|\/home\/[^\s/]+|file:\/\/\//g },
  { group: "鍵・トークン", re: /sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{10,}|AKIA[A-Z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{16,}|WIX_API_KEY\s*=/g },
];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: node scripts/promote-to-public.mjs <記事> [--with-review] [--dry-run]");
  process.exit(2);
}

const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");

function resolveArticle(name) {
  const direct = path.join(OUT_ROOT, name);
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;
  const hits = fs.existsSync(OUT_ROOT)
    ? fs.readdirSync(OUT_ROOT).filter((d) => d.endsWith(`_${name}`) && fs.statSync(path.join(OUT_ROOT, d)).isDirectory())
    : [];
  if (hits.length === 1) return path.join(OUT_ROOT, hits[0]);
  if (hits.length > 1) { console.error(`error: output/ に候補が複数ある: ${hits.join(", ")}。日付付きの名前で指定する`); process.exit(1); }
  console.error(`error: output/ に ${name} が見つからない`);
  process.exit(1);
}

const srcDir = resolveArticle(target);
const pubDir = path.join(PUB_ROOT, path.basename(srcDir));

// 対象の列挙
const files = [];
for (const f of fs.readdirSync(srcDir)) {
  if (WHITELIST.some((re) => re.test(f)) && fs.statSync(path.join(srcDir, f)).isFile()) files.push(f);
}
if (flags.has("--with-review")) {
  const rv = path.join(srcDir, "review");
  if (fs.existsSync(rv)) for (const f of fs.readdirSync(rv)) if (REVIEW_FILE.test(f)) files.push(path.join("review", f));
}
files.sort();

if (files.length === 0) { console.log(`コピー対象なし（${rel(srcDir)} にホワイトリストのファイルが無い）`); process.exit(0); }

console.log(`元: ${rel(srcDir)}\n先: ${rel(pubDir)}\n`);
console.log("コピー対象:");
for (const f of files) {
  const exists = fs.existsSync(path.join(pubDir, f));
  console.log(`  ${f}${exists ? "  （上書き）" : ""}`);
}

if (flags.has("--dry-run")) { console.log("\n--dry-run のためコピーしていない"); process.exit(0); }

// コピー
for (const f of files) {
  const dst = path.join(pubDir, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(srcDir, f), dst);
}
console.log(`\n${files.length} ファイルをコピーした`);

// 走査（コピー先を対象にする。output/ 側は読むだけ）
const hits = [];
for (const f of files) {
  const lines = fs.readFileSync(path.join(pubDir, f), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { group, re } of SCAN) {
      re.lastIndex = 0;
      const m = line.match(re);
      if (m) hits.push({ file: f, line: i + 1, group, text: line.trim().slice(0, 80) });
    }
  });
}
console.log("\n機械走査（補助。通読の代替ではない）:");
if (hits.length === 0) console.log("  該当なし");
for (const h of hits) console.log(`  ${h.file}:${h.line} [${h.group}] ${h.text}`);

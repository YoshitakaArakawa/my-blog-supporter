#!/usr/bin/env node
/**
 * render-revision.mjs — 公開済み記事の改訂案を、変更箇所だけ色付きで示す HTML に変換する
 *
 * 入力は「公開中の本文（draft_user.md 等）に、変更をマーカーで書き込んだ Markdown」。
 * 変換は scripts/render-preview.mjs に委ね、生成後の HTML でマーカーを色付きの要素に置き換える。
 * 正本はマーカー付き Markdown。出力 HTML は生成物であり、手で編集しない。
 *
 * マーカー（インラインでも段落全体でも使える。段落をまたがない）:
 *   {+ 追加する文 +}       緑
 *   {- 削除する文 -}       赤の取り消し線
 *   {? 著者への確認メモ ?}  黄。公開前に消す前提のメモ
 *
 * 使い方:
 *   node scripts/render-revision.mjs <revision.md> [--out <path>]
 *   --out 省略時: revision.md と同じディレクトリの index.html
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW = path.join(SCRIPT_DIR, "render-preview.mjs");

const args = process.argv.slice(2);
let src = null;
let out = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") { out = path.resolve(args[++i] ?? ""); continue; }
  src = path.resolve(args[i]);
}
if (!src || !fs.existsSync(src)) {
  console.error("usage: node scripts/render-revision.mjs <revision.md> [--out <path>]");
  process.exit(1);
}
out = out ?? path.join(path.dirname(src), "index.html");

// 画像パス（images/...）は記事ディレクトリ基準で書かれているので、revision/ の1つ上に一時コピーして描画する
const articleDir = path.basename(path.dirname(src)) === "revision" ? path.dirname(path.dirname(src)) : path.dirname(src);
const tmp = path.join(articleDir, ".draft_revision.tmp.md");
// 冒頭の ℹ️ 引き継ぎメモ（"> ℹ️" で始まる引用ブロック）は差分 HTML に出さない。
// 図の1行をマーカーで囲んだもの（{+ ![..](..) +} / {- ![..](..) -}）は、そのままでは figure にならず素の <img> になる。
// alt に印を付けた単独行に戻して描画し、後で figure に色を付ける
const md = fs.readFileSync(src, "utf8").replace(/^> ℹ️[\s\S]*?(?=\n\n(?!>))/m, "").replace(
  /^\{([+-])\s*!\[([^\]]*)\](\([^)]*\))\s*[+-]\}\s*$/gm,
  (_, k, alt, rest) => `![${k === "+" ? "REV_ADD::" : "REV_DEL::"}${alt}]${rest}`
);
// 未作図プレースホルダー（<!-- 画像: ... -->）をマーカーで包んだ行は、素の行に戻して説明に印を付ける
const md2 = md.replace(
  /^\{([+-])\s*<!--\s*画像[:：]\s*([\s\S]*?)\s*-->\s*[+-]\}\s*$/gm,
  (_, k, desc) => `<!-- 画像: ${k === "+" ? "【追加】" : "【削除】"}${desc} -->`
);
fs.writeFileSync(tmp, md2, "utf8");
try {
  execFileSync(process.execPath, [PREVIEW, tmp, "--out", out], { stdio: "inherit" });
} finally {
  fs.rmSync(tmp, { force: true });
}

let html = fs.readFileSync(out, "utf8");
const count = { add: 0, del: 0, note: 0 };
html = html.replace(/<figure>(\s*<img src="[^"]*" alt=")REV_(ADD|DEL)::/g, (_, pre, k) => {
  if (k === "ADD") count.add++; else count.del++;
  return `<figure class="${k === "ADD" ? "rev-add-fig" : "rev-del-fig"}">${pre}`;
});
html = html
  .replace(/\{\+\s?/g, () => { count.add++; return '<ins class="rev-add">'; })
  .replace(/\s?\+\}/g, "</ins>")
  .replace(/\{-\s?/g, () => { count.del++; return '<del class="rev-del">'; })
  .replace(/\s?-\}/g, "</del>")
  .replace(/\{\?\s?/g, () => { count.note++; return '<span class="rev-note">'; })
  .replace(/\s?\?\}/g, "</span>");

const css = `
  ins.rev-add { text-decoration: none; background: #e3f6e6; color: #14532d; border-bottom: 2px solid #34a853; padding: 0 .1em; }
  del.rev-del { background: #fde8e8; color: #9b1c1c; text-decoration: line-through; padding: 0 .1em; }
  figure.rev-add-fig { outline: 3px solid #34a853; outline-offset: 6px; background: #e3f6e6; }
  figure.rev-del-fig { outline: 3px solid #e02424; outline-offset: 6px; background: #fde8e8; opacity: .55; }
  figure.rev-del-fig figcaption { text-decoration: line-through; color: #9b1c1c; }
  .rev-note { background: #fff3bf; color: #7a5a00; font-size: .85em; padding: 0 .35em; border-radius: 3px; margin: 0 .2em; }
  .rev-legend {
    position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e3e3e3;
    font-size: 13px; line-height: 1.6; padding: 10px 20px; display: flex; gap: 18px; flex-wrap: wrap; align-items: center;
  }
  .rev-legend .k { display: inline-block; padding: 0 .4em; margin-right: .3em; }
  .rev-legend button { font: inherit; padding: 2px 10px; cursor: pointer; }
`;
const legend = `<div class="rev-legend">
  <span><span class="k" style="background:#e3f6e6;border-bottom:2px solid #34a853">追加</span>${count.add}</span>
  <span><span class="k" style="background:#fde8e8;text-decoration:line-through">削除</span>${count.del}</span>
  <span><span class="k" style="background:#fff3bf">要確認</span>${count.note}</span>
  <span style="color:#6b6b6b">色の無い本文は公開中と同じ</span>
  <button type="button" onclick="revJump(-1)">前の変更</button>
  <button type="button" onclick="revJump(1)">次の変更</button>
</div>`;
const script = `<script>
  (function(){
    var items = Array.prototype.slice.call(document.querySelectorAll("ins.rev-add, del.rev-del, figure.rev-add-fig, figure.rev-del-fig"));
    var cur = -1;
    window.revJump = function(d){
      if (!items.length) return;
      cur = (cur + d + items.length) % items.length;
      items.forEach(function(e){ e.style.outline = ""; });
      items[cur].style.outline = "2px solid #1b6ec2";
      items[cur].scrollIntoView({ block: "center", behavior: "smooth" });
    };
  })();
</script>`;

html = html
  .replace("</style>", `${css}</style>`)
  .replace("<body>", `<body>${legend}`)
  .replace("</body>", `${script}</body>`);
fs.writeFileSync(out, html, "utf8");
console.log(`${path.relative(process.cwd(), out).replace(/\\/g, "/")}: 追加 ${count.add} / 削除 ${count.del} / 要確認 ${count.note}`);

#!/usr/bin/env node
/**
 * render-slides.mjs — deck.md とテンプレートの定義から、スライドの一覧（preview/slides.html）を作る
 *
 * 組む前に、形をクイックに合意するための一覧。Slides と同じ定義（位置・大きさ・書体・色・行間）で文字を並べ、
 * ブラウザで文字の溢れ・行数・最小文字・コントラスト・重なりを測って、警告を各スライドの下に出す。プレゼンテーションモードは持たない。
 * 生成物なので手で直さない。直すのは deck.md の中身か、テンプレートの定義。
 *
 * 使い方:
 *   node render-slides.mjs <deck.md> [--template navy] [--out <html>]
 *   node render-slides.mjs <deck.md> --measure [--template navy]   一覧を作り、ブラウザで測った結果（JSON）を標準出力に出す
 *   node render-slides.mjs <deck.md> --frames [--template navy]    `見せる:` の枠ごとに、図を描く寸法（px）と最小の文字（px）を出す
 *
 * 既定の出力は deck.md と同じ階層の preview/slides.html。図は `見せる:` のパス（deck.md からの相対）で読む。
 * 見るときは .claude/launch.json の preview サーバー経由で /output/{登壇}/preview/slides.html を開く。
 * --measure は playwright-cli を使う（スクリプトの中で開いて閉じる）。リポジトリのルートで実行し、後で .playwright-cli/ を消す。
 * --frames の寸法は「枠の大きさ（in）× FIGURE_PX_PER_IN」。この縦横比で描けば図は枠いっぱいに置かれ、1px = 72 / FIGURE_PX_PER_IN pt になる。
 */
import fs from "node:fs";
import path from "node:path";
import { loadTemplate, deckModels, minFontPt, isMain, slotLabel, colorHex, todoColor } from "./lib/template.mjs";
import { pageHtml, measure } from "./lib/page.mjs";

/** deck.md の1枚の組み立て図を、測る箱の並びにする */
export function modelPage(tpl, m, ctx) {
  const boxes = m.slots.filter((s) => s.paras.length).map((s) => ({
    kind: "text", id: `s${m.index}_${s.slot}`, label: slotLabel(s.slot), ...pick(s.box), inset: tpl.inset,
    color: colorHex(tpl, s.box.color), maxLines: s.box.maxLines ?? (s.slot === "title" ? 2 : null), paras: s.paras,
  }));
  if (m.visual && m.frame) {
    const f = m.frame;
    if (m.visual.kind === "image") {
      const abs = path.resolve(ctx.deckDir, m.visual.path);
      const ok = fs.existsSync(abs);
      if (!ok) m.issues.push(`画像が見つかりません: ${m.visual.path}`);
      boxes.push({ kind: "image", id: `s${m.index}_img`, ...f, path: m.visual.path, src: ok ? path.relative(ctx.outDir, abs).replace(/\\/g, "/") : null });
    } else {
      boxes.push({ kind: "todo", id: `s${m.index}_todo`, ...f, text: m.visual.text, size: tpl.todoFrame?.size ?? 18, color: todoColor(tpl, m.layout) });
    }
  }
  return {
    index: m.index,
    title: `${m.heading}${m.provisional ? "（仮）" : ""}`,
    sub: m.layoutName,
    bg: colorHex(tpl, m.layout.background),
    bgImage: Boolean(m.layout.backgroundImage),
    boxes,
    warnings: m.issues,
  };
}

// スライド用の図の解像度。幅 10in のページで 1920px（1px = 0.375pt）になる値
export const FIGURE_PX_PER_IN = 192;

/** `見せる:` の枠ごとに、図の寸法と最小の文字の大きさ（px）を返す */
export function frameSizes(tpl, deckPath) {
  const { event, models } = deckModels(tpl, deckPath);
  const minPt = minFontPt(event) ?? 18;
  return models.filter((m) => m.visual && m.frame).map((m) => ({
    index: m.index, layout: m.layoutName, visual: m.visual.kind === "image" ? m.visual.path : m.visual.text,
    frameIn: { w: m.frame.w, h: m.frame.h },
    canvasPx: { w: Math.round(m.frame.w * FIGURE_PX_PER_IN), h: Math.round(m.frame.h * FIGURE_PX_PER_IN) },
    minTextPx: Math.ceil((minPt * FIGURE_PX_PER_IN) / 72),
  }));
}

const pick = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, size: b.size, bold: b.bold, align: b.align, anchor: b.anchor, spaceBelow: b.spaceBelow, font: b.font, lineSpacing: b.lineSpacing });

export function renderHtml(tpl, deckPath, outPath) {
  const { title, event, models } = deckModels(tpl, deckPath);
  const ctx = { deckDir: path.dirname(deckPath), outDir: path.dirname(outPath) };
  const minPt = minFontPt(event);
  const pages = models.map((m) => modelPage(tpl, m, ctx));
  const summary = `${models.length}枚 ／ テンプレート ${tpl.label ?? tpl.id} ／ 最小文字 ${minPt ? `${minPt}pt（event.md）` : "event.md に無し"}`;
  const html = pageHtml({ title: title ?? "スライドの一覧", summary, pages, page: tpl.page, font: tpl.font, minPt })
    .replace("<head>", `<head>\n<!-- 生成物: deck.md とテンプレートの定義（${path.basename(path.dirname(tpl.file))}）から render-slides.mjs が作る。直しは deck.md か定義に入れ、このファイルは編集しない -->`);
  fs.mkdirSync(ctx.outDir, { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  return { slides: models.length, issues: pages.flatMap((p) => p.warnings.map((w) => [p.index, w])) };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const deckPath = args.find((a) => a.endsWith(".md"));
  if (!deckPath) { console.error("usage: node render-slides.mjs <deck.md> [--template navy] [--out <html>] [--measure]"); process.exit(1); }
  const tpl = loadTemplate(opt("--template") ?? "navy");
  if (args.includes("--frames")) {
    for (const f of frameSizes(tpl, path.resolve(deckPath))) console.log(`s${f.index} ${f.layout}: 枠 ${f.frameIn.w}×${f.frameIn.h}in → 図 ${f.canvasPx.w}×${f.canvasPx.h}px、文字は ${f.minTextPx}px 以上（${f.visual.slice(0, 40)}）`);
    return;
  }
  const out = path.resolve(opt("--out") ?? path.join(path.dirname(deckPath), "preview", "slides.html"));
  const r = renderHtml(tpl, path.resolve(deckPath), out);
  console.error(`スライドの一覧を書き出しました: ${out}（${r.slides}枚）`);
  for (const [i, m] of r.issues) console.error(`! s${i}: ${m}`);
  if (args.includes("--measure")) process.stdout.write(JSON.stringify(measure(out), null, 1));
}

if (isMain(import.meta.url)) main();

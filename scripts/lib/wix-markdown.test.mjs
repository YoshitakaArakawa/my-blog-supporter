// wix-markdown.mjs のテスト。実行: node --test scripts/lib/
// 値はすべてダミー（実在の記事・Media ID・URL を使わない）
import assert from "node:assert/strict";
import test from "node:test";
import {
  canonical, controlReplacer, fromRicos, inlineNodes, parseDocument, parseInline, plainInline, STYLES, toRicos,
} from "./wix-markdown.mjs";

const T = (text, decorations = []) => ({ type: "TEXT", id: "", nodes: [], textData: { text, decorations } });
const P = (nodes, data = {}) => ({ type: "PARAGRAPH", id: "p", nodes, paragraphData: data });
const E = () => P([]);
const link = (url) => ({ type: "LINK", linkData: { link: { url, target: "BLANK", rel: { noreferrer: true } } } });
const color = (c) => ({ type: "COLOR", colorData: { foreground: c } });
const ACCENT = STYLES.accent.color;

// pull → push を Wix を呼ばずに通す
function roundtrip(nodes, state = {}) {
  const r = fromRicos(nodes, { imageMap: state.imageMap ?? {}, localMedia: state.localMedia ?? {} });
  const { blocks } = parseDocument(`# タイトル\n\n${r.md}`);
  const { pool, replace } = controlReplacer(r.controls);
  const back = toRicos(blocks, {
    image: (b) => (b.src.startsWith("wix:") ? { id: b.src.slice(4), ...r.media[b.src.slice(4)] } : state.localMedia[b.src]),
    embeds: r.embeds, wixBlocks: r.wixBlocks, replace,
  });
  return { r, back, unused: pool.filter((c) => !c.used) };
}

test("インライン: 名前付きの色・下線・太字・リンク", () => {
  const segs = parseInline("前[色]{.accent}と[下線]{.u}と**[両方]{.accent .u}**と[リンク](https://example.com/a)");
  assert.deepEqual(segs.map((s) => [s.text, s.decos.map((d) => d.type).join("+")]), [
    ["前", ""], ["色", "COLOR"], ["と", ""], ["下線", "UNDERLINE"], ["と", ""], ["両方", "BOLD+COLOR+UNDERLINE"], ["と", ""], ["リンク", "LINK"],
  ]);
  const nodes = inlineNodes("[リンク](https://example.com/a)");
  assert.deepEqual(nodes[0].textData.decorations.map((d) => d.type), ["LINK", "UNDERLINE"]);
  assert.equal(inlineNodes("[x]{color=#123456}")[0].textData.decorations[0].colorData.foreground, "#123456");
});

test("インライン: エスケープ・改行・知らない名前・差分の印", () => {
  assert.equal(plainInline("\\*星\\* と \\[角括弧\\]"), "*星* と [角括弧]");
  assert.equal(plainInline("一行目<br>二行目"), "一行目\n二行目");
  assert.throws(() => inlineNodes("[x]{.unknown}"), /知らない記法/);
  assert.equal(plainInline("[x]{.unknown}"), "[x]{.unknown}");
  assert.equal(plainInline("[x]{+ 足す +}"), "[x]{+ 足す +}");
  assert.equal(plainInline("5 * 3 * 2"), "5 * 3 * 2");
});

test("往復: 装飾・リスト・引用・コード・区切り線・画像・埋め込みが元に戻る", () => {
  const nodes = [
    { type: "HEADING", id: "h", nodes: [T("見出し")], headingData: { level: 2, textStyle: { textAlignment: "AUTO" } } },
    E(),
    P([T("前置き"), T("強調", [color(ACCENT)]), T("と"), T("任意の色", [color("#123456"), { type: "BOLD", fontWeightValue: 700 }]), T("と"), T("下線", [{ type: "UNDERLINE" }]), T("と"), T("リンク", [link("https://example.com/a")])]),
    E(),
    P([T("# 見出しに見える文と * 星 と [角括弧]")]),
    E(),
    { type: "BULLETED_LIST", id: "l", bulletedListData: { indentation: 0 }, nodes: [
      { type: "LIST_ITEM", id: "", nodes: [P([T("項目1")]), { type: "ORDERED_LIST", id: "", orderedListData: { indentation: 0 }, nodes: [{ type: "LIST_ITEM", id: "", nodes: [P([T("入れ子")])] }] }] },
      { type: "LIST_ITEM", id: "", nodes: [P([T("項目2\n続き")])] },
    ] },
    E(),
    { type: "BLOCKQUOTE", id: "q", blockquoteData: { indentation: 0 }, nodes: [P([T("引用1")]), P([T("引用2")])] },
    E(),
    { type: "CODE_BLOCK", id: "c", codeBlockData: {}, nodes: [T("see "), T("docs", [link("https://example.com/d"), { type: "UNDERLINE" }])] },
    E(), E(),
    { type: "DIVIDER", id: "d", nodes: [], dividerData: { lineStyle: "SINGLE", width: "MEDIUM", alignment: "CENTER" } },
    { type: "IMAGE", id: "i", nodes: [{ type: "CAPTION", id: "", nodes: [T("参考："), T("出典", [link("https://example.com/s"), { type: "UNDERLINE" }])] }],
      imageData: { containerData: { width: { size: "SMALL" }, alignment: "CENTER", textWrap: true }, image: { src: { id: "dummy_0001~mv2.png" }, width: 1600, height: 900 }, caption: "参考：出典" } },
    E(), E(),
    { type: "HTML", id: "x1", nodes: [], htmlData: { containerData: { width: { custom: "500" }, height: { custom: "800" }, alignment: "CENTER", spoiler: {}, textWrap: true },
      html: '<blockquote class="twitter-tweet"><p>本文</p><a href="https://x.com/example/status/123?ref_src=twsrc">日付</a></blockquote>\n<script async src="https://platform.x.com/widgets.js"></script>', source: "HTML" } },
    E(),
    { type: "VIDEO", id: "v1", nodes: [], videoData: { video: { src: { url: "https://example.com/v" } } } },
  ];
  const { r, back, unused } = roundtrip(nodes);
  assert.match(r.md, /\[強調\]\{\.accent\}/);
  assert.match(r.md, /\*\*\[任意の色\]\{color=#123456\}\*\*/);
  assert.match(r.md, /\[下線\]\{\.u\}/);
  assert.match(r.md, /^\\# 見出しに見える文と \\\* 星 と \\\[角括弧\\\]$/m);
  assert.match(r.md, /^---\{width=medium\}$/m);
  assert.match(r.md, /^!\[\]\(wix:dummy_0001~mv2\.png "参考：\[出典\]\(https:\/\/example\.com\/s\)"\)\{width=small\}$/m);
  assert.match(r.md, /^::x\{url=https:\/\/x\.com\/example\/status\/123 width=500 height=800\}$/m);
  assert.match(r.md, /^::wix\{type=VIDEO id=v1\}$/m);
  assert.equal(r.controls.length, 0);
  assert.equal(unused.length, 0);
  assert.equal(canonical(back), canonical(nodes));
});

test("往復: 書けない設定は控えで戻り、直すと控えが余る", () => {
  const nodes = [P([T("中央揃え")], { textStyle: { textAlignment: "CENTER" } }), E(), P([T("普通")])];
  const { r, back, unused } = roundtrip(nodes);
  assert.equal(r.controls.length, 1);
  assert.deepEqual(r.controls[0].lost, ["段落の設定"]);
  assert.equal(unused.length, 0);
  assert.equal(canonical(back), canonical(nodes));

  const edited = r.md.replace("中央揃え", "中央揃えを直した");
  const { replace, pool } = controlReplacer(r.controls);
  toRicos(parseDocument(`# t\n\n${edited}`).blocks, { replace });
  assert.equal(pool.filter((c) => !c.used).length, 1);
});

test("往復: 同じ見た目のブロックが複数あっても、控えは何番目かで当たる", () => {
  const div = (width) => ({ type: "DIVIDER", id: "", nodes: [], dividerData: { lineStyle: "SINGLE", width, alignment: "CENTER" } });
  const dashed = { type: "DIVIDER", id: "", nodes: [], dividerData: { lineStyle: "DASHED", width: "LARGE", alignment: "CENTER" } };
  const nodes = [P([T("a")]), E(), div("LARGE"), P([T("b")]), E(), dashed, P([T("c")])];
  const { r, back } = roundtrip(nodes);
  assert.equal(r.controls.length, 1);
  assert.equal(r.controls[0].nth, 1);
  assert.equal(canonical(back), canonical(nodes));
});

test("push: 新しく書いた ::x と画像の属性", () => {
  const md = "# t\n\n::x{url=\"https://x.com/example/status/999\"}\n\n![図](images/a.png \"キャプション\"){width=content align=left}\n\n---{width=small}";
  const nodes = toRicos(parseDocument(md).blocks, { image: () => ({ id: "dummy_a", width: 500, height: 1000 }) });
  const [x, , , img, , , dv] = nodes;
  assert.equal(x.type, "HTML");
  assert.match(x.htmlData.html, /twitter-tweet.*https:\/\/x\.com\/example\/status\/999/);
  assert.deepEqual(x.htmlData.containerData.height, { custom: "700" });
  assert.deepEqual(img.imageData.containerData, { width: { size: "CONTENT" }, alignment: "LEFT", textWrap: true });
  assert.equal(img.imageData.caption, "キャプション");
  assert.equal(img.imageData.altText, "図");
  assert.equal(dv.dividerData.width, "SMALL");
  assert.throws(() => parseDocument("# t\n\n![x](a.png){width=huge}"), /画像の属性/);
  assert.throws(() => parseDocument("# t\n\n::x{url=https://example.com/a}"), /::x には/);
  assert.throws(() => parseDocument("# t\n\n---{width=wide}"), /区切り線の属性/);
});

test("旧形式: 画像の印は数が控えと同じ時だけ順に割り当て、違えば止まる", () => {
  const wixImages = [
    { caption: "", captionMd: "", alt: "", id: "dummy_1", width: 10, height: 20 },
    { caption: "", captionMd: "", alt: "", id: "dummy_2", width: 10, height: 20 },
  ];
  const ok = parseDocument("# t\n\n<!-- 画像:  -->\n\n本文\n\n<!-- 画像:  -->", { wixImages });
  assert.deepEqual(ok.blocks.filter((b) => b.kind === "legacyImage").map((b) => b.wix.id), ["dummy_1", "dummy_2"]);
  assert.throws(() => parseDocument("# t\n\n<!-- 画像:  -->\n\n本文", { wixImages }), /2 個から 1 個/);
  const ph = parseDocument("# t\n\n<!-- 画像: まだ描いていない図 -->", { wixImages });
  assert.equal(ph.blocks[0].text, "［画像（未作図）: まだ描いていない図］");
});

test("著者向けメモ（ℹ️ の引用）とコメントは送らない", () => {
  const { title, blocks } = parseDocument("> ℹ️ メモ\n> 続き\n\n# タイトル\n\n<!-- コメント -->\n\n本文");
  assert.equal(title, "タイトル");
  assert.deepEqual(blocks.map((b) => b.kind), ["paragraph"]);
});

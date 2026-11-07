/**
 * wix-markdown.mjs — 記事の Markdown（拡張記法つき）と Wix の Ricos JSON を相互に変換する
 *
 * 記法の正本: .claude/skills/wix-sync/references/markdown-extensions.md
 * 名前付きの装飾（{.accent} など）の正本: scripts/wix-styles.json
 *
 * 使う側:
 *   wix-sync.mjs        push（parseDocument → toRicos）と pull（fromRicos。往復の検算と控えもここで作る）
 *   render-preview.mjs  インラインの解析（parseInline）と、画像・埋め込みの行の解析
 *   lint-draft.mjs      記法を外した素の文字列（plainInline）
 *
 * 往復の決まり: pull が書いた Markdown を何も変えずに push すると、Wix の下書きは変わらない。
 * Markdown から同じノードに戻せない段落（文字サイズ・文字揃え・画像の切り抜きなど）は、
 * fromRicos が controls に控え、push は同じ段落が来たら控えのノードを送る。
 *
 * 依存: Node 標準モジュールのみ。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const STYLES = JSON.parse(fs.readFileSync(path.join(LIB_DIR, "..", "wix-styles.json"), "utf8")).styles;

// ---------- 共通 ----------

export const textNode = (s, decorations = []) => ({ type: "TEXT", id: "", nodes: [], textData: { text: s, decorations } });
export const emptyPara = () => ({ type: "PARAGRAPH", id: "", nodes: [], paragraphData: {} });
export const plainText = (n) => (n.nodes ?? []).map((x) => x.textData?.text ?? plainText(x)).join("");
export const isEmptyPara = (n) => n.type === "PARAGRAPH" && (n.nodes ?? []).every((x) => x.type === "TEXT" && !x.textData?.text?.trim());
const isList = (n) => n?.type === "BULLETED_LIST" || n?.type === "ORDERED_LIST";
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// 空段落の既定の数は著者の Wix テンプレート（下書き「Template」と公開記事）に合わせる:
// 区切り線の前は2つ・直後は0、画像の前後は2つ、それ以外のブロックの間は1つ、先頭と末尾は0
export const defaultGap = (prev, cur) => {
  if (!prev || !cur || prev.type === "DIVIDER") return 0;
  return cur.type === "DIVIDER" || cur.type === "IMAGE" || prev.type === "IMAGE" ? 2 : 1;
};

// 画像の既定の幅。縦長（スマホのスクリーンショット）は SMALL、それ以外は CONTENT
export const defaultWidth = (w, h) => (h > w ? "SMALL" : "CONTENT");
const WIDTH_NAMES = { small: "SMALL", content: "CONTENT", full: "FULL_WIDTH", original: "ORIGINAL" };
const ALIGN_NAMES = { left: "LEFT", center: "CENTER", right: "RIGHT" };
const DIVIDER_WIDTHS = { small: "SMALL", medium: "MEDIUM", large: "LARGE" };
const COLOR_VALUE = /^(#[0-9a-fA-F]{6}|rgba?\([\d\s.,%]+\))$/;
// X のポストの埋め込み。高さは Wix の HTML ノードが持つ枠の高さで、ポストの長さに合わせて著者が Wix で調整する
const X_STATUS = /https:\/\/(?:x|twitter)\.com\/[^\s"'?<>/]+\/status\/\d+/g;
const X_DEFAULT = { width: "500", height: "700" };
const xHtml = (url) => `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>\n<script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>`;

// 装飾が同じ TEXT が隣り合っていたら先に連結する（「[A](u)[B](u)」に割れないため）
export function mergeText(nodes) {
  const merged = [];
  for (const n of nodes ?? []) {
    const prev = merged.at(-1);
    if (n.type === "TEXT" && prev?.type === "TEXT" &&
        JSON.stringify(prev.textData.decorations ?? []) === JSON.stringify(n.textData.decorations ?? [])) {
      merged[merged.length - 1] = { ...prev, textData: { ...prev.textData, text: prev.textData.text + n.textData.text } };
    } else merged.push(n);
  }
  return merged;
}

// ---------- 属性 {…} ----------

const ATTR_TOKEN = /\.([\w-]+)|([\w-]+)=(?:"((?:[^"\\]|\\.)*)"|([^\s"]+))|(\S+)/g;

/** `.name key=value key="v a l"` を { classes, kv } にする。属性の形でなければ null */
export function parseAttrs(src) {
  const out = { classes: [], kv: {} };
  let any = false;
  for (const m of src.matchAll(ATTR_TOKEN)) {
    if (m[5] !== undefined) return null;
    any = true;
    if (m[1]) out.classes.push(m[1]);
    else out.kv[m[2]] = m[3] !== undefined ? m[3].replace(/\\(.)/g, "$1") : m[4];
  }
  return any ? out : null;
}

export function formatAttrs({ classes = [], kv = {} }) {
  const parts = classes.map((c) => `.${c}`);
  for (const [k, v] of Object.entries(kv)) parts.push(/^[^\s"{}\\]+$/.test(v) ? `${k}=${v}` : `${k}="${v.replace(/["\\]/g, "\\$&")}"`);
  return `{${parts.join(" ")}}`;
}

// ---------- インライン: Markdown → 区切り ----------

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!<>:|~"]/;
const BR = /^<br\s*\/?>/i;

/** [テキスト]{…} の属性を装飾にする。知らない名前は strict なら止め、そうでなければ字面のまま残す（null） */
function spanDecos(attrs, raw, strict) {
  const decos = [];
  let unknown = null;
  for (const c of attrs.classes) {
    if (c === "u") decos.push({ type: "UNDERLINE" });
    else if (STYLES[c]) {
      if (STYLES[c].color) decos.push({ type: "COLOR", color: STYLES[c].color });
      if (STYLES[c].underline) decos.push({ type: "UNDERLINE" });
    } else unknown = `.${c}`;
  }
  for (const [k, v] of Object.entries(attrs.kv)) {
    if (k === "color" && COLOR_VALUE.test(v)) decos.push({ type: "COLOR", color: v });
    else unknown = `${k}=${v}`;
  }
  if (!unknown) return decos;
  if (strict) {
    const names = ["u", ...Object.keys(STYLES)].map((x) => `.${x}`).join("・");
    throw new Error(`知らない記法 {${raw}}（${unknown}）。使えるのは ${names} と color=#RRGGBB`);
  }
  return null;
}

function matchBracket(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "`") { const k = s.indexOf("`", j + 1); if (k > j) { j = k; continue; } }
    if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return j;
  }
  return -1;
}

// リンク先の閉じ括弧。URL の中の対になった括弧は許し、空白があればリンクとみなさない
function linkEnd(s, open) {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    const c = s[k];
    if (/\s/.test(c)) return -1;
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return k > open + 1 ? k : -1;
  }
  return -1;
}

// 強調の閉じ。太字（**）の探索では斜体の * を、斜体の探索では太字の ** を飛ばす
function closeEmphasis(s, from, dbl) {
  for (let j = from; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "`") { const k = s.indexOf("`", j + 1); if (k > j) { j = k; continue; } }
    if (c !== "*") continue;
    if (dbl) {
      if (s[j + 1] === "*" && j > from && !/\s/.test(s[j - 1])) return j;
      if (s[j + 1] === "*") j++;
    } else if (s[j + 1] === "*") j++;
    else if (j > from && !/\s/.test(s[j - 1])) return j;
  }
  return -1;
}

/**
 * インラインの Markdown を、装飾付きの区切り [{ text, decos }] にする。
 * decos の type: BOLD / ITALIC / CODE / LINK（url）/ COLOR（color）/ UNDERLINE
 * opts.strict: 知らない {.名前} で止める（push 用）。既定は字面のまま残す（プレビュー・lint 用）
 */
export function parseInline(s, opts = {}, decos = []) {
  const out = [];
  let buf = "";
  const flush = () => { if (buf) out.push({ text: buf, decos }); buf = ""; };
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.test(s[i + 1])) { buf += s[i + 1]; i += 2; continue; }
    if (c === "<") {
      const m = s.slice(i).match(BR);
      if (m) { buf += "\n"; i += m[0].length; continue; }
    }
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i + 1) { flush(); out.push({ text: s.slice(i + 1, j), decos: [...decos, { type: "CODE" }] }); i = j + 1; continue; }
    }
    if (c === "*") {
      const dbl = s[i + 1] === "*";
      const w = dbl ? 2 : 1;
      if (s[i + w] && !/\s/.test(s[i + w])) {
        const j = closeEmphasis(s, i + w, dbl);
        if (j > i + w) {
          flush();
          out.push(...parseInline(s.slice(i + w, j), opts, [...decos, { type: dbl ? "BOLD" : "ITALIC" }]));
          i = j + w;
          continue;
        }
      }
    }
    if (c === "[") {
      const j = matchBracket(s, i);
      if (j > 0 && s[j + 1] === "(") {
        const k = linkEnd(s, j + 1);
        if (k > 0) {
          flush();
          out.push(...parseInline(s.slice(i + 1, j), opts, [...decos, { type: "LINK", url: s.slice(j + 2, k) }]));
          i = k + 1;
          continue;
        }
      } else if (j > 0 && s[j + 1] === "{") {
        const k = s.indexOf("}", j + 2);
        const raw = k > 0 ? s.slice(j + 2, k) : "";
        const attrs = k > 0 ? parseAttrs(raw) : null;
        const extra = attrs && spanDecos(attrs, raw, opts.strict);
        if (extra) {
          flush();
          out.push(...parseInline(s.slice(i + 1, j), opts, [...decos, ...extra]));
          i = k + 1;
          continue;
        }
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

/** 記法を外した素の文字列（lint 用） */
export const plainInline = (s) => parseInline(s).map((x) => x.text).join("");

// インラインコードは Wix に対応する装飾が無いので地の文で送る（変換 API の頃と同じ）
function ricosDecos(decos) {
  const out = [];
  const has = (t) => decos.some((d) => d.type === t);
  if (has("BOLD")) out.push({ type: "BOLD", fontWeightValue: 700 });
  if (has("ITALIC")) out.push({ type: "ITALIC", italicData: true });
  const color = decos.findLast((d) => d.type === "COLOR")?.color;
  if (color) out.push({ type: "COLOR", colorData: { foreground: color } });
  const url = decos.findLast((d) => d.type === "LINK")?.url;
  if (url) out.push({ type: "LINK", linkData: { link: { url, target: "BLANK", rel: { noreferrer: true } } } });
  // Wix の編集画面はリンクに必ず下線を付ける。push でも同じ形にする
  if (url || has("UNDERLINE")) out.push({ type: "UNDERLINE" });
  return out;
}

/** インラインの Markdown を Ricos の TEXT ノードの列にする */
export function inlineNodes(s) {
  const nodes = [];
  for (const seg of parseInline(s, { strict: true })) {
    const decorations = ricosDecos(seg.decos);
    const prev = nodes.at(-1);
    if (prev && JSON.stringify(prev.textData.decorations) === JSON.stringify(decorations)) prev.textData.text += seg.text;
    else nodes.push(textNode(seg.text, decorations));
  }
  return nodes;
}

// ---------- インライン: Ricos → Markdown ----------

const escapeInline = (s) => s.replace(/[\\`*[\]]/g, "\\$&").replace(/<(br\s*\/?>)/gi, "\\<$1");
const styleFor = (color) => Object.entries(STYLES).find(([, v]) => v.color?.toLowerCase() === color.toLowerCase() && !v.underline)?.[0];

/** TEXT ノードの列を拡張記法の Markdown にする（前後の空白は残す。呼ぶ側が trim する） */
export function inlineMd(nodes) {
  let s = "";
  for (const n of mergeText(nodes)) {
    if (n.type !== "TEXT") { s += inlineMd(n.nodes); continue; }
    const decos = n.textData.decorations ?? [];
    // 装飾は前後の空白の外側に付ける（「** 太字**」にしない）
    const [, lead, core, trail] = n.textData.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    let t = escapeInline(core);
    if (t) {
      // 内側から 色・下線 → リンク → 斜体 → 太字 の順に包む（**[強調]{.accent}** の形）
      const link = decos.find((d) => d.type === "LINK")?.linkData?.link?.url;
      const span = { classes: [], kv: {} };
      const fg = decos.find((d) => d.type === "COLOR")?.colorData?.foreground;
      if (fg) { const name = styleFor(fg); if (name) span.classes.push(name); else span.kv.color = fg; }
      if (!link && decos.some((d) => d.type === "UNDERLINE")) span.classes.push("u");
      if (span.classes.length || Object.keys(span.kv).length) t = `[${t}]${formatAttrs(span)}`;
      if (link) t = `[${t}](${link})`;
      if (decos.some((d) => d.type === "ITALIC" && d.italicData !== false)) t = `*${t}*`;
      // Wix は太字を fontWeightValue で持つ。セミボールド（600）以上を太字とみなす
      if (decos.some((d) => d.type === "BOLD" && (d.fontWeightValue ?? 700) >= 600)) t = `**${t}**`;
    }
    s += lead + t + trail;
  }
  return s;
}

// 行頭でブロックの記法に読まれる文字は \ で守る（段落の文字が見出し・リスト・引用にならないため）
const LINE_START = /^(?:#{1,6}(?:\s|$)|>|[-+*][ \t]|```|<!--|::|-{3,}\s*(?:\{.*)?$|_{3,}\s*$)/;
function escapeLines(s) {
  return s.split("\n").map((l) => {
    if (/^\d+[.)][ \t]/.test(l)) return l.replace(/^(\d+)([.)])/, "$1\\$2");
    return LINE_START.test(l) ? `\\${l}` : l;
  }).join("\n");
}

// ---------- コードブロック ----------

// コードブロックの中のリンクの書き方。URL は http(s) に限り、コードとしての [x](y) は字面のまま残す
export const CODE_LINK = /\[([^[\]\n]+)\]\((https?:\/\/[^\s()]+)\)/;
const linkDecos = (url) => [
  { type: "LINK", linkData: { link: { url, target: "BLANK", rel: { noreferrer: true } } } },
  { type: "UNDERLINE" },
];

/** コードブロックの中身を、[テキスト](URL) をリンクの付いた TEXT にして組み直す。リンクが無ければ null */
export function codeNodes(s) {
  const out = [];
  let i = 0;
  for (const m of s.matchAll(new RegExp(CODE_LINK.source, "g"))) {
    if (m.index > i) out.push(textNode(s.slice(i, m.index)));
    out.push(textNode(m[1], linkDecos(m[2])));
    i = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (i < s.length) out.push(textNode(s.slice(i)));
  return out;
}

/** コードブロックの中身を Markdown にする。リンクは [テキスト](URL) で書く */
export function codeMd(n) {
  let md = "";
  for (const x of mergeText(n.nodes).filter((y) => y.textData?.text !== "")) {
    const t = x.textData?.text ?? plainText(x);
    const url = x.textData?.decorations?.find((d) => d.type === "LINK")?.linkData?.link?.url;
    const link = url ? `[${t}](${url})` : null;
    md += link && new RegExp(`^${CODE_LINK.source}$`).test(link) ? link : t;
  }
  return { md };
}

// ---------- ブロック: Markdown → ブロック列 ----------

const LIST_RE = /^(\s*)([-+*]|\d+[.)])(?:[ \t]+(.*)|[ \t]*$)/;
const FENCE = /^\s*```/;
const DIVIDER_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*(?:\{([^}]*)\})?\s*$/;
const HEADING_RE = /^(#{1,6})[ \t]+(.*?)\s*$/;
export const IMAGE_LINE = /^\s*!\[((?:[^\]\\]|\\.)*)\]\(([^)\s]+)(?:\s+"((?:[^"\\]|\\.)*)")?\)(?:\{([^}]*)\})?\s*$/;
export const DIRECTIVE_LINE = /^::([a-z][\w-]*)(?:\{(.*)\})?\s*$/;
export const NODE_MARK = /<!--\s*Wixのノード[:：]\s*(\S+)\s+#(\d+)\s*-->/;
export const GAP_MARK = /<!--\s*空段落[:：]\s*(\d+)\s*-->/;
export const IMAGE_MARK = /<!--\s*画像[:：]\s*([\s\S]*?)\s*-->/;
const LEGACY_MARK = /<!--\s*未対応のノード[:：]/;

const startsBlock = (l) => FENCE.test(l) || DIVIDER_RE.test(l) || HEADING_RE.test(l) || /^\s*>/.test(l) ||
  /^\s*<!--/.test(l) || IMAGE_LINE.test(l) || DIRECTIVE_LINE.test(l) || /^\s*[-+*][ \t]/.test(l) || /^\s*1[.)][ \t]/.test(l);
const indentOf = (l) => l.match(/^\s*/)[0].length;
const unescape = (s) => s.replace(/\\(.)/g, "$1");

/** 画像の行の属性を確かめる。width=small|content|full|original|<数値>、align=left|center|right */
function imageAttrs(raw, line) {
  if (raw === undefined) return null;
  const a = parseAttrs(raw);
  const bad = !a || a.classes.length || Object.keys(a.kv).some((k) => !["width", "align"].includes(k)) ||
    (a.kv.width && !WIDTH_NAMES[a.kv.width] && !/^\d+$/.test(a.kv.width)) || (a.kv.align && !ALIGN_NAMES[a.kv.align]);
  if (bad) throw new Error(`${line} 行目: 画像の属性 {${raw}} が読めない。使えるのは width=small|content|full|original|<数値> と align=left|center|right`);
  return a;
}

/** 区切り線の属性。width=small|medium|large（既定 large） */
function dividerAttrs(raw, line) {
  if (raw === undefined) return null;
  const a = parseAttrs(raw);
  if (!a || a.classes.length || Object.keys(a.kv).some((k) => k !== "width") || !DIVIDER_WIDTHS[a.kv.width]) {
    throw new Error(`${line} 行目: 区切り線の属性 {${raw}} が読めない。使えるのは width=small|medium|large`);
  }
  return a;
}

function directive(name, raw, line) {
  const a = raw === undefined ? null : parseAttrs(raw);
  if (name === "x") {
    if (!a?.kv.url || !new RegExp(`^${X_STATUS.source}$`).test(a.kv.url)) throw new Error(`${line} 行目: ::x には url="https://x.com/{ユーザー}/status/{番号}" が要る`);
    const bad = Object.keys(a.kv).find((k) => !["url", "width", "height", "align"].includes(k)) ||
      ["width", "height"].find((k) => a.kv[k] && !/^\d+$/.test(a.kv[k])) || (a.kv.align && !ALIGN_NAMES[a.kv.align] && "align");
    if (bad) throw new Error(`${line} 行目: ::x の ${bad} が読めない。使えるのは url・width・height（数値）・align`);
    return { kind: "x", attrs: a, line };
  }
  if (name === "wix") {
    if (!a?.kv.id) throw new Error(`${line} 行目: ::wix には id が要る（pull が書いた行をそのまま使う）`);
    return { kind: "wix", attrs: a, line };
  }
  throw new Error(`${line} 行目: 知らない埋め込み ::${name}。使えるのは ::x と ::wix`);
}

// 旧形式（<!-- 画像: キャプション -->）の Wix 画像を、pull の時に控えた順で割り当てる。
// 同じキャプションの印の数が控えと違う時は、どれを消した・足したかが分からないので止める
function legacyImages(text, wixImages) {
  const pool = wixImages.map((w) => ({ ...w, used: false }));
  const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
  const inText = count([...text.matchAll(new RegExp(IMAGE_MARK.source, "g"))].map((m) => m[1].replace(/\s+/g, " ").trim()));
  for (const [cap, n] of count(pool.map((w) => w.caption))) {
    const k = inText.get(cap) ?? 0;
    if (k && k !== n) {
      throw new Error(`旧形式の画像の印（キャプション「${cap || "なし"}」）が pull の時の ${n} 個から ${k} 個に変わっている。` +
        "順番で割り当てると別の画像にずれるので止める。Wix の画面で画像を足し消ししてから pull し直す（pull は画像を ![…](wix:ID) で書くので、以後はずれない）");
    }
  }
  return (cap) => { const w = pool.find((x) => x.caption === cap && !x.used); if (w) w.used = true; return w ?? null; };
}

function parseList(lines, start) {
  const indent = indentOf(lines[start]);
  const ordered = /\d/.test(lines[start].match(LIST_RE)[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      // 空行を挟んでも、次が同じ種類・同じ深さの項目なら同じリスト（Markdown のゆるいリスト）
      let k = i + 1;
      while (k < lines.length && !lines[k].trim()) k++;
      const m = lines[k]?.match(LIST_RE);
      if (m && indentOf(lines[k]) === indent && /\d/.test(m[2]) === ordered) { i = k; continue; }
      break;
    }
    const m = line.match(LIST_RE);
    const ind = indentOf(line);
    if (ind < indent) break;
    if (m && ind === indent) {
      if (/\d/.test(m[2]) !== ordered || DIVIDER_RE.test(line)) break;
      items.push({ text: m[3] ?? "", sub: [] });
      i++;
      continue;
    }
    if (!items.length) break;
    if (m && ind > indent && !DIVIDER_RE.test(line)) {
      const r = parseList(lines, i);
      items.at(-1).sub.push(r.block);
      i = r.next;
      continue;
    }
    // 継続行（字下げした行、または字下げの無い地の文）は項目の中の改行
    if (ind === indent && startsBlock(line)) break;
    items.at(-1).text += `\n${line.trimStart()}`;
    i++;
  }
  return { block: { kind: "list", ordered, items, line: start + 1 }, next: i };
}

/**
 * 記事の Markdown をブロック列にする。H1 の1つ目はタイトル、ℹ️ を含む引用（著者向けメモ）と HTML コメントは落とす。
 * opts.title: false ならタイトルを取らない（1ブロックだけの検算用）
 * opts.wixImages / opts.wixNodes: 旧形式の印（<!-- 画像 -->・<!-- Wixのノード -->）を読むための wix.json の控え
 */
export function parseDocument(text, opts = {}) {
  const { wixImages = [], wixNodes = [] } = opts;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let title = opts.title === false ? undefined : null;
  const takeLegacy = legacyImages(text, wixImages);
  let skipCaption = null;   // 旧形式の Wix 画像の印の直後にあるキャプションの行は、画像に含める
  let pendingCode = null;   // 旧形式の CODE_BLOCK の印。直後のコードブロックを控えと比べる
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const at = i + 1;
    if (!line.trim()) { i++; continue; }
    if (skipCaption !== null) {
      const hit = line.trim() === skipCaption;
      skipCaption = null;
      if (hit) { i++; continue; }
    }
    if (pendingCode !== null && !FENCE.test(line)) {
      throw new Error(`${at} 行目: Wix のノード #${pendingCode}（CODE_BLOCK）の印の直後にコードブロックが無い。印とコードブロックを一緒に動かす`);
    }
    if (/^\s*<!--/.test(line)) {
      let c = line;
      while (!c.includes("-->") && i + 1 < lines.length) c += `\n${lines[++i]}`;
      i++;
      if (LEGACY_MARK.test(c)) throw new Error(`${at} 行目: 「未対応のノード」の印がある。古い pull はノードの中身を控えていないので、push するとそのノードが消える。pull し直してから直す`);
      const nm = c.match(NODE_MARK);
      if (nm) {
        const idx = Number(nm[2]);
        if (wixNodes[idx]?.type !== nm[1]) throw new Error(`${at} 行目: Wix のノード #${idx}（${nm[1]}）が wix.json に無い。pull し直す`);
        blocks.push({ kind: "legacyNode", index: idx, line: at });
        if (nm[1] === "CODE_BLOCK") pendingCode = idx;
        continue;
      }
      const gm = c.match(GAP_MARK);
      if (gm) { blocks.push({ kind: "gap", n: Number(gm[1]), line: at }); continue; }
      const im = c.match(IMAGE_MARK);
      if (im) {
        const cap = im[1].replace(/\s+/g, " ").trim();
        const w = takeLegacy(cap);
        if (w) { blocks.push({ kind: "legacyImage", wix: w, line: at }); skipCaption = w.captionMd || null; }
        // 未作図のプレースホルダーは、著者が Wix 上で気づけるよう目印付きの段落で残す
        else blocks.push({ kind: "paragraph", text: `［画像（未作図）: ${cap}］`, raw: true, line: at });
      }
      continue;
    }
    if (/^\s*>/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++]);
      if (q.some((l) => l.includes("ℹ️"))) continue;
      const paras = q.map((l) => l.replace(/^\s*>[ \t]?/, "")).join("\n").split(/\n[ \t]*\n/).filter((p) => p.trim());
      blocks.push({ kind: "quote", paras, line: at });
      continue;
    }
    if (title === null) {
      const h1 = line.match(/^#[ \t]+(.*)$/);
      if (h1) { title = h1[1].trim(); i++; continue; }
    }
    if (FENCE.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      if (i >= lines.length) throw new Error(`${at} 行目のコードブロックが閉じていない`);
      i++;
      if (pendingCode !== null) {
        const n = wixNodes[pendingCode];
        const b = body.join("\n");
        if (b !== codeMd(n).md && b !== plainText(n)) {
          throw new Error(`${at} 行目: Wix のノード #${pendingCode}（CODE_BLOCK）の中身が pull の時から変わっている。このコードブロックには Markdown で書けない装飾があり、Markdown から送ると消える。Wix の画面で直すか、装飾を捨ててよければ印の行を消して push する`);
        }
        pendingCode = null;
        continue;
      }
      blocks.push({ kind: "code", body: body.join("\n"), line: at });
      continue;
    }
    const dv = line.match(DIVIDER_RE);
    if (dv) { blocks.push({ kind: "divider", attrs: dividerAttrs(dv[1], at), line: at }); i++; continue; }
    const h = line.match(HEADING_RE);
    if (h) { blocks.push({ kind: "heading", level: h[1].length, text: h[2], line: at }); i++; continue; }
    const img = line.match(IMAGE_LINE);
    if (img) {
      blocks.push({ kind: "image", alt: unescape(img[1]), src: img[2], title: img[3], attrs: imageAttrs(img[4], at), line: at });
      i++;
      continue;
    }
    const d = line.match(DIRECTIVE_LINE);
    if (d) { blocks.push(directive(d[1], d[2], at)); i++; continue; }
    if (LIST_RE.test(line)) {
      const r = parseList(lines, i);
      blocks.push(r.block);
      i = r.next;
      continue;
    }
    const para = [line.replace(/^[ \t]+/, "")];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) para.push(lines[i++]);
    blocks.push({ kind: "paragraph", text: para.join("\n"), line: at });
  }
  if (pendingCode !== null) throw new Error(`Wix のノード #${pendingCode}（CODE_BLOCK）の印の後にコードブロックが無い`);
  return { title: title ?? null, blocks };
}

// ---------- ブロック: ブロック列 → Ricos ----------

const para = (nodes) => ({ type: "PARAGRAPH", id: "", nodes, paragraphData: {} });

function listNode(b) {
  return {
    type: b.ordered ? "ORDERED_LIST" : "BULLETED_LIST",
    id: "",
    nodes: b.items.map((it) => ({ type: "LIST_ITEM", id: "", nodes: [para(inlineNodes(it.text)), ...it.sub.map(listNode)] })),
    [b.ordered ? "orderedListData" : "bulletedListData"]: { indentation: 0 },
  };
}

/** 画像の幅・配置。Markdown の属性 > 旧形式の控え（wix.json）> 既定（縦長は SMALL、それ以外は CONTENT） */
export function imageContainer(attrs, media) {
  const c = media.container ? structuredClone(media.container) : { width: { size: defaultWidth(media.width, media.height) }, alignment: "CENTER", textWrap: true };
  const kv = attrs?.kv ?? {};
  if (kv.width) c.width = /^\d+$/.test(kv.width) ? { custom: kv.width } : { size: WIDTH_NAMES[kv.width] };
  if (kv.align) c.alignment = ALIGN_NAMES[kv.align];
  return c;
}

function imageNode({ captionNodes, alt, attrs }, media) {
  const caption = captionNodes.map((x) => x.textData.text).join("");
  return {
    type: "IMAGE",
    id: "",
    nodes: captionNodes.length ? [{ type: "CAPTION", id: "", nodes: captionNodes }] : [],
    imageData: {
      containerData: imageContainer(attrs, media),
      image: { src: { id: media.id }, width: media.width, height: media.height },
      ...(alt ? { altText: alt } : {}),
      ...(caption ? { caption } : {}),
    },
  };
}

function xNode(kv, embeds) {
  return {
    type: "HTML",
    id: "",
    nodes: [],
    htmlData: {
      containerData: {
        width: { custom: kv.width ?? X_DEFAULT.width },
        height: { custom: kv.height ?? X_DEFAULT.height },
        alignment: ALIGN_NAMES[kv.align ?? "center"],
        spoiler: {},
        textWrap: true,
      },
      // pull で控えた HTML（ポストの本文入り）があればそれを使う。新しく書いた ::x は最小の埋め込みにする
      html: embeds?.[kv.url] ?? xHtml(kv.url),
      source: "HTML",
    },
  };
}

function blockNode(b, ctx) {
  switch (b.kind) {
    case "paragraph": return para(b.raw ? [textNode(b.text)] : inlineNodes(b.text));
    case "heading": return { type: "HEADING", id: "", nodes: inlineNodes(b.text), headingData: { level: b.level } };
    case "list": return listNode(b);
    case "quote": return { type: "BLOCKQUOTE", id: "", nodes: b.paras.map((p) => para(inlineNodes(p))), blockquoteData: { indentation: 0 } };
    case "code": return { type: "CODE_BLOCK", id: "", nodes: b.body ? (codeNodes(b.body) ?? [textNode(b.body)]) : [], codeBlockData: { textStyle: { textAlignment: "AUTO" } } };
    case "divider": return { type: "DIVIDER", id: "", nodes: [], dividerData: { lineStyle: "SINGLE", width: DIVIDER_WIDTHS[b.attrs?.kv.width ?? "large"], alignment: "CENTER" } };
    case "image": {
      // キャプションは title、無ければ alt（地の文）
      const captionNodes = b.title !== undefined ? inlineNodes(b.title) : b.alt ? [textNode(b.alt)] : [];
      return imageNode({ captionNodes, alt: b.alt, attrs: b.attrs }, ctx.image(b));
    }
    case "legacyImage": {
      const w = b.wix;
      return imageNode({ captionNodes: w.captionNodes ?? (w.caption ? [textNode(w.caption)] : []), alt: w.alt, attrs: null }, w);
    }
    case "x": return xNode(b.attrs.kv, ctx.embeds);
    case "wix": {
      const n = ctx.wixBlocks?.[b.attrs.kv.id];
      if (!n) throw new Error(`::wix{id=${b.attrs.kv.id}} の中身が wix.json に無い。pull し直す`);
      return structuredClone(n);
    }
    case "legacyNode": return structuredClone(ctx.wixNodes[b.index]);
    default: throw new Error(`知らないブロック ${b.kind}`);
  }
}

/**
 * ブロック列を Ricos のノード列にし、ブロックの間に空段落を入れる。
 * ctx.image(block) → { id, width, height, container? }: 画像の Media（push で上げた・Wix 上の）
 * ctx.embeds / ctx.wixBlocks / ctx.wixNodes: pull で控えた X の埋め込み・Wix のノード・旧形式のノード
 * ctx.replace(node) → node: 空段落を入れる前に、各ブロックのノードを差し替える（控えの段落を戻すため）
 */
export function toRicos(blocks, ctx = {}) {
  const content = [];
  let gap = null;
  for (const b of blocks) {
    if (b.kind === "gap") { gap = b.n; continue; }
    let node;
    try { node = blockNode(b, ctx); } catch (e) { throw new Error(/^\d+ 行目/.test(e.message) ? e.message : `${b.line} 行目: ${e.message}`); }
    content.push({ node: ctx.replace ? ctx.replace(node) : node, gap });
    gap = null;
  }
  const out = [];
  let prev = null;
  for (const { node, gap: g } of content) {
    for (let i = 0; i < (g ?? defaultGap(prev, node)); i++) out.push(emptyPara());
    out.push(node);
    prev = node;
  }
  for (let i = 0; i < (gap ?? 0); i++) out.push(emptyPara());
  return out;
}

// ---------- ブロック: Ricos → Markdown ----------

function imageMarkdown(n, ctx) {
  const d = n.imageData ?? {};
  const img = d.image ?? {};
  const id = img.src?.id ?? "";
  const local = ctx.imageMap?.[id];
  if (!local) ctx.media[id] = { width: img.width, height: img.height };
  const captionNodes = (n.nodes ?? []).filter((x) => x.type === "CAPTION").flatMap((x) => x.nodes ?? []);
  const capMd = inlineMd(captionNodes).trim().replace(/\n/g, "<br>");
  const alt = d.altText ?? "";
  const plainCaption = captionNodes.every((x) => x.type === "TEXT" && !(x.textData.decorations ?? []).length) && plainText({ nodes: captionNodes }).trim() === alt;
  const title = plainCaption ? "" : ` "${capMd.replace(/"/g, '\\"')}"`;
  const kv = {};
  const c = d.containerData ?? {};
  if (c.width?.custom) kv.width = String(c.width.custom);
  else if (c.width?.size && c.width.size !== defaultWidth(img.width, img.height)) {
    kv.width = Object.entries(WIDTH_NAMES).find(([, v]) => v === c.width.size)?.[0] ?? c.width.size.toLowerCase();
  }
  if (c.alignment && c.alignment !== "CENTER") kv.align = c.alignment.toLowerCase();
  const attrs = Object.keys(kv).length ? formatAttrs({ kv }) : "";
  return `![${alt.replace(/[\\[\]]/g, "\\$&")}](${local ?? `wix:${id}`}${title})${attrs}`;
}

function wixBlockMarkdown(n, ctx) {
  const id = n.id || `n${hash(JSON.stringify(n))}`;
  ctx.wixBlocks[id] = n;
  return `::wix${formatAttrs({ kv: { type: n.type, id } })}`;
}

function htmlMarkdown(n, ctx) {
  const d = n.htmlData ?? {};
  const html = d.html ?? "";
  const urls = /class="twitter-tweet"/.test(html) ? html.match(X_STATUS) : null;
  if (!urls) return wixBlockMarkdown(n, ctx);
  const url = urls.at(-1);
  ctx.embeds[url] = html;
  const c = d.containerData ?? {};
  const kv = { url };
  if (c.width?.custom) kv.width = String(c.width.custom);
  if (c.height?.custom) kv.height = String(c.height.custom);
  if (c.alignment && c.alignment !== "CENTER") kv.align = c.alignment.toLowerCase();
  return `::x${formatAttrs({ kv })}`;
}

function listMarkdown(list, ordered, depth) {
  const lines = [];
  list.nodes.forEach((li, i) => {
    const pad = "  ".repeat(depth);
    const paras = li.nodes.filter((x) => x.type === "PARAGRAPH").map((x) => escapeLines(inlineMd(x.nodes).trim())).filter(Boolean);
    lines.push(`${pad}${ordered ? `${i + 1}.` : "-"} ${paras.join(" ").replace(/\n/g, `\n${pad}  `)}`);
    for (const sub of li.nodes.filter(isList)) lines.push(listMarkdown(sub, sub.type === "ORDERED_LIST", depth + 1));
  });
  return lines.join("\n");
}

/** 1つのノードを Markdown のブロックにする。ctx の media・embeds・wixBlocks に控えを足す */
export function blockMarkdown(n, ctx) {
  switch (n.type) {
    case "PARAGRAPH": {
      // 段落の中の改行（Shift+Enter）のうち、Markdown では消える・段落が割れるもの（先頭・末尾、2つ以上の連続）は <br> で書く
      const raw = plainText(n);
      const br = (k) => "<br>".repeat(k);
      const t = escapeLines(inlineMd(n.nodes).trim()).replace(/\n{2,}/g, (m) => br(m.length));
      return `${br(raw.match(/^\n*/)[0].length)}${t}${br(raw.match(/\n*$/)[0].length)}`;
    }
    case "HEADING": return `${"#".repeat(n.headingData?.level ?? 2)} ${escapeLines(inlineMd(n.nodes).trim())}`;
    case "BULLETED_LIST": case "ORDERED_LIST": return listMarkdown(n, n.type === "ORDERED_LIST", 0);
    case "BLOCKQUOTE": {
      // 段落内の改行（Shift+Enter）も引用の中に留める
      const paras = n.nodes.map((x) => escapeLines(inlineMd(x.nodes).trim())).filter(Boolean);
      return paras.map((p) => p.split("\n").map((l) => `> ${l}`).join("\n")).join("\n>\n");
    }
    case "DIVIDER": {
      const w = n.dividerData?.width ?? "LARGE";
      return w === "LARGE" ? "---" : `---${formatAttrs({ kv: { width: w.toLowerCase() } })}`;
    }
    case "CODE_BLOCK": return `\`\`\`\n${codeMd(n).md}\n\`\`\``;
    case "IMAGE": return imageMarkdown(n, ctx);
    case "HTML": return htmlMarkdown(n, ctx);
    default: return wixBlockMarkdown(n, ctx);
  }
}

// ---------- 比較 ----------

const stable = (v) => {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
};
const prune = (v) => {
  if (Array.isArray(v)) return v.map(prune);
  if (!v || typeof v !== "object") return v;
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    const p = prune(x);
    if (p === undefined || p === null || (typeof p === "object" && !Array.isArray(p) && !Object.keys(p).length)) continue;
    o[k] = p;
  }
  return o;
};

function canonDecos(ds) {
  const out = [];
  for (const d of ds) {
    if (d.type === "BOLD") { if ((d.fontWeightValue ?? 700) >= 600) out.push({ type: "BOLD" }); }
    else if (d.type === "ITALIC") { if (d.italicData !== false) out.push({ type: "ITALIC" }); }
    else if (d.type === "LINK") out.push({ type: "LINK", link: d.linkData?.link });
    else if (d.type === "COLOR") out.push({ type: "COLOR", fg: d.colorData?.foreground, bg: d.colorData?.background });
    else out.push(d);
  }
  // リンクの下線は Wix の編集画面が付ける見た目で、Markdown では書き分けない
  const link = out.some((d) => d.type === "LINK");
  return [...new Set(out.filter((d) => !(link && d.type === "UNDERLINE")).map((d) => stable(prune(d))))].sort();
}

// 文字の前後の空白（改行は除く）は Markdown に残らず、見た目にも出ないので比べない
const TRIMMED = new Set(["PARAGRAPH", "HEADING", "CAPTION"]);

function canonNode(n) {
  const out = { type: n.type };
  // 区切り線はデータが無くても既定（一重・LARGE・中央）で描かれるので、既定を補って比べる
  const dataKey = Object.keys(n).find((k) => k.endsWith("Data") && k !== "textData") ?? (n.type === "DIVIDER" ? "dividerData" : null);
  // 空段落の文字揃えなどは見えないので比べない
  const empty = n.type === "PARAGRAPH" && !plainText(n).trim() && (n.nodes ?? []).every((x) => x.type === "TEXT");
  if (dataKey && !empty) {
    let d = structuredClone(n[dataKey] ?? {});
    if (n.type === "DIVIDER") d = { lineStyle: d.lineStyle ?? "SINGLE", width: d.width ?? "LARGE", alignment: d.alignment ?? "CENTER" };
    if (n.type === "IMAGE") { if (!d.altText) delete d.altText; if (!d.caption) delete d.caption; }
    if (d.indentation === 0) delete d.indentation;
    if (d.textStyle?.textAlignment === "AUTO") delete d.textStyle.textAlignment;
    d = prune(d);
    if (Object.keys(d).length) out.data = d;
  }
  const items = [];
  for (const k of n.nodes ?? []) {
    if (k.type !== "TEXT") { items.push(canonNode(k)); continue; }
    const text = k.textData?.text ?? "";
    if (!text) continue;
    // 空白だけの文字の装飾（改行に付いた下線など）は見えないので比べない
    const decos = /^\s*$/.test(text) ? [] : canonDecos(k.textData.decorations ?? []);
    const prev = items.at(-1);
    if (prev?.t !== undefined && stable(prev.d) === stable(decos)) prev.t += text;
    else items.push({ t: text, d: decos });
  }
  if (TRIMMED.has(n.type)) {
    if (items[0]?.t !== undefined) items[0].t = items[0].t.replace(/^[ \t]+/, "");
    if (items.at(-1)?.t !== undefined) items.at(-1).t = items.at(-1).t.replace(/[ \t]+$/, "");
    if (n.type === "PARAGRAPH" && items.every((x) => x.t !== undefined && !x.t.trim())) items.length = 0;
  }
  const kept = items.filter((x) => x.t === undefined || x.t !== "");
  if (kept.length) out.nodes = kept;
  return out;
}

/** ノード列の、見た目に効く部分だけの文字列表現（id・既定値・空白の装飾を除く） */
export const canonical = (nodes) => stable(nodes.map(canonNode));
/** 控えの段落を引き当てる鍵 */
export const blockKey = (node) => hash(canonical([node]));

/**
 * 控えの段落を差し替える関数を作る（toRicos の ctx.replace に渡す）。同じ鍵の段落の何番目か（nth）で引き当てる。
 * 戻り値の pool の used が false のものは、本文に見当たらなかった控え（直したか消した）
 */
export function controlReplacer(controls) {
  const pool = controls.map((c) => ({ ...c, used: false }));
  const seen = new Map();
  const replace = (node) => {
    const key = blockKey(node);
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    const c = pool.find((x) => !x.used && x.key === key && (x.nth ?? nth) === nth);
    if (!c) return node;
    c.used = true;
    return structuredClone(c.node);
  };
  return { pool, replace };
}

// ---------- 装飾の一覧（落ちる装飾の点検） ----------

/** 比べる装飾の名前。値（色・URL・サイズ）まで含めて同じものを同じとみなす */
export function decoLabel(d) {
  switch (d.type) {
    case "COLOR": return [d.colorData?.foreground && `文字色 ${d.colorData.foreground}`, d.colorData?.background && `背景色 ${d.colorData.background}`].filter(Boolean).join("・") || null;
    case "UNDERLINE": return "下線";
    case "BOLD": return (d.fontWeightValue ?? 700) >= 600 ? "太字" : null;
    case "ITALIC": return "斜体";
    case "FONT_SIZE": return `文字サイズ ${d.fontSizeData?.value ?? ""}${d.fontSizeData?.unit ?? ""}`;
    case "LINK": return d.linkData?.link?.url ? `リンク ${d.linkData.link.url}` : null;
    default: return d.type;
  }
}

/** 装飾ごとに、その装飾が続く範囲の文字列を集める。TEXT の割れ方（他の装飾の有無）に左右されないようにする */
export function decoSpans(nodes) {
  const spans = [];
  const walk = (list) => {
    const open = new Map();   // 装飾の名前 → 続いている文字列
    const close = (keep) => {
      for (const [k, t] of open) {
        if (keep.has(k)) continue;
        if (t.trim()) spans.push({ label: k, text: t.trim() });
        open.delete(k);
      }
    };
    for (const n of list ?? []) {
      if (n.type !== "TEXT") { close(new Set()); walk(n.nodes); continue; }
      const labels = new Set((n.textData?.decorations ?? []).map(decoLabel).filter(Boolean));
      if (!n.textData?.text?.trim()) { for (const k of open.keys()) labels.add(k); }   // 空白は範囲を切らない
      close(labels);
      for (const k of labels) open.set(k, (open.get(k) ?? "") + n.textData.text);
    }
    close(new Set());
  };
  walk(nodes);
  return spans;
}

/** before にあって after に無い装飾の範囲（同じ装飾・同じ文字列の数で突き合わせる） */
export function lostSpans(before, after) {
  const remain = new Map();
  for (const s of decoSpans(after)) remain.set(`${s.label}\u0000${s.text}`, (remain.get(`${s.label}\u0000${s.text}`) ?? 0) + 1);
  const lost = [];
  for (const s of decoSpans(before)) {
    const k = `${s.label}\u0000${s.text}`;
    if (remain.get(k)) remain.set(k, remain.get(k) - 1); else lost.push(s);
  }
  return lost;
}

const TYPE_NAMES = { PARAGRAPH: "段落", HEADING: "見出し", IMAGE: "画像", DIVIDER: "区切り線", CODE_BLOCK: "コードブロック", BULLETED_LIST: "リスト", ORDERED_LIST: "番号付きリスト", BLOCKQUOTE: "引用", HTML: "埋め込み" };

function describeLoss(orig, back) {
  const lost = [...new Set(lostSpans([orig], [back]).map((s) => s.label.replace(/^リンク .*/, "リンク")))];
  if (plainText(orig).replace(/\s+/g, "") !== plainText(back).replace(/\s+/g, "")) lost.push("文字の並び");
  if (!lost.length) lost.push(`${TYPE_NAMES[orig.type] ?? orig.type}の設定`);
  return lost;
}

// ---------- pull: Ricos → Markdown（往復の検算と控えつき） ----------

/**
 * Wix の本文を拡張記法の Markdown にする。各ブロックは書いた Markdown から push と同じ手順でノードに戻し、
 * 元と違えば controls に控える（push は同じ段落が来たら控えのノードを送る）。
 * opts.imageMap: Media の ID → push で上げたローカルの画像のパス
 * opts.localMedia: ローカルの画像のパス → { id, width, height }（wix.json の images）
 * 戻り値: { md, controls, media, embeds, wixBlocks, opaque }
 */
export function fromRicos(nodes, { imageMap = {}, localMedia = {} } = {}) {
  const ctx = { imageMap, media: {}, embeds: {}, wixBlocks: {} };
  const conv = {
    image: (b) => (b.src.startsWith("wix:") ? { id: b.src.slice(4), ...ctx.media[b.src.slice(4)] } : { ...localMedia[b.src], container: undefined }),
    embeds: ctx.embeds,
    wixBlocks: ctx.wixBlocks,
  };
  const out = [];
  const controls = [];
  const seen = new Map();   // 鍵 → これまでに出た数。同じ見た目の段落が複数ある時、何番目かで控えを引き当てる
  let opaque = 0;
  const block = (s) => out.push(s, "");
  // 空段落は数えておき、次のブロックの前で既定の数と違う時だけ印を書く
  let prev = null;
  let empties = 0;
  const gapMark = (cur) => {
    // 隣り合う2つのリストは、間に印を置かないと Markdown で1つのリストにつながる
    if (empties !== defaultGap(prev, cur) || (isList(prev) && isList(cur))) block(`<!-- 空段落: ${empties} -->`);
    empties = 0;
    prev = cur;
  };
  for (const n of nodes) {
    if (isEmptyPara(n)) { empties++; continue; }
    gapMark(n);
    let md = blockMarkdown(n, ctx);
    let back = null;
    try { back = toRicos(parseDocument(md, { title: false }).blocks, conv); } catch { back = null; }
    if (!back || back.length !== 1) {
      // 1つのノードに戻らない Markdown（空になる段落など）は、中身を控えて ::wix で置く
      md = wixBlockMarkdown(n, ctx);
      opaque++;
    } else {
      const key = blockKey(back[0]);
      const nth = seen.get(key) ?? 0;
      seen.set(key, nth + 1);
      if (canonical(back) !== canonical([n])) {
        controls.push({ key, nth, lost: describeLoss(n, back[0]), text: plainText(n).replace(/\s+/g, " ").trim().slice(0, 40), node: n });
      }
    }
    block(md);
  }
  if (empties) block(`<!-- 空段落: ${empties} -->`);
  return { md: `${out.join("\n").trim()}\n`, controls, media: ctx.media, embeds: ctx.embeds, wixBlocks: ctx.wixBlocks, opaque };
}

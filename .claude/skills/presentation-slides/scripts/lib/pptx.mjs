/**
 * pptx.mjs — テンプレートの定義から .pptx（OOXML）を組む共通部品。依存は Node の zlib だけ
 *
 * Drive で Google スライドに変換すると、名前付きのレイアウト・プレースホルダ・書体・背景が残る。
 * 変換後のプレースホルダの index は .pptx の idx ではなく「同じ種類の中の並び順」になるので、
 * boxes の並び順と、ここで振る idx の順をそろえる。
 */
import zlib from "node:zlib";
import { placeholderKeys, EMU_PER_IN } from "./template.mjs";

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const RT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.presentationml";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const ALIGN = { START: "l", CENTER: "ctr", END: "r" };
const ANCHOR = { TOP: "t", MIDDLE: "ctr", BOTTOM: "b" };

export const emu = (inch) => Math.round(inch * EMU_PER_IN);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (tpl, c) => {
  const v = tpl.colors[c] ?? c;
  if (!/^#?[0-9a-f]{6}$/i.test(v)) throw new Error(`色「${c}」が定義の colors にありません`);
  return v.replace("#", "").toUpperCase();
};
// テーマの配色に使う定義の色（定義の theme で上書きできる）
const THEME = { dk1: "ink", dk2: "navy", lt2: "paper", accent1: "navy", accent2: "muted" };
/** マスターの書式を取るレイアウト（見出しと本文の箱を持つ物）。定義の master で選ぶ */
function masterLayout(tpl) {
  const name = tpl.master ?? "見出しと本文";
  const L = tpl.layouts[name];
  if (!L?.boxes?.title || !L?.boxes?.body) throw new Error(`定義の master「${name}」が、見出しと本文の箱を持つレイアウトではありません`);
  return L;
}
const solid = (v) => `<a:solidFill><a:srgbClr val="${v}"/></a:solidFill>`;
const font = (tpl) => `<a:latin typeface="${esc(tpl.font)}"/><a:ea typeface="${esc(tpl.font)}"/>`;

// ---- zip（deflate、CRC32 は表引き） ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files) {
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, "utf8");
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    parts.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

// ---- 部品 ----
/** プレースホルダの種類と idx。BODY・SUBTITLE は boxes の並び順に 1, 2, … を振る（変換後の index の順になる） */
function phAttr(box, key) {
  if (box.ph === "TITLE") return 'type="title"';
  if (box.ph === "CENTERED_TITLE") return 'type="ctrTitle"';
  if (box.ph === "SUBTITLE") return `type="subTitle" idx="${key.index + 1}"`;
  return `type="body" idx="${key.index + 1}"`;
}

function lvl1(tpl, box) {
  return `<a:lvl1pPr marL="0" indent="0" algn="${ALIGN[box.align ?? "START"]}"><a:lnSpc><a:spcPct val="${(tpl.lineSpacing ?? 100) * 1000}"/></a:lnSpc>` +
    `<a:spcAft><a:spcPts val="${Math.round((box.spaceBelow ?? 0) * 100)}"/></a:spcAft><a:buNone/>` +
    `<a:defRPr sz="${Math.round(box.size * 100)}" b="${box.bold ? 1 : 0}">${solid(hex(tpl, box.color))}${font(tpl)}</a:defRPr></a:lvl1pPr>`;
}

const GRP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>';
const bg = (tpl, c) => `<p:bg><p:bgPr>${solid(hex(tpl, c))}<a:effectLst/></p:bgPr></p:bg>`;
const xfrm = (b) => `<a:xfrm><a:off x="${emu(b.x)}" y="${emu(b.y)}"/><a:ext cx="${emu(b.w)}" cy="${emu(b.h)}"/></a:xfrm>`;
const paras = (lines) => lines.map((t) => `<a:p><a:r><a:rPr lang="ja-JP"/><a:t>${esc(t)}</a:t></a:r></a:p>`).join("") || "<a:p/>";

/** レイアウトのプレースホルダ（書式つき） */
function layoutPh(tpl, id, box, key, styled) {
  const i = tpl.inset;
  const body = styled
    ? `<a:bodyPr wrap="square" lIns="${emu(i.l)}" tIns="${emu(i.t)}" rIns="${emu(i.r)}" bIns="${emu(i.b)}" anchor="${ANCHOR[box.anchor ?? "TOP"]}"><a:noAutofit/></a:bodyPr><a:lstStyle>${lvl1(tpl, box)}</a:lstStyle>`
    : `<a:bodyPr anchor="${ANCHOR[box.anchor ?? "TOP"]}"/><a:lstStyle/>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph ${phAttr(box, key)}/></p:nvPr></p:nvSpPr>` +
    `<p:spPr>${xfrm(box)}</p:spPr><p:txBody>${body}<a:p/></p:txBody></p:sp>`;
}

export function layoutXml(tpl, name, styled = true) {
  const L = tpl.layouts[name];
  const keys = placeholderKeys(L);
  let id = 2;
  const shapes = Object.entries(L.boxes).map(([slot, box]) => layoutPh(tpl, id++, box, keys[slot], styled)).join("");
  return XML + `<p:sldLayout ${NS} type="cust" preserve="1"><p:cSld name="${esc(name)}">${bg(tpl, L.background)}<p:spTree>${GRP}${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

export function masterXml(tpl, layoutCount, styled = true) {
  const base = masterLayout(tpl);
  const keys = placeholderKeys(base);
  const shapes = layoutPh(tpl, 2, base.boxes.title, keys.title, styled) + layoutPh(tpl, 3, base.boxes.body, keys.body, styled);
  const ids = Array.from({ length: layoutCount }, (_, k) => `<p:sldLayoutId id="${2147483649 + k}" r:id="rId${k + 1}"/>`).join("");
  const deeper = [2, 3, 4, 5].map((n) => `<a:lvl${n}pPr marL="${n * 285750}" indent="-285750"><a:buFont typeface="Arial"/><a:buChar char="•"/><a:defRPr sz="${Math.max(18, Math.round(base.boxes.body.size * 5 / 6)) * 100}">${solid(hex(tpl, base.boxes.body.color))}${font(tpl)}</a:defRPr></a:lvl${n}pPr>`).join("");
  const styles = styled
    ? `<p:txStyles><p:titleStyle>${lvl1(tpl, base.boxes.title)}</p:titleStyle><p:bodyStyle>${lvl1(tpl, base.boxes.body)}${deeper}</p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800">${solid(hex(tpl, base.boxes.body.color))}${font(tpl)}</a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles>`
    : "<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>";
  return XML + `<p:sldMaster ${NS}><p:cSld>${bg(tpl, base.background)}<p:spTree>${GRP}${shapes}</p:spTree></p:cSld>` +
    `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
    `<p:sldLayoutIdLst>${ids}</p:sldLayoutIdLst>${styles}</p:sldMaster>`;
}

export function themeXml(tpl) {
  const c = (v) => `<a:srgbClr val="${v}"/>`;
  const T = { ...THEME, ...tpl.theme };
  const H = (k) => hex(tpl, T[k] ?? k);
  const f = `${font(tpl)}<a:cs typeface=""/>`;
  const fill = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`;
  return XML + `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${esc(tpl.id)}"><a:themeElements>` +
    `<a:clrScheme name="${esc(tpl.id)}"><a:dk1>${c(H("dk1"))}</a:dk1><a:lt1>${c("FFFFFF")}</a:lt1><a:dk2>${c(H("dk2"))}</a:dk2><a:lt2>${c(H("lt2"))}</a:lt2>` +
    `<a:accent1>${c(H("accent1"))}</a:accent1><a:accent2>${c(H("accent2"))}</a:accent2><a:accent3>${c("8A94A6")}</a:accent3><a:accent4>${c("B8C1D1")}</a:accent4>` +
    `<a:accent5>${c("3B5998")}</a:accent5><a:accent6>${c("6B7A99")}</a:accent6><a:hlink>${c(H("accent1"))}</a:hlink><a:folHlink>${c(H("accent2"))}</a:folHlink></a:clrScheme>` +
    `<a:fontScheme name="${esc(tpl.id)}"><a:majorFont>${f}</a:majorFont><a:minorFont>${f}</a:minorFont></a:fontScheme>` +
    `<a:fmtScheme name="${esc(tpl.id)}"><a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst>` +
    `<a:lnStyleLst>${[1, 2, 3].map(() => `<a:ln w="9525">${fill}</a:ln>`).join("")}</a:lnStyleLst>` +
    `<a:effectStyleLst>${[1, 2, 3].map(() => "<a:effectStyle><a:effectLst/></a:effectStyle>").join("")}</a:effectStyleLst>` +
    `<a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

/** スライド: プレースホルダは書式を持たず（レイアウトから継ぐ）、文字だけを持つ */
export function slidePh(id, box, key, lines) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph ${phAttr(box, key)}/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras(lines)}</p:txBody></p:sp>`;
}

export function pictureXml(id, rid, box, name = "画像") {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

export function todoXml(tpl, id, box, text, colorName) {
  const col = hex(tpl, colorName);
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="仮置きの枠" descr="仮置きの枠"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>` +
    `<a:ln w="19050">${solid(col)}<a:prstDash val="dash"/></a:ln></p:spPr><p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>` +
    `<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="ja-JP" sz="${(tpl.todoFrame?.size ?? 18) * 100}">${solid(col)}${font(tpl)}</a:rPr><a:t>${esc(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

export const rels = (items) => XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${RT}/${type}" Target="${target}"/>`).join("") + `</Relationships>`;

export const notesMasterXml = () => XML + `<p:notesMaster ${NS}><p:cSld><p:spTree>${GRP}` +
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="4343400"/><a:ext cx="5486400" cy="4114800"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>` +
  `</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
  `<p:notesStyle><a:lvl1pPr><a:defRPr sz="1200"/></a:lvl1pPr></p:notesStyle></p:notesMaster>`;

export const notesSlideXml = (lines) => XML + `<p:notes ${NS}><p:cSld><p:spTree>${GRP}` +
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras(lines)}</p:txBody></p:sp>` +
  `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;

/**
 * 部品を組んで .pptx の Buffer を返す。
 * layouts: レイアウトの名前の並び。slides: [{ layout, shapes（spTree に入れる XML）, media: [{rid, name, data}], notes: [行] }]
 */
export function buildPackage(tpl, { layouts, slides, styled = true }) {
  const files = [];
  const over = [["/ppt/presentation.xml", `${CT}.presentation.main+xml`], ["/ppt/slideMasters/slideMaster1.xml", `${CT}.slideMaster+xml`], ["/ppt/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml"]];
  layouts.forEach((_, k) => over.push([`/ppt/slideLayouts/slideLayout${k + 1}.xml`, `${CT}.slideLayout+xml`]));
  const hasNotes = slides.some((s) => s.notes?.length);
  if (hasNotes) over.push(["/ppt/notesMasters/notesMaster1.xml", `${CT}.notesMaster+xml`], ["/ppt/theme/theme2.xml", "application/vnd.openxmlformats-officedocument.theme+xml"]);
  slides.forEach((s, k) => {
    over.push([`/ppt/slides/slide${k + 1}.xml`, `${CT}.slide+xml`]);
    if (s.notes?.length) over.push([`/ppt/notesSlides/notesSlide${k + 1}.xml`, `${CT}.notesSlide+xml`]);
  });
  const exts = new Set(slides.flatMap((s) => (s.media ?? []).map((m) => m.name.split(".").pop().toLowerCase())));
  const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };
  files.push({ name: "[Content_Types].xml", data: XML + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    [...exts].map((e) => `<Default Extension="${e}" ContentType="${mime[e]}"/>`).join("") + over.map(([p, t]) => `<Override PartName="${p}" ContentType="${t}"/>`).join("") + `</Types>` });
  files.push({ name: "_rels/.rels", data: rels([["rId1", "officeDocument", "ppt/presentation.xml"]]) });
  const presRels = [["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ["rId2", "theme", "theme/theme1.xml"]];
  if (hasNotes) presRels.push(["rId3", "notesMaster", "notesMasters/notesMaster1.xml"]);
  slides.forEach((_, k) => presRels.push([`rIdS${k + 1}`, "slide", `slides/slide${k + 1}.xml`]));
  files.push({ name: "ppt/presentation.xml", data: XML + `<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
    (hasNotes ? `<p:notesMasterIdLst><p:notesMasterId r:id="rId3"/></p:notesMasterIdLst>` : "") +
    `<p:sldIdLst>${slides.map((_, k) => `<p:sldId id="${256 + k}" r:id="rIdS${k + 1}"/>`).join("")}</p:sldIdLst>` +
    `<p:sldSz cx="${emu(tpl.page.width)}" cy="${emu(tpl.page.height)}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` });
  files.push({ name: "ppt/_rels/presentation.xml.rels", data: rels(presRels) });
  files.push({ name: "ppt/theme/theme1.xml", data: themeXml(tpl) });
  files.push({ name: "ppt/slideMasters/slideMaster1.xml", data: masterXml(tpl, layouts.length, styled) });
  files.push({ name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: rels([...layouts.map((_, k) => [`rId${k + 1}`, "slideLayout", `../slideLayouts/slideLayout${k + 1}.xml`]), [`rId${layouts.length + 1}`, "theme", "../theme/theme1.xml"]]) });
  layouts.forEach((n, k) => {
    files.push({ name: `ppt/slideLayouts/slideLayout${k + 1}.xml`, data: layoutXml(tpl, n, styled) });
    files.push({ name: `ppt/slideLayouts/_rels/slideLayout${k + 1}.xml.rels`, data: rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]) });
  });
  if (hasNotes) {
    files.push({ name: "ppt/notesMasters/notesMaster1.xml", data: notesMasterXml() });
    files.push({ name: "ppt/notesMasters/_rels/notesMaster1.xml.rels", data: rels([["rId1", "theme", "../theme/theme2.xml"]]) });
    files.push({ name: "ppt/theme/theme2.xml", data: themeXml(tpl) });
  }
  slides.forEach((s, k) => {
    const li = layouts.indexOf(s.layout) + 1;
    files.push({ name: `ppt/slides/slide${k + 1}.xml`, data: XML + `<p:sld ${NS}><p:cSld><p:spTree>${GRP}${s.shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>` });
    const r = [["rId1", "slideLayout", `../slideLayouts/slideLayout${li}.xml`]];
    for (const m of s.media ?? []) { r.push([m.rid, "image", `../media/${m.name}`]); files.push({ name: `ppt/media/${m.name}`, data: m.data }); }
    if (s.notes?.length) {
      r.push(["rIdN", "notesSlide", `../notesSlides/notesSlide${k + 1}.xml`]);
      files.push({ name: `ppt/notesSlides/notesSlide${k + 1}.xml`, data: notesSlideXml(s.notes) });
      files.push({ name: `ppt/notesSlides/_rels/notesSlide${k + 1}.xml.rels`, data: rels([["rId1", "notesMaster", "../notesMasters/notesMaster1.xml"], ["rId2", "slide", `../slides/slide${k + 1}.xml`]]) });
    }
    files.push({ name: `ppt/slides/_rels/slide${k + 1}.xml.rels`, data: rels(r) });
  });
  return zip(files);
}

/** 画像の幅と高さ（PNG の IHDR・GIF の論理画面・JPEG の SOF）。読めなければ null */
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 10 && buf.toString("ascii", 0, 3) === "GIF") return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0〜SOF15（DHT・JPG・DAC の C4・C8・CC を除く）に幅と高さがある
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** 枠の中に縦横比を保って収め、中央に置く（Slides の createImage と同じ置き方） */
export function fitInside(frame, size) {
  if (!size) return frame;
  const r = Math.min(frame.w / size.w, frame.h / size.h);
  const w = size.w * r, h = size.h * r;
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
}

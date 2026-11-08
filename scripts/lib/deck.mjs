/**
 * deck.mjs — 登壇の deck.md（ゴーストデッキと台詞）と event.md（主催の規定）を読む共通部品
 *
 * 書式の正本は .claude/skills/presentation-write/references/deck-spec.md。
 * lint-deck.mjs と render-deck.mjs が使う。deck.md は読むだけで書き換えない。
 */
import fs from "node:fs";
import path from "node:path";

// deck.md の1枚に書ける項目。`本文:` だけは続く箇条書きを値に取る
export const FIELDS = ["段", "役割", "画面", "本文", "見せる", "出典", "秒", "核", "反応", "メモ"];
// AI が起こした見出し・台詞に付ける印
export const PROVISIONAL = "（仮）";
export const AUTHOR = "（著者）";

const FIELD_LINE = new RegExp(`^(${FIELDS.join("|")})\\s*[:：]\\s*(.*)$`);

/** 台詞1行から印を外し、{ mark, text } にする。mark は "著者" / "仮" / null（印なし） */
function parseLine(raw) {
  const t = raw.trim();
  if (t.startsWith(AUTHOR)) return { mark: "著者", text: t.slice(AUTHOR.length).trim() };
  if (t.startsWith(PROVISIONAL)) return { mark: "仮", text: t.slice(PROVISIONAL.length).trim() };
  return { mark: null, text: t };
}

/**
 * deck.md を読む。戻り値:
 * { title, slides: [{ index, lineNo, heading, provisional, fields: {…}, body: [string], lines: [{mark,text}] }] }
 * 1枚目の `##` より前（タイトルと ℹ️ メモ）はスライドに数えない。
 */
export function parseDeck(text) {
  const rows = text.split(/\r?\n/);
  const deck = { title: null, slides: [] };
  let cur = null;
  let inBody = false;
  let inFence = false;
  rows.forEach((row, i) => {
    if (/^```/.test(row.trim())) { inFence = !inFence; return; }
    if (inFence) return;
    const h1 = row.match(/^#\s+(.*)$/);
    if (h1 && !deck.title) { deck.title = h1[1].replace(/^デッキ\s*[:：]\s*/, "").trim(); return; }
    const h2 = row.match(/^##\s+(.*)$/);
    if (h2) {
      let heading = h2[1].trim();
      const provisional = heading.endsWith(PROVISIONAL);
      if (provisional) heading = heading.slice(0, -PROVISIONAL.length).trim();
      cur = { index: deck.slides.length + 1, lineNo: i + 1, heading, provisional, fields: {}, body: [], lines: [] };
      deck.slides.push(cur);
      inBody = false;
      return;
    }
    if (!cur) return;
    const f = row.match(FIELD_LINE);
    if (f) {
      cur.fields[f[1]] = f[2].trim();
      inBody = f[1] === "本文";
      return;
    }
    const bullet = row.match(/^\s*[-*]\s+(.*)$/);
    if (inBody && bullet) { cur.body.push(bullet[1].trim()); return; }
    const quote = row.match(/^>\s?(.*)$/);
    if (quote) {
      inBody = false;
      if (quote[1].trim().startsWith("ℹ️")) return;
      if (quote[1].trim()) cur.lines.push(parseLine(quote[1]));
      return;
    }
    if (row.trim() === "") inBody = false;
  });
  return deck;
}

/** "5分" "20分" "300秒" "5分30秒" を秒にする。読めなければ null */
export function toSeconds(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*分/);
  const sec = String(s).match(/(\d+)\s*秒/);
  if (!m && !sec) {
    const bare = String(s).match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    return bare ? Number(bare[1]) : null;
  }
  return Math.round((m ? Number(m[1]) * 60 : 0) + (sec ? Number(sec[1]) : 0));
}

/** deck.md と同じディレクトリの event.md から `key: value` の行を読む。無ければ null */
export function readEvent(deckPath) {
  const f = path.join(path.dirname(deckPath), "event.md");
  if (!fs.existsSync(f)) return null;
  const ev = {};
  let inFence = false;
  for (const row of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    if (/^```/.test(row.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    const kv = row.match(/^([^\s#>:：-][^:：]{0,15})\s*[:：]\s*(.+)$/);
    if (kv && !(kv[1].trim() in ev)) ev[kv[1].trim()] = kv[2].trim();
  }
  return { file: f, values: ev, seconds: toSeconds(ev["時間"]) };
}

/** 台詞の字数（空白を除く）。話す時間の見積もりに使う */
export function spokenChars(lines) {
  return lines.reduce((n, l) => n + l.text.replace(/\s+/g, "").length, 0);
}

/** 画面に出す見出し。`画面:` があればそれ（`／` は改行）、`なし` なら空、無ければ `##` の行 */
export function screenTitle(slide) {
  const v = slide.fields["画面"];
  if (v === undefined) return slide.heading;
  if (v.trim() === "なし") return "";
  return v;
}

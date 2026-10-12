#!/usr/bin/env node
/**
 * wix-sync.mjs — 記事の Markdown と Wix ブログの下書きを Wix Blog API で行き来させる
 *
 * 使い方（<記事> は output/{記事}/ のディレクトリ、またはその中の .md）:
 *   node wix-sync.mjs check                         認証確認（読み取りのみ）
 *   node wix-sync.mjs list [--limit N]              最近の投稿・下書きの一覧（読み取りのみ）
 *   node wix-sync.mjs link <記事> <postId>          既存の Wix 投稿を記事に結び付ける（wix.json に記録）
 *   node wix-sync.mjs push <file.md> [--dry-run]    下書きを新規作成する（画像は Media Manager へ）
 *   node wix-sync.mjs push <file.md> --update       結び付いた下書きの本文を置き換える
 *   node wix-sync.mjs pull <記事> [--out <file>] [--force]
 *                                                   下書きの最新を Markdown へ（既定 draft_user.md）
 *   node wix-sync.mjs pull <記事> --published       公開版を published.md へ
 *
 * 安全側の決まり:
 *   - 公開・公開予約・公開済み記事の書き換えはしない（その経路をコードに持たない）
 *   - push --update は、前回の同期以降に Wix 側で編集されていたら止まる（著者の直しを消さないため）
 *   - pull は、前回の同期以降にローカルのファイルが直されていたら止まる（--force で退避して上書き）
 *   - pull → push の往復で著者の Wix の下書きを変えない。Markdown にできないノード（HTML 埋め込み等）は
 *     wix.json に控えて元の位置へ戻し、空段落の数は既定と違う箇所だけ印を付けて保つ。
 *     コードブロックの中のリンクは [テキスト](http(s) の URL) で読み書きする。それ以外の装飾（太字等）を
 *     持つコードブロックは控え、中身が同じなら控えで戻し、変わっていたら止まる
 *   - pull と push --update は、取得した・上書きする直前の下書きを wix-snapshots/ に JSON のまま残す
 *
 * 状態は記事ディレクトリの wix.json（下書き ID・画像の対応・同期時点）。output/ 配下なので commit されない。
 * 認証: WIX_API_KEY と WIX_SITE_ID を .env から読む。$CLAUDE_PROJECT_DIR/.env、無ければカレントから上へ探す。
 * 依存: Node 22 以上の標準機能のみ（fetch / process.loadEnvFile）。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ---------- 認証と HTTP ----------

function loadEnv() {
  const candidates = [];
  if (process.env.CLAUDE_PROJECT_DIR) candidates.push(path.join(process.env.CLAUDE_PROJECT_DIR, ".env"));
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    candidates.push(path.join(dir, ".env"));
    if (path.dirname(dir) === dir) break;
  }
  const hit = candidates.find((p) => fs.existsSync(p));
  if (hit) process.loadEnvFile(hit);
}

loadEnv();
const { WIX_API_KEY, WIX_SITE_ID } = process.env;
if (!WIX_API_KEY || !WIX_SITE_ID) {
  console.error("error: WIX_API_KEY / WIX_SITE_ID が見つからない。リポジトリ直下の .env に置く（README「Wix 連携」）");
  process.exit(1);
}

async function wix(method, url, body) {
  const res = await fetch(`https://www.wixapis.com${url}`, {
    method,
    headers: {
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: res.status, json };
}

async function wixOk(method, url, body) {
  const r = await wix(method, url, body);
  if (r.status !== 200) throw new Error(`${method} ${url.split("?")[0]} → ${r.status}: ${JSON.stringify(r.json).slice(0, 400)}`);
  return r.json;
}

// ---------- 記事ディレクトリと状態 ----------

function articleDir(p) {
  const abs = path.resolve(p);
  return fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);
}

const statePath = (dir) => path.join(dir, "wix.json");
function loadState(dir) {
  const p = statePath(dir);
  const s = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  return { images: {}, wixImages: [], wixNodes: [], ...s };
}
const saveState = (dir, s) => fs.writeFileSync(statePath(dir), `${JSON.stringify(s, null, 2)}\n`);
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
// Wix の下書きを Ricos の JSON のまま残す。API に版の履歴が無いので、戻すときの唯一の手がかりになる
function snapshot(dir, kind, post) {
  const d = path.join(dir, "wix-snapshots");
  fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, `${kind}_${(post.editedDate ?? "unknown").replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(f, `${JSON.stringify({ id: post.id, title: post.title, editedDate: post.editedDate, richContent: post.richContent }, null, 2)}\n`);
  return f;
}
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // JST の日付

async function authorMemberId() {
  const j = await wixOk("GET", "/members/v1/members?fieldsets=PUBLIC&paging.limit=2");
  // サイトのメンバーが著者1人であることを前提にする。複数なら誰を投稿者にするか決められない
  if (j.members?.length !== 1) throw new Error(`サイトのメンバーが ${j.members?.length ?? 0} 人で、投稿者を1人に決められない`);
  return j.members[0].id;
}

// ---------- Markdown → Ricos ----------

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
// 変換 API の入力上限は markdown 30,000 字。章（## 見出し）単位でこの長さまで束ねて送る
const CHUNK_MAX = 25000;
const CONVERT_LIMIT = 30000;
// 画像は変換後に IMAGE ノードへ差し替えるため、変換中はこの印の段落にしておく
const IMG_TOKEN = (i) => `WIXIMGTOKEN${i}`;
// Markdown にできないノードと、既定と違う空段落の数も、変換中は印の段落にしておく
const NODE_TOKEN = (i) => `WIXNODETOKEN${i}`;
const GAP_TOKEN = (n) => `WIXGAPTOKEN${n}`;
// pull が書く印。著者が Wix で入れた要素と空段落を、push で同じ位置に戻すためのもの
const NODE_MARK = /<!--\s*Wixのノード[:：]\s*(\S+)\s+#(\d+)\s*-->/;
const GAP_MARK = /<!--\s*空段落[:：]\s*(\d+)\s*-->/;
const LEGACY_MARK = /<!--\s*未対応のノード[:：]/;
// コードブロックの中のリンクの書き方。URL は http(s) に限り、コードとしての [x](y) は字面のまま残す
const CODE_LINK = /\[([^[\]\n]+)\]\((https?:\/\/[^\s()]+)\)/;
// Wix の編集画面がコードブロックの中のリンクに付ける装飾。push で同じ形にする
const codeLinkDecos = (url) => [
  { type: "LINK", linkData: { link: { url, target: "BLANK", rel: { noreferrer: true } } } },
  { type: "UNDERLINE" },
];
// 3行以上の空行を1行に詰める。コードブロック（```）の中は著者の空行なので詰めない
function collapseBlank(md) {
  const out = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && !line.trim() && !out.at(-1)?.trim()) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}
// draft.md（AI 版）を流し込んだ下書きの目印。著者が自分の言葉で書き直したらタイトルから外す
const AI_TITLE_PREFIX = "[AI下書き] ";

// draft.md / draft_user.md を Wix に入れる形にする。ℹ️ メモと HTML コメントを落とし、H1 はタイトルへ。
// 画像は次の2種をトークンに置き換える:
//   ![alt](images/x.png "キャプション")   ローカルの画像（アップロードする）
//   <!-- 画像: キャプション -->            pull で取った Wix 上の画像（wix.json の wixImages に同じキャプションがあれば戻す）
function prepare(text, wixImages, wixNodes = []) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  const images = [];
  let title = null;
  let quote = null;
  let comment = null;
  let skipCaption = null;   // Wix 画像のプレースホルダー直後のキャプション行は画像側に含める
  const flushQuote = () => {
    if (quote && !quote.some((l) => l.includes("ℹ️"))) out.push(...quote);
    quote = null;
  };
  const nodeRefs = [];
  let code = null;   // 控えたコードブロックの印の直後。続くコードブロックの中身を集めて控えと比べる
  const onComment = (c) => {
    if (LEGACY_MARK.test(c)) {
      throw new Error("「未対応のノード」の印がある。古い pull はノードの中身を控えていないので、push するとそのノードが消える。pull し直してから直す");
    }
    const nm = c.match(NODE_MARK);
    if (nm) {
      const i = Number(nm[2]);
      if (wixNodes[i]?.type !== nm[1]) throw new Error(`Wix のノード #${i}（${nm[1]}）が wix.json に無い。pull し直す`);
      nodeRefs.push(i);
      out.push("", NODE_TOKEN(i), "");
      if (nm[1] === "CODE_BLOCK") code = { i, lines: null };
      return;
    }
    const gm = c.match(GAP_MARK);
    if (gm) { out.push("", GAP_TOKEN(Number(gm[1])), ""); return; }
    const m = c.match(/<!--\s*画像[:：]\s*([\s\S]*?)\s*-->/);
    if (!m) return;
    const cap = m[1].replace(/\s+/g, " ").trim();
    const wixImg = wixImages.find((w) => w.caption === cap && !w.used);
    if (wixImg) {
      wixImg.used = true;
      images.push({ wix: wixImg, alt: wixImg.alt ?? "", caption: cap, captionNodes: wixImg.captionNodes });
      out.push("", IMG_TOKEN(images.length - 1), "");
      skipCaption = wixImg.captionMd || null;
    } else {
      // 未作図のプレースホルダーは、著者が Wix 上で気づけるよう目印付きの段落で残す
      out.push("", `［画像（未作図）: ${cap}］`, "");
    }
  };
  for (const line of lines) {
    if (code) {
      // 印の直後のコードブロックは控えのノードで置き換える。中身が変わっていたら、装飾を黙って落とさず止める
      const fence = /^\s*```/.test(line);
      if (code.lines === null) {
        if (!line.trim()) continue;
        if (!fence) throw new Error(`Wix のノード #${code.i}（CODE_BLOCK）の印の直後にコードブロックが無い。印とコードブロックを一緒に動かす`);
        code.lines = [];
        continue;
      }
      if (!fence) { code.lines.push(line); continue; }
      // リンクを地の文で書いていた頃の pull の形も、同じ中身とみなす
      const body = code.lines.join("\n");
      if (body !== codeMd(wixNodes[code.i]).md && body !== plainText(wixNodes[code.i])) {
        throw new Error(`Wix のノード #${code.i}（CODE_BLOCK）の中身が pull の時から変わっている。このコードブロックには Markdown で書けない装飾（太字・リンクの無い下線など）があり、Markdown から送ると消える。Wix の画面で直すか、装飾を捨ててよければ印の行を消して push する`);
      }
      code = null;
      continue;
    }
    if (comment) {
      comment.push(line);
      if (line.includes("-->")) { onComment(comment.join("\n")); comment = null; }
      continue;
    }
    if (skipCaption !== null) {
      if (!line.trim()) continue;
      const hit = line.trim() === skipCaption;
      skipCaption = null;
      if (hit) continue;
    }
    if (/^\s*>/.test(line)) { (quote ??= []).push(line); continue; }
    flushQuote();
    if (title === null) {
      const h1 = line.match(/^#\s+(.*)$/);
      if (h1) { title = h1[1].trim(); continue; }
    }
    if (/^\s*<!--/.test(line)) {
      if (line.includes("-->")) onComment(line); else comment = [line];
      continue;
    }
    const img = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
    if (img) {
      images.push({ alt: img[1], src: img[2], caption: img[3] ?? img[1] });
      out.push("", IMG_TOKEN(images.length - 1), "");
      continue;
    }
    out.push(line);
  }
  if (code) throw new Error(`Wix のノード #${code.i}（CODE_BLOCK）の印の後のコードブロックが閉じていない`);
  flushQuote();
  return { title, markdown: collapseBlank(out.join("\n")), images, nodeRefs };
}

function chunks(md) {
  const out = [];
  let cur = "";
  for (const p of md.split(/\n(?=## )/)) {
    if (cur && cur.length + p.length > CHUNK_MAX) { out.push(cur); cur = ""; }
    cur = cur ? `${cur}\n${p}` : p;
  }
  if (cur) out.push(cur);
  for (const c of out) if (c.length > CONVERT_LIMIT) throw new Error(`1つの章が ${c.length} 字あり、変換 API の上限 ${CONVERT_LIMIT} 字を超える`);
  return out;
}

async function toRicos(md) {
  const nodes = [];
  for (const c of chunks(md)) {
    const j = await wixOk("POST", "/ricos/v1/ricos-document/convert/to-ricos", {
      markdown: c,
      options: { plugins: ["HEADING", "LINK", "IMAGE", "DIVIDER", "CODE_BLOCK"] },
    });
    nodes.push(...j.document.nodes);
  }
  return nodes;
}

const textNode = (s) => ({ type: "TEXT", id: "", nodes: [], textData: { text: s, decorations: [] } });
const emptyPara = () => ({ type: "PARAGRAPH", id: "", nodes: [], paragraphData: {} });

function imageNode(img, media) {
  const captionNodes = img.captionNodes ?? (img.caption ? [textNode(img.caption)] : []);
  return {
    type: "IMAGE",
    id: "",
    nodes: captionNodes.length ? [{ type: "CAPTION", id: "", nodes: captionNodes }] : [],
    imageData: {
      containerData: { width: { size: "CONTENT" }, alignment: "CENTER", textWrap: true },
      image: { src: { id: media.id }, width: media.width, height: media.height },
      ...(img.alt ? { altText: img.alt } : {}),
      ...(img.caption ? { caption: img.caption } : {}),
    },
  };
}

// 空段落の既定の数は著者の Wix テンプレート（下書き「Template」と公開記事）に合わせる:
// 区切り線の前は2つ・直後は0、画像の前後は2つ、それ以外のブロックの間は1つ、先頭と末尾は0
const defaultGap = (prev, cur) => {
  if (!prev || !cur || prev.type === "DIVIDER") return 0;
  return cur.type === "DIVIDER" || cur.type === "IMAGE" || prev.type === "IMAGE" ? 2 : 1;
};
const isEmptyPara = (n) => n.type === "PARAGRAPH" && (n.nodes ?? []).every((x) => x.type === "TEXT" && !x.textData?.text?.trim());

// 著者が Wix で書いた記事に揃える: 外部リンクは新しいタブ、ブロックの間の空段落、控えたノードの復元
function finish(nodes, images, media, wixNodes = []) {
  const walk = (list) => {
    for (const n of list) {
      for (const d of n.textData?.decorations ?? []) {
        if (d.type === "LINK") Object.assign(d.linkData.link, { target: "BLANK", rel: { noreferrer: true } });
      }
      // 変換 API は、入れ子のリストを持つ項目の段落の末尾に改行を足す。Wix で書いた形に戻す
      if (n.type === "LIST_ITEM" && n.nodes?.some((x) => x.type === "BULLETED_LIST" || x.type === "ORDERED_LIST")) {
        const last = n.nodes.find((x) => x.type === "PARAGRAPH")?.nodes?.at(-1);
        if (last?.textData?.text?.endsWith("\n")) last.textData.text = last.textData.text.slice(0, -1);
      }
      if (n.nodes) walk(n.nodes);
    }
  };
  walk(nodes);
  const out = [];
  let prev = null;
  let gap = null;   // 直前に空段落の印があればその数。無ければ既定の数
  for (const n of nodes) {
    const t = n.type === "PARAGRAPH" && n.nodes?.length === 1 ? n.nodes[0].textData?.text?.trim() : null;
    const g = t?.match(/^WIXGAPTOKEN(\d+)$/);
    if (g) { gap = Number(g[1]); continue; }
    const m = t?.match(/^WIXIMGTOKEN(\d+)$/);
    const k = t?.match(/^WIXNODETOKEN(\d+)$/);
    const cur = m ? imageNode(images[+m[1]], media[+m[1]]) : k ? structuredClone(wixNodes[+k[1]]) : n;
    // 変換 API はコードブロックの末尾に改行を1つ足す。往復で増えないように取り除く
    if (!k && cur.type === "CODE_BLOCK") {
      const last = cur.nodes?.at(-1);
      if (last?.textData?.text?.endsWith("\n")) last.textData.text = last.textData.text.slice(0, -1);
      // 変換 API はコードブロックの中を字面のまま入れる。[テキスト](URL) を Wix のリンクにする
      const linked = codeNodes(plainText(cur));
      if (linked) cur.nodes = linked;    }
    for (let i = 0; i < (gap ?? defaultGap(prev, cur)); i++) out.push(emptyPara());
    gap = null;
    out.push(cur);
    prev = cur;
  }
  for (let i = 0; i < (gap ?? 0); i++) out.push(emptyPara());
  const left = JSON.stringify(out).match(/WIX(IMG|NODE|GAP)TOKEN\d+/g);
  if (left) throw new Error(`印の差し替えに失敗した（${left.join(",")}）。印の行の前後に空行があるか確認する`);
  return out;
}

// コードブロックの中身を、[テキスト](URL) をリンクの付いた TEXT にして組み直す。リンクが無ければ null
function codeNodes(s) {
  const out = [];
  let i = 0;
  for (const m of s.matchAll(new RegExp(CODE_LINK.source, "g"))) {
    if (m.index > i) out.push(textNode(s.slice(i, m.index)));
    out.push({ ...textNode(m[1]), textData: { text: m[1], decorations: codeLinkDecos(m[2]) } });
    i = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (i < s.length) out.push(textNode(s.slice(i)));
  return out;
}

async function uploadImage(file, folder) {
  const mimeType = MIME[path.extname(file).toLowerCase()];
  if (!mimeType) throw new Error(`未対応の画像形式: ${file}`);
  const buf = fs.readFileSync(file);
  const g = await wixOk("POST", "/site-media/v1/files/generate-upload-url", {
    mimeType, fileName: path.basename(file), filePath: folder, sizeInBytes: String(buf.length),
  });
  const put = await fetch(`${g.uploadUrl}?filename=${encodeURIComponent(path.basename(file))}`, {
    method: "PUT", headers: { "Content-Type": mimeType }, body: buf,
  });
  const j = await put.json().catch(() => ({}));
  const im = j.file?.media?.image?.image;
  if (!put.ok || !j.file?.id || !im) throw new Error(`画像のアップロードに失敗（${put.status}）: ${path.basename(file)}`);
  return { id: j.file.id, width: im.width, height: im.height };
}

async function resolveMedia(images, dir, state, dryRun) {
  const media = [];
  for (const img of images) {
    if (img.wix) { media.push(img.wix); continue; }
    const file = path.resolve(dir, img.src);
    if (!fs.existsSync(file)) throw new Error(`画像が無い: ${img.src}`);
    if (dryRun) { media.push({ id: `DRYRUN_${path.basename(file)}`, width: 1, height: 1 }); continue; }
    const h = hash(fs.readFileSync(file));
    const cached = state.images[img.src];
    if (cached?.hash === h) { media.push(cached); continue; }
    const m = await uploadImage(file, `/blog-supporter/${path.basename(dir)}`);
    state.images[img.src] = { ...m, hash: h };
    saveState(dir, state);
    console.log(`  画像を上げた: ${img.src} (${m.width}x${m.height})`);
    media.push(m);
  }
  return media;
}

function summarize(nodes) {
  const c = {};
  const walk = (n) => { for (const x of n) { c[x.type] = (c[x.type] ?? 0) + 1; if (x.nodes) walk(x.nodes); } };
  walk(nodes);
  return ["HEADING", "PARAGRAPH", "IMAGE", "BULLETED_LIST", "ORDERED_LIST", "BLOCKQUOTE", "DIVIDER", "CODE_BLOCK"]
    .filter((k) => c[k]).map((k) => `${k}=${c[k]}`).join(" ");
}

const editUrl = (id) => `https://manage.wix.com/dashboard/${WIX_SITE_ID}/blog/${id}/edit`;

async function push(file, { dryRun, update }) {
  const src = path.resolve(file);
  const dir = path.dirname(src);
  const state = loadState(dir);
  const text = fs.readFileSync(src, "utf8");
  const { title, markdown, images, nodeRefs } = prepare(text, structuredClone(state.wixImages), state.wixNodes);
  if (!title) throw new Error("先頭に # タイトル行が無い");

  let cur = null;
  if (update) {
    if (!state.draftPostId) throw new Error("この記事に結び付いた下書きが無い。新規なら --update を外す");
    cur = (await wixOk("GET", `/blog/v3/draft-posts/${state.draftPostId}?fieldsets=RICH_CONTENT`)).draftPost;
    if (cur.status !== "UNPUBLISHED") {
      throw new Error(`下書きの状態が ${cur.status}。公開済み・予約済みの記事は API で書き換えない（Wix の画面で著者が反映する）`);
    }
    if (cur.editedDate !== state.syncedEditedDate) {
      throw new Error(`前回の同期（${state.syncedEditedDate ?? "なし"}）以降に Wix 側で編集されている（${cur.editedDate}）。先に pull して差分を確かめる`);
    }
  } else if (state.draftPostId && !dryRun) {
    throw new Error(`この記事には下書きが既にある（${state.draftPostId}）。置き換えるなら --update`);
  }

  console.log(`タイトル: ${title}`);
  console.log(`本文 ${markdown.length} 字 / 画像 ${images.length} 枚`);
  const media = await resolveMedia(images, dir, state, dryRun);
  const missing = state.wixNodes.map((_, i) => i).filter((i) => !nodeRefs.includes(i));
  if (missing.length) console.log(`  注意: Wix のノード ${missing.map((i) => `#${i}（${state.wixNodes[i].type}）`).join("・")} の印が本文に無い。push するとそのノード（CODE_BLOCK ならその中の装飾）は消える`);
  const nodes = finish(await toRicos(markdown), images, media, state.wixNodes);
  console.log(`構造: ${summarize(nodes)}`);

  if (dryRun) {
    const out = path.join(dir, "wix-dryrun.json");
    fs.writeFileSync(out, JSON.stringify({ title, nodes }, null, 2));
    console.log(`dry-run: ${out}（Wix には書いていない。変換 API だけ呼んだ）`);
    return;
  }

  let post;
  if (update) {
    console.log(`  上書き前の下書きを残した: ${snapshot(dir, "before-push", cur)}`);
    post = (await wixOk("PATCH", `/blog/v3/draft-posts/${state.draftPostId}`, {
      draftPost: { id: state.draftPostId, richContent: { nodes } },
      action: "UPDATE",
    })).draftPost;
    console.log(`下書きの本文を置き換えた（タイトルは Wix 側のまま）`);
  } else {
    const isAiDraft = path.basename(src) === "draft.md";
    post = (await wixOk("POST", "/blog/v3/draft-posts", {
      draftPost: { title: `${isAiDraft ? AI_TITLE_PREFIX : ""}${title}`, memberId: await authorMemberId(), richContent: { nodes } },
    })).draftPost;
    state.draftPostId = post.id;
    console.log(`下書きを作った（${post.status}）${isAiDraft ? `。タイトルに「${AI_TITLE_PREFIX.trim()}」を付けた` : ""}`);
  }
  state.syncedEditedDate = post.editedDate;
  state.syncedFile = path.basename(src);
  state.syncedHash = hash(text);
  saveState(dir, state);
  console.log(`編集画面: ${editUrl(state.draftPostId)}`);
}

// ---------- Ricos → Markdown ----------

// 装飾が同じ TEXT が隣り合っていたら先に連結する（「[A](u)[B](u)」に割れないため）
function mergeText(nodes) {
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

function inlineMd(nodes) {
  let s = "";
  for (const n of mergeText(nodes)) {
    if (n.type !== "TEXT") { s += inlineMd(n.nodes); continue; }
    const decos = n.textData.decorations ?? [];
    const has = (type) => decos.some((d) => d.type === type);
    // 装飾は前後の空白の外側に付ける（「** 太字**」にしない）
    const [, lead, core, trail] = n.textData.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    let t = core;
    if (t) {
      if (has("CODE")) t = `\`${t}\``;
      if (has("ITALIC")) t = `*${t}*`;
      // Wix は太字を fontWeightValue で持つ。セミボールド（600）以上を太字とみなす
      if (decos.some((d) => d.type === "BOLD" && (d.fontWeightValue ?? 700) >= 600)) t = `**${t}**`;
      const link = decos.find((d) => d.type === "LINK")?.linkData?.link?.url;
      if (link) t = `[${t}](${link})`;
    }
    s += lead + t + trail;
  }
  return s.trim();
}

const plainText = (n) => (n.nodes ?? []).map((x) => x.textData?.text ?? plainText(x)).join("");
const sameDecos = (a, b) => {
  const key = (ds) => JSON.stringify([...ds].sort((x, y) => x.type.localeCompare(y.type)));
  return key(a) === key(b);
};

// コードブロックの中身を Markdown にする。リンクは [テキスト](URL) で書く。
// exact は、push がこの Markdown から同じノードを組み直せるか（リンク以外の装飾や、地の文の [x](http…) があると false）
function codeMd(n) {
  const orig = mergeText(n.nodes).filter((x) => x.textData?.text !== "");
  let md = "";
  for (const x of orig) {
    const t = x.textData?.text ?? plainText(x);
    const url = x.textData?.decorations?.find((d) => d.type === "LINK")?.linkData?.link?.url;
    const link = url ? `[${t}](${url})` : null;
    md += link && new RegExp(`^${CODE_LINK.source}$`).test(link) ? link : t;
  }
  const back = (codeNodes(md) ?? [textNode(md)]).filter((x) => x.textData.text !== "");
  const exact = back.length === orig.length && back.every((b, i) =>
    b.textData.text === orig[i].textData?.text && sameDecos(b.textData.decorations, orig[i].textData.decorations ?? []));
  return { md, exact };
}

function toMarkdown(nodes, imageMap, wixImages, wixNodes = []) {
  const out = [];
  const block = (s) => out.push(s, "");
  // 空段落は数えておき、次のブロックの前で既定の数と違う時だけ印を書く
  let prev = null;
  let empties = 0;
  const gapMark = (cur) => {
    const isList = (x) => x?.type === "BULLETED_LIST" || x?.type === "ORDERED_LIST";
    // 隣り合う2つのリストは、間に印を置かないと Markdown で1つのリストにつながる
    if (empties !== defaultGap(prev, cur) || (isList(prev) && isList(cur))) block(`<!-- 空段落: ${empties} -->`);
    empties = 0;
    prev = cur;
  };
  const listItems = (list, ordered, depth = 0) => {
    const lines = [];
    list.nodes.forEach((li, i) => {
      const pad = "  ".repeat(depth);
      const paras = li.nodes.filter((x) => x.type === "PARAGRAPH").map((x) => inlineMd(x.nodes)).filter(Boolean);
      lines.push(`${pad}${ordered ? `${i + 1}.` : "-"} ${paras.join(" ").replace(/\n/g, `\n${pad}  `)}`);
      for (const sub of li.nodes.filter((x) => x.type === "BULLETED_LIST" || x.type === "ORDERED_LIST")) {
        lines.push(...listItems(sub, sub.type === "ORDERED_LIST", depth + 1));
      }
    });
    return lines;
  };
  for (const n of nodes) {
    if (isEmptyPara(n)) { empties++; continue; }
    gapMark(n);
    switch (n.type) {
      case "PARAGRAPH": {
        // 段落の中の改行（Shift+Enter）のうち、Markdown では消える・段落が割れるもの（先頭・末尾、2つ以上の連続）は <br> で書く
        const raw = plainText(n);
        const br = (k) => "<br>".repeat(k);
        const t = inlineMd(n.nodes).replace(/\n{2,}/g, (m) => br(m.length));
        block(`${br(raw.match(/^\n*/)[0].length)}${t}${br(raw.match(/\n*$/)[0].length)}`);
        break;
      }
      case "HEADING": block(`${"#".repeat(n.headingData?.level ?? 2)} ${inlineMd(n.nodes)}`); break;
      case "BULLETED_LIST": case "ORDERED_LIST": block(listItems(n, n.type === "ORDERED_LIST").join("\n")); break;
      case "BLOCKQUOTE": {
        // 段落内の改行（Shift+Enter）も引用の中に留める
        const paras = n.nodes.map((x) => inlineMd(x.nodes)).filter(Boolean);
        block(paras.map((p) => p.split("\n").map((l) => `> ${l}`).join("\n")).join("\n>\n"));
        break;
      }
      case "DIVIDER": block("---"); break;
      case "CODE_BLOCK": {
        // リンクは [テキスト](URL) で書き、push で組み直す。それで戻せない装飾（太字など）があれば
        // ノードを wix.json に控えて印を付け、push で中身が同じならそのまま戻す
        const { md, exact } = codeMd(n);
        if (!exact) {
          wixNodes.push(n);
          block(`<!-- Wixのノード: CODE_BLOCK #${wixNodes.length - 1} -->`);
        }
        block(`\`\`\`\n${md}\n\`\`\``);
        break;
      }
      case "IMAGE": {
        const img = n.imageData?.image ?? {};
        const id = img.src?.id;
        const plain = n.imageData?.caption ?? "";
        const captionNodes = n.nodes.filter((x) => x.type === "CAPTION").flatMap((x) => x.nodes);
        const captionMd = inlineMd(captionNodes);
        // push で上げた画像はローカルのファイルに戻す。それ以外（著者が Wix で足した画像）は
        // 「プレースホルダー＋キャプション行」にし、ID は wix.json に控えて push で戻せるようにする
        if (imageMap[id]) block(`![${plain}](${imageMap[id]})`);
        else {
          block(`<!-- 画像: ${plain} -->`);
          if (captionMd) block(captionMd);
          wixImages.push({ caption: plain, captionMd, captionNodes, alt: n.imageData?.altText ?? "", id, width: img.width, height: img.height });
        }
        break;
      }
      default:
        // Markdown にできないノード（HTML 埋め込み等）は中身を wix.json に控え、印だけを本文に置く
        wixNodes.push(n);
        block(`<!-- Wixのノード: ${n.type} #${wixNodes.length - 1} -->`);
    }
  }
  if (empties) block(`<!-- 空段落: ${empties} -->`);
  return `${collapseBlank(out.join("\n"))}\n`;
}

async function pull(target, { out, force, published }) {
  const dir = articleDir(target);
  const state = loadState(dir);
  if (!state.draftPostId) throw new Error("この記事に結び付いた Wix 投稿が無い。list で探して link する");
  const imageMap = Object.fromEntries(Object.entries(state.images).map(([src, m]) => [m.id, src]));
  const wixImages = [];
  const wixNodes = [];

  if (published) {
    const p = (await wixOk("GET", `/blog/v3/posts/${state.draftPostId}?fieldsets=RICH_CONTENT&fieldsets=URL`)).post;
    const url = `${p.url.base}${p.url.path}`;
    const body = toMarkdown(p.richContent.nodes, imageMap, wixImages, wixNodes);
    const md = `<!-- source: ${url} / fetched: ${today()} / method: wix-sync pull --published (Blog API) -->\n\n# ${p.title}\n\n${body}`;
    const dest = out ? path.resolve(out) : path.join(dir, "published.md");
    fs.writeFileSync(dest, md);
    console.log(`公開版を書いた: ${dest}（${md.length} 字、slug: ${p.slug}${p.hasUnpublishedChanges ? "、Wix 側に未公開の変更あり" : ""}）`);
    return;
  }

  const dest = out ? path.resolve(out) : path.join(dir, "draft_user.md");
  if (fs.existsSync(dest) && fs.readFileSync(dest, "utf8").trim()) {
    const local = fs.readFileSync(dest, "utf8");
    const synced = state.syncedFile === path.basename(dest) && state.syncedHash === hash(local);
    if (!synced && !force) {
      throw new Error(`${path.basename(dest)} が前回の同期以降にローカルで直されている。push --update で Wix へ送るか、--force で退避して上書きする`);
    }
    if (!synced) {
      const arch = path.join(dir, "_archive");
      fs.mkdirSync(arch, { recursive: true });
      const bak = path.join(arch, `${path.basename(dest, ".md")}_${Date.now()}.md`);
      fs.copyFileSync(dest, bak);
      console.log(`ローカルの版を退避した: ${bak}`);
    }
  }
  const p = (await wixOk("GET", `/blog/v3/draft-posts/${state.draftPostId}?fieldsets=RICH_CONTENT`)).draftPost;
  const snap = snapshot(dir, "pull", p);
  const header = `<!-- source: wix draft-post ${p.id} / fetched: ${today()} / method: wix-sync pull (Blog API) / status: ${p.status} / edited: ${p.editedDate} -->\n<!-- Wix の下書き。Wix 側が正。毎回上書き。 -->\n\n`;
  const md = `${header}# ${p.title}\n\n${toMarkdown(p.richContent.nodes, imageMap, wixImages, wixNodes)}`;
  fs.writeFileSync(dest, md);
  Object.assign(state, {
    wixImages, wixNodes, syncedEditedDate: p.editedDate, syncedFile: path.basename(dest), syncedHash: hash(md),
  });
  saveState(dir, state);
  const heads = (md.match(/^#{2,6} /gm) ?? []).length;
  const figs = (md.match(/^!\[/gm) ?? []).length;
  console.log(`下書きを書いた: ${dest}（${md.length} 字 / 見出し ${heads} / 図 ${figs} / Wix の画像 ${wixImages.length} / Wix のノード ${wixNodes.length}）`);
  console.log(`取得した下書きを残した: ${snap}`);
}

// ---------- 一覧・結び付け・確認 ----------

async function check() {
  const id = await authorMemberId();
  console.log(`認証 OK。投稿者のメンバー: ${id.slice(0, 8)}…`);
}

async function list(limit) {
  const j = await wixOk("GET", `/blog/v3/draft-posts?paging.limit=${limit}&sort=EDITING_DATE_DESC`);
  for (const p of j.draftPosts ?? []) console.log(`${p.id}  ${p.status.padEnd(11)}  ${p.editedDate ?? ""}  ${p.title}`);
}

async function link(target, id) {
  const dir = articleDir(target);
  const p = (await wixOk("GET", `/blog/v3/draft-posts/${id}`)).draftPost;
  const state = loadState(dir);
  if (state.draftPostId && state.draftPostId !== id) throw new Error(`既に別の投稿（${state.draftPostId}）に結び付いている。wix.json を確かめる`);
  state.draftPostId = id;
  saveState(dir, state);
  console.log(`結び付けた: ${path.basename(dir)} ↔ ${id}（${p.status}）${p.title}`);
}

// ---------- 入口 ----------

const [cmd, ...args] = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--out", "--limit"].includes(args[i - 1])));
const USAGE = "usage: check | list [--limit N] | link <記事> <postId> | push <file.md> [--dry-run|--update] | pull <記事> [--out <file>] [--force] [--published]";

try {
  if (cmd === "check") await check();
  else if (cmd === "list") await list(Number(opt("--limit") ?? 10));
  else if (cmd === "link" && pos.length === 2) await link(pos[0], pos[1]);
  else if (cmd === "push" && pos[0]) await push(pos[0], { dryRun: flag("--dry-run"), update: flag("--update") });
  else if (cmd === "pull" && pos[0]) await pull(pos[0], { out: opt("--out"), force: flag("--force"), published: flag("--published") });
  else { console.error(USAGE); process.exit(2); }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * wix-sync.mjs — 記事の Markdown と Wix ブログの下書きを Wix Blog API で行き来させる
 *
 * 使い方（<記事> は output/{記事}/ のディレクトリ、またはその中の .md）:
 *   node wix-sync.mjs check                         認証確認（読み取りのみ）
 *   node wix-sync.mjs list [--limit N]              最近の投稿・下書きの一覧（読み取りのみ）
 *   node wix-sync.mjs link <記事> <postId>          既存の Wix 投稿を記事に結び付ける（wix.json に記録）
 *   node wix-sync.mjs link <記事> <postId> --relink  別の投稿に結び付け直す（その投稿の現在を同期時点にする）
 *   node wix-sync.mjs push <file.md> [--dry-run]    下書きを新規作成する（画像は Media Manager へ）
 *   node wix-sync.mjs push <file.md> --update       結び付いた下書きの本文を置き換える
 *     [--allow-published]                           公開済み記事の下書き（未公開の変更）を置き換える。公開はしない。
 *                                                   置き換える前に、その記事を非公開の下書きとして複製する
 *     [--accept-loss]                               pull で控えた段落を直した・消した時に、その装飾を捨てて送る
 *   node wix-sync.mjs pull <記事> [--out <file>] [--force]
 *                                                   下書きの最新を Markdown へ（既定 draft_user.md）
 *   node wix-sync.mjs pull <記事> --published       公開版を published.md へ
 *   node wix-sync.mjs compare <前.json> <後.json>   2つの Ricos JSON（pull の控え・dry-run の出力）で、減る装飾と
 *                                                   画像の消失・位置・幅の変化を出す（Wix を呼ばない）。
 *                                                   push --dry-run は直前の pull の控えと自動でこれを行う
 *   node wix-sync.mjs roundtrip <控え.json>         Wix を呼ばずに pull → push の往復を試し、元と同じになるかを見る
 *
 * Markdown ⇔ Ricos の変換と拡張記法（{.accent}・{width=small}・wix:ID・::x 等）は scripts/lib/wix-markdown.mjs。
 * 記法の説明は ../references/markdown-extensions.md。
 *
 * 安全側の決まり:
 *   - 公開・公開予約はしない（その経路をコードに持たない）。公開済み記事は --allow-published の時だけ、
 *     下書き（未公開の変更）を action: UPDATE で置き換える。公開版は著者が Wix の画面で公開するまで変わらない
 *   - push --update は、前回の同期以降に Wix 側で編集されていたら止まる（著者の直しを消さないため）
 *   - pull は、前回の同期以降にローカルのファイルが直されていたら止まる（--force で退避して上書き）
 *   - pull → push の往復で著者の Wix の下書きを変えない。Markdown から同じノードに戻せない段落（文字サイズ・
 *     文字揃え・画像の切り抜き等）は pull が wix.json の controls に控え、push は同じ段落が来たら控えのまま送る。
 *     控えた段落が直されて・消されていたら、装飾を黙って落とさず止める（--accept-loss で送る）
 *   - pull と push --update は、取得した・上書きする直前の下書きを wix-snapshots/ に JSON のまま残す
 *
 * 状態は記事ディレクトリの wix.json（下書き ID・画像の対応・Wix の画像の大きさ・埋め込み・控え・同期時点）。
 * output/ 配下なので commit されない。
 * 認証: WIX_API_KEY と WIX_SITE_ID を .env から読む。$CLAUDE_PROJECT_DIR/.env、無ければカレントから上へ探す。
 * 依存: Node 22 以上の標準機能のみ（fetch / process.loadEnvFile）。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonical, controlReplacer, fromRicos, lostSpans, parseDocument, plainText, toRicos,
} from "../../../../scripts/lib/wix-markdown.mjs";

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

async function wix(method, url, body) {
  // 認証が要るのは Wix を呼ぶ時だけ（compare・roundtrip は .env 無しで動く）
  if (!WIX_API_KEY || !WIX_SITE_ID) throw new Error("WIX_API_KEY / WIX_SITE_ID が見つからない。リポジトリ直下の .env に置く（README「Wix 連携」）");
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
// images: push で上げたローカルの画像（パス → Media）。media: Wix 上の画像の大きさ（ID → 幅・高さ）。
// embeds: X のポストの埋め込み HTML（URL → HTML）。wixBlocks: Markdown にできないノード（ID → ノード）。
// controls: Markdown から戻せない段落の控え。wixImages・wixNodes は旧形式の印（<!-- 画像 -->・<!-- Wixのノード -->）の控え
function loadState(dir) {
  const p = statePath(dir);
  const s = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  return { images: {}, media: {}, embeds: {}, wixBlocks: {}, controls: [], wixImages: [], wixNodes: [], ...s };
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

// ---------- 画像 ----------

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

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

// 画像の行ごとに Media（ID・幅・高さ）を決める。Wix 上の画像（wix:ID）は pull で控えた大きさ、
// ローカルの画像は上げ済みならその Media、変わっていれば上げ直す
async function resolveMedia(images, dir, state, dryRun) {
  const media = new Map();
  for (const b of images) {
    if (b.src.startsWith("wix:")) {
      const id = b.src.slice(4);
      const m = state.media[id] ?? Object.values(state.images).find((x) => x.id === id);
      if (!m) throw new Error(`${b.line} 行目: Wix の画像 ${id} の大きさが wix.json に無い。pull し直す`);
      media.set(b, { id, width: m.width, height: m.height });
      continue;
    }
    const file = path.resolve(dir, b.src);
    if (!fs.existsSync(file)) throw new Error(`${b.line} 行目: 画像が無い: ${b.src}`);
    const h = hash(fs.readFileSync(file));
    const cached = state.images[b.src];
    if (cached?.hash === h) { media.set(b, cached); continue; }
    if (dryRun) { media.set(b, { id: `DRYRUN_${path.basename(file)}`, width: 1, height: 1, container: cached?.container }); continue; }
    const m = await uploadImage(file, `/blog-supporter/${path.basename(dir)}`);
    // 旧形式の幅の控え（container）は、同じパスの画像を差し替えても引き継ぐ
    state.images[b.src] = { ...m, hash: h, ...(cached?.container ? { container: cached.container } : {}) };
    saveState(dir, state);
    console.log(`  画像を上げた: ${b.src} (${m.width}x${m.height})`);
    media.set(b, state.images[b.src]);
  }
  return media;
}

function summarize(nodes) {
  const c = {};
  const walk = (n) => { for (const x of n) { c[x.type] = (c[x.type] ?? 0) + 1; if (x.nodes) walk(x.nodes); } };
  walk(nodes);
  return ["HEADING", "PARAGRAPH", "IMAGE", "BULLETED_LIST", "ORDERED_LIST", "BLOCKQUOTE", "DIVIDER", "CODE_BLOCK", "HTML"]
    .filter((k) => c[k]).map((k) => `${k}=${c[k]}`).join(" ");
}

const editUrl = (id) => `https://manage.wix.com/dashboard/${WIX_SITE_ID}/blog/${id}/edit`;

// ---------- 落ちる装飾と画像の点検 ----------
// 直前の pull の控えと、これから送るノードを比べ、減る装飾・消える画像・位置や幅の変わる画像を出す。
// 止めはしない。送るか、送った後に装飾を足し直すかは著者が決める

// 本文の最上位の画像を、Media の ID・幅・直前の文と一緒に並べる。直前の文は、ずれた時にどこの画像かを示すため
function imageList(nodes) {
  const list = [];
  let before = "";
  for (const n of nodes) {
    if (n.type === "IMAGE") {
      const w = n.imageData?.containerData?.width ?? {};
      list.push({ id: n.imageData?.image?.src?.id ?? "", width: w.size ?? (w.custom ? `${w.custom}px` : "既定"), before });
    } else {
      const t = plainText(n).replace(/\s+/g, " ").trim();
      if (t) before = t;
    }
  }
  return list;
}

const clip = (s, n = 30) => (s.length > n ? `${s.slice(0, n)}…` : s);

function lossReport(beforeNodes, afterNodes) {
  const lines = [];
  const lost = lostSpans(beforeNodes, afterNodes);
  if (lost.length) {
    lines.push(`減る装飾 ${lost.length}:`);
    for (const s of lost) lines.push(`  ${s.label}「${clip(s.text)}」`);
  }
  // 画像: 消える・新しく入る・位置が変わる・幅が変わる
  const before = imageList(beforeNodes);
  const after = imageList(afterNodes);
  const count = (l) => l.reduce((m, x) => m.set(x.id, (m.get(x.id) ?? 0) + 1), new Map());
  const aCount = count(after);
  const bCount = count(before);
  const gone = before.filter((x) => { const c = aCount.get(x.id); if (c) { aCount.set(x.id, c - 1); return false; } return true; });
  const added = after.filter((x) => { const c = bCount.get(x.id); if (c) { bCount.set(x.id, c - 1); return false; } return true; });
  if (gone.length) {
    lines.push(`消える画像 ${gone.length}:`);
    for (const x of gone) lines.push(`  ${clip(x.id, 14)}（直前の文「${clip(x.before)}」）`);
  }
  if (added.length) {
    lines.push(`新しく入る画像 ${added.length}:`);
    for (const x of added) lines.push(`  ${clip(x.id.replace(/^DRYRUN_/, ""), 40)}（直前の文「${clip(x.before)}」）`);
  }
  // 両方にある画像の並びを最長共通部分列で突き合わせる。そこから外れた画像が、別の位置へ動いた画像
  const bKeep = before.filter((x) => !gone.includes(x));
  const aKeep = after.filter((x) => !added.includes(x));
  const L = Array.from({ length: bKeep.length + 1 }, () => new Array(aKeep.length + 1).fill(0));
  for (let i = bKeep.length - 1; i >= 0; i--) {
    for (let j = aKeep.length - 1; j >= 0; j--) {
      L[i][j] = bKeep[i].id === aKeep[j].id ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const pairs = [];
  const moved = [];
  for (let i = 0, j = 0; i < bKeep.length || j < aKeep.length;) {
    if (i < bKeep.length && j < aKeep.length && bKeep[i].id === aKeep[j].id) { pairs.push([bKeep[i], aKeep[j]]); i++; j++; }
    else if (j >= aKeep.length || (i < bKeep.length && L[i + 1][j] >= L[i][j + 1])) moved.push(bKeep[i++]);
    else j++;
  }
  if (moved.length) {
    lines.push(`位置が変わる画像 ${moved.length}（キャプションによる割り当てのずれの疑い。送らずに本文を確かめる）:`);
    for (const x of moved) {
      const y = aKeep.find((a) => a.id === x.id);
      lines.push(`  ${clip(x.id, 14)}: 控えでは「${clip(x.before)}」の後 → 送る内容では「${clip(y?.before ?? "")}」の後`);
    }
  }
  const resized = pairs.filter(([x, y]) => x.width !== y.width);
  if (resized.length) {
    lines.push(`幅が変わる画像 ${resized.length}:`);
    for (const [x, y] of resized) lines.push(`  ${clip(x.id, 14)} ${x.width} → ${y.width}（直前の文「${clip(x.before)}」）`);
  }
  return lines;
}

// 記事の直前の pull の控え。名前は pull_{編集日時}.json なので、名前の順が新しさの順になる
function latestPull(dir) {
  const d = path.join(dir, "wix-snapshots");
  if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).filter((x) => /^pull_\d.*\.json$/.test(x)).sort().at(-1);
  return f ? path.join(d, f) : null;
}

const nodesOf = (file) => { const j = JSON.parse(fs.readFileSync(file, "utf8")); return j.richContent?.nodes ?? j.nodes ?? []; };

function printLossReport(beforeFile, afterNodes) {
  const lines = lossReport(nodesOf(beforeFile), afterNodes);
  console.log(`点検（${path.basename(beforeFile)} と比べる）: ${lines.length ? "" : "減る装飾・画像のずれは無い"}`);
  for (const l of lines) console.log(`  ${l}`);
}

// ---------- push ----------

// draft.md（AI 版）を流し込んだ下書きの目印。著者が自分の言葉で書き直したらタイトルから外す
const AI_TITLE_PREFIX = "[AI下書き] ";

async function push(file, { dryRun, update, allowPublished, acceptLoss }) {
  const src = path.resolve(file);
  const dir = path.dirname(src);
  const state = loadState(dir);
  const text = fs.readFileSync(src, "utf8");
  const { title, blocks } = parseDocument(text, { wixImages: state.wixImages, wixNodes: state.wixNodes });
  if (!title) throw new Error("先頭に # タイトル行が無い");

  let cur = null;
  if (update) {
    if (!state.draftPostId) throw new Error("この記事に結び付いた下書きが無い。新規なら --update を外す");
    cur = (await wixOk("GET", `/blog/v3/draft-posts/${state.draftPostId}?fieldsets=RICH_CONTENT`)).draftPost;
    if (cur.status !== "UNPUBLISHED" && !(cur.status === "PUBLISHED" && allowPublished)) {
      throw new Error(`下書きの状態が ${cur.status}。公開済みの記事の下書きを置き換えるなら --allow-published（予約済みは不可）`);
    }
    if (cur.editedDate !== state.syncedEditedDate) {
      throw new Error(`前回の同期（${state.syncedEditedDate ?? "なし"}）以降に Wix 側で編集されている（${cur.editedDate}）。先に pull して差分を確かめる`);
    }
  } else if (state.draftPostId && !dryRun) {
    throw new Error(`この記事には下書きが既にある（${state.draftPostId}）。置き換えるなら --update`);
  }

  const images = blocks.filter((b) => b.kind === "image");
  const legacy = blocks.filter((b) => b.kind === "legacyImage" || b.kind === "legacyNode");
  console.log(`タイトル: ${title}`);
  console.log(`本文 ${text.length} 字 / 画像 ${images.length + blocks.filter((b) => b.kind === "legacyImage").length} 枚`);
  if (legacy.length) console.log(`  旧形式の印 ${legacy.length}（<!-- 画像 -->・<!-- Wixのノード -->）を wix.json の控えで戻す。次の pull で新しい記法に置き換わる`);
  const media = await resolveMedia(images, dir, state, dryRun);
  const refs = new Set(blocks.filter((b) => b.kind === "legacyNode").map((b) => b.index));
  const missing = state.wixNodes.map((_, i) => i).filter((i) => !refs.has(i));
  if (missing.length) console.log(`  注意: Wix のノード ${missing.map((i) => `#${i}（${state.wixNodes[i].type}）`).join("・")} の印が本文に無い。push するとそのノード（CODE_BLOCK ならその中の装飾）は消える`);

  const { pool, replace } = controlReplacer(state.controls);
  const nodes = toRicos(blocks, { image: (b) => media.get(b), embeds: state.embeds, wixBlocks: state.wixBlocks, wixNodes: state.wixNodes, replace });
  console.log(`構造: ${summarize(nodes)}`);
  const restored = pool.filter((c) => c.used).length;
  if (restored) console.log(`  Markdown に書けない装飾のある段落 ${restored} を、pull の時の控えのまま送る`);
  const placeholders = blocks.filter((b) => b.raw).length;
  if (placeholders) console.log(`  未作図のプレースホルダー ${placeholders}（［画像（未作図）: …］の段落で送る）`);
  const unmatched = pool.filter((c) => !c.used);
  if (unmatched.length) {
    const msg = `pull で控えた段落のうち ${unmatched.length} が本文に見当たらない（直したか消した）。送るとこれらの装飾は消える:\n` +
      unmatched.map((c) => `    「${c.text}」（${c.lost.join("・")}）`).join("\n");
    if (dryRun) console.log(`  注意: ${msg}`);
    else if (!acceptLoss) throw new Error(`${msg}\n  Wix の画面で直すか、装飾を捨ててよければ --accept-loss を付けて push する`);
    else console.log(`  ${msg}\n  （--accept-loss で送る）`);
  }

  if (dryRun) {
    const out = path.join(dir, "wix-dryrun.json");
    fs.writeFileSync(out, JSON.stringify({ title, nodes }, null, 2));
    console.log(`dry-run: ${out}（Wix には書いていない）`);
    const prev = latestPull(dir);
    if (prev) printLossReport(prev, nodes);
    else console.log("点検: pull の控えが無いので、減る装飾・画像は比べていない");
    return;
  }

  let post;
  if (update) {
    console.log(`  上書き前の下書きを残した: ${snapshot(dir, "before-push", cur)}`);
    if (cur.status === "PUBLISHED") {
      const copy = (await wixOk("POST", "/blog/v3/draft-posts", {
        draftPost: { title: `[複製 ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}] ${cur.title}`, memberId: cur.memberId, richContent: cur.richContent },
      })).draftPost;
      console.log(`  上書き前の記事を非公開の複製として残した: ${copy.id}（${copy.title}）`);
    }
    post = (await wixOk("PATCH", `/blog/v3/draft-posts/${state.draftPostId}`, {
      draftPost: { id: state.draftPostId, richContent: { nodes } },
      action: "UPDATE",
    })).draftPost;
    console.log(`下書きの本文を置き換えた（タイトルは Wix 側のまま）`);
    if (cur.status === "PUBLISHED") console.log(`  公開済みの記事: 状態 ${post.status}／未公開の変更あり ${post.hasUnpublishedChanges}。公開版は Wix の画面で公開するまで変わらない`);
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

// ---------- pull ----------

const imageMapOf = (state) => Object.fromEntries(Object.entries(state.images).map(([src, m]) => [m.id, src]));

function describeControls(controls) {
  const c = {};
  for (const x of controls) for (const l of x.lost) c[l] = (c[l] ?? 0) + 1;
  return Object.entries(c).map(([k, v]) => `${k} ${v}`).join("・");
}

async function pull(target, { out, force, published }) {
  const dir = articleDir(target);
  const state = loadState(dir);
  if (!state.draftPostId) throw new Error("この記事に結び付いた Wix 投稿が無い。list で探して link する");
  const opts = { imageMap: imageMapOf(state), localMedia: state.images };

  if (published) {
    const p = (await wixOk("GET", `/blog/v3/posts/${state.draftPostId}?fieldsets=RICH_CONTENT&fieldsets=URL`)).post;
    const url = `${p.url.base}${p.url.path}`;
    const r = fromRicos(p.richContent.nodes, opts);
    const md = `<!-- source: ${url} / fetched: ${today()} / method: wix-sync pull --published (Blog API) -->\n\n# ${p.title}\n\n${r.md}`;
    const dest = out ? path.resolve(out) : path.join(dir, "published.md");
    fs.writeFileSync(dest, md);
    // 公開版の本文を push の元にすることもあるので、Wix の画像・埋め込み・ノードの控えは足しておく。
    // 同期時点と段落の控え（controls）は下書きの pull だけが持つ
    Object.assign(state.media, r.media);
    Object.assign(state.embeds, r.embeds);
    Object.assign(state.wixBlocks, r.wixBlocks);
    saveState(dir, state);
    console.log(`公開版を書いた: ${dest}（${md.length} 字、slug: ${p.slug}${p.hasUnpublishedChanges ? "、Wix 側に未公開の変更あり" : ""}）`);
    if (r.controls.length) console.log(`  Markdown に書けない装飾のある段落 ${r.controls.length}（${describeControls(r.controls)}）。push の元にするなら、先に下書きを pull する`);
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
  const r = fromRicos(p.richContent.nodes, opts);
  const header = `<!-- source: wix draft-post ${p.id} / fetched: ${today()} / method: wix-sync pull (Blog API) / status: ${p.status} / edited: ${p.editedDate} -->\n<!-- Wix の下書き。Wix 側が正。毎回上書き。 -->\n\n`;
  const md = `${header}# ${p.title}\n\n${r.md}`;
  fs.writeFileSync(dest, md);
  // 画像の幅は Markdown の {width=…} に書いたので、旧形式の幅の控えは捨てる（残すと属性を消した時に効いてしまう）
  for (const m of Object.values(state.images)) delete m.container;
  Object.assign(state, {
    wixImages: [], wixNodes: [], media: r.media, embeds: r.embeds, wixBlocks: r.wixBlocks,
    controls: r.controls.map(({ key, nth, lost, text, node }) => ({ key, nth, lost, text, node })),
    syncedEditedDate: p.editedDate, syncedFile: path.basename(dest), syncedHash: hash(md),
  });
  saveState(dir, state);
  const heads = (md.match(/^#{2,6} /gm) ?? []).length;
  const figs = (md.match(/^!\[/gm) ?? []).length;
  console.log(`下書きを書いた: ${dest}（${md.length} 字 / 見出し ${heads} / 図 ${figs}（うち Wix の画像 ${Object.keys(r.media).length}）/ X の埋め込み ${Object.keys(r.embeds).length} / Wix のノード ${Object.keys(r.wixBlocks).length}）`);
  if (r.controls.length) console.log(`  Markdown に書けない装飾のある段落 ${r.controls.length}（${describeControls(r.controls)}）。直さなければ push で控えのまま戻る`);
  console.log(`取得した下書きを残した: ${snap}`);
}

// ---------- 往復の検算（Wix を呼ばない） ----------

function roundtrip(file) {
  const nodes = nodesOf(file);
  if (!nodes.length) { console.log(`${path.basename(file)}: Ricos の本文が無い（飛ばす）`); return true; }
  const dir = path.dirname(path.dirname(path.resolve(file)));
  const state = loadState(dir);
  const r = fromRicos(nodes, { imageMap: imageMapOf(state), localMedia: state.images });
  const { blocks } = parseDocument(`# t\n\n${r.md}`);
  const { pool, replace } = controlReplacer(r.controls);
  const back = toRicos(blocks, {
    image: (b) => (b.src.startsWith("wix:") ? { id: b.src.slice(4), ...r.media[b.src.slice(4)] } : { ...state.images[b.src], container: undefined }),
    embeds: r.embeds, wixBlocks: r.wixBlocks, replace,
  });
  const same = canonical(back) === canonical(nodes);
  const content = nodes.filter((n) => !(n.type === "PARAGRAPH" && !plainText(n).trim())).length;
  console.log(`${path.basename(file)}: ブロック ${content} / 控え ${r.controls.length}${r.controls.length ? `（${describeControls(r.controls)}）` : ""} / ::wix ${Object.keys(r.wixBlocks).length} / 未使用の控え ${pool.filter((c) => !c.used).length} / 往復 ${same ? "一致" : "不一致"}`);
  if (!same) {
    const a = JSON.parse(canonical(nodes));
    const b = JSON.parse(canonical(back));
    const i = a.findIndex((x, k) => JSON.stringify(x) !== JSON.stringify(b[k]));
    console.log(`  最初の違い: ${i} 番目（元 ${a.length} / 往復 ${b.length}）`);
    console.log(`    元:   ${JSON.stringify(a[i]).slice(0, 300)}`);
    console.log(`    往復: ${JSON.stringify(b[i]).slice(0, 300)}`);
  }
  return same;
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

async function link(target, id, { relink } = {}) {
  const dir = articleDir(target);
  const p = (await wixOk("GET", `/blog/v3/draft-posts/${id}`)).draftPost;
  const state = loadState(dir);
  if (state.draftPostId && state.draftPostId !== id && !relink) throw new Error(`既に別の投稿（${state.draftPostId}）に結び付いている。結び付け直すなら --relink`);
  if (relink) {
    console.log(`  結び付け直し: ${state.draftPostId ?? "なし"} → ${id}。同期時点をこの投稿の現在（${p.editedDate}）にする`);
    state.syncedEditedDate = p.editedDate;
    delete state.syncedFile;
    delete state.syncedHash;
  }
  state.draftPostId = id;
  saveState(dir, state);
  console.log(`結び付けた: ${path.basename(dir)} ↔ ${id}（${p.status}）${p.title}`);
}

// ---------- 入口 ----------

const [cmd, ...args] = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--out", "--limit"].includes(args[i - 1])));
const USAGE = "usage: check | list [--limit N] | link <記事> <postId> [--relink] | push <file.md> [--dry-run|--update [--allow-published] [--accept-loss]] | pull <記事> [--out <file>] [--force] [--published] | compare <前.json> <後.json> | roundtrip <控え.json>...";

try {
  if (cmd === "check") await check();
  else if (cmd === "list") await list(Number(opt("--limit") ?? 10));
  else if (cmd === "link" && pos.length === 2) await link(pos[0], pos[1], { relink: flag("--relink") });
  else if (cmd === "push" && pos[0]) await push(pos[0], { dryRun: flag("--dry-run"), update: flag("--update"), allowPublished: flag("--allow-published"), acceptLoss: flag("--accept-loss") });
  else if (cmd === "compare" && pos.length === 2) printLossReport(pos[0], nodesOf(pos[1]));
  else if (cmd === "roundtrip" && pos.length) { const ok = pos.map(roundtrip).every(Boolean); if (!ok) process.exitCode = 1; }
  else if (cmd === "pull" && pos[0]) await pull(pos[0], { out: opt("--out"), force: flag("--force"), published: flag("--published") });
  else { console.error(USAGE); process.exit(2); }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}

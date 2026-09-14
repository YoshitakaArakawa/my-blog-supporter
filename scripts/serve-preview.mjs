#!/usr/bin/env node
/**
 * serve-preview.mjs — リポジトリを静的配信する最小のローカルサーバー
 *
 * 用途: output/{記事}/preview/index.html や revision/index.html を、図（images/*.png）込みで
 * ブラウザに表示する。file:// では相対パスの画像が読めない環境があるため、http で配る。
 *
 * 使い方:
 *   node scripts/serve-preview.mjs [--port 8765] [--root .]
 *   → http://localhost:8765/output/{記事}/preview/index.html
 *
 * 依存: Node 標準モジュールのみ。ディレクトリを開くと index.html を返す。
 * ルート外へのパス（..）は拒否する。ローカル専用（127.0.0.1 にのみ bind）。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let port = 8765;
let root = path.resolve(SCRIPT_DIR, "..");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port") port = Number(args[++i]);
  else if (args[i] === "--root") root = path.resolve(args[++i]);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  const abs = path.resolve(root, "." + rel);
  if (!abs.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }

  let file = abs;
  try {
    const st = fs.statSync(file);
    if (st.isDirectory()) {
      if (!rel.endsWith("/")) { res.writeHead(302, { Location: rel + "/" }); res.end(); return; }
      file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        const list = fs.readdirSync(abs).map((n) => `<li><a href="${encodeURIComponent(n)}">${n}</a></li>`).join("");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<meta charset="utf-8"><h1>${rel}</h1><ul>${list}</ul>`);
        return;
      }
    }
  } catch {
    res.writeHead(404); res.end("not found"); return;
  }

  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://localhost:${port}/`);
});

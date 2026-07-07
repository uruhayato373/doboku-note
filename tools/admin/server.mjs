/**
 * doboku-note 運営管理画面 — ローカル専用サーバー（デプロイなし・依存追加なし）。
 *
 * Usage:
 *   npm run admin   →  http://127.0.0.1:3021
 *
 * ルート:
 *   /             … public/ の SPA シェル（Vanilla JS・no-build）
 *   /media/*      … .local/r2/posts | docs/sns | docs/note の画像/動画（lib/media.mjs）
 *   /api/gallery/{ogp|figures|note|sns} … ギャラリー走査 JSON（lib/scan.mjs）
 *   /api/sns/board                      … SNS 投稿状態板 JSON（lib/sot.mjs）
 *
 * 127.0.0.1 バインドのみ（LAN 非公開）。書き込み API は無し（Phase 3 で
 * 既存 CLI の child_process 実行として追加予定 — 直接 fs 書き込みはしない方針）。
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, resolve, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveMedia } from "./lib/media.mjs";
import { scanOgp, scanFigures, scanNoteImages, scanSnsPacks } from "./lib/scan.mjs";
import { snsBoard } from "./lib/sot.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(join(HERE, "public"));
const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_PORT || 3021);

const STATIC_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

// 走査はフルスキャン（数千ファイル）なので短い TTL でキャッシュ。?refresh=1 で強制再走査。
const cache = new Map(); // key → { at, data }
const TTL_MS = 60_000;

async function cached(key, fn, refresh) {
  const hit = cache.get(key);
  if (!refresh && hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(data));
}

async function handleApi(req, res, url) {
  const refresh = url.searchParams.has("refresh");
  try {
    switch (url.pathname) {
      case "/api/gallery/ogp":
        return sendJson(res, 200, await cached("ogp", scanOgp, refresh));
      case "/api/gallery/figures":
        return sendJson(res, 200, await cached("figures", scanFigures, refresh));
      case "/api/gallery/note":
        return sendJson(res, 200, await cached("note", scanNoteImages, refresh));
      case "/api/gallery/sns":
        return sendJson(res, 200, await cached("sns", scanSnsPacks, refresh));
      case "/api/sns/board":
        return sendJson(res, 200, await cached("board", snsBoard, refresh));
      default:
        return sendJson(res, 404, { error: "not found" });
    }
  } catch (err) {
    console.error(`[admin] API error ${url.pathname}:`, err);
    return sendJson(res, 500, { error: String(err?.message || err) });
  }
}

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  const full = resolve(join(PUBLIC, rel));
  if (full !== PUBLIC && !full.startsWith(PUBLIC + sep)) {
    res.writeHead(403);
    return res.end("403");
  }
  if (!existsSync(full) || !statSync(full).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("404 Not Found");
  }
  const mime = STATIC_MIME[extname(full).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
  createReadStream(full).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "read-only server (Phase 0-2)" });
  }
  if (serveMedia(req, res)) return;
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`[admin] doboku-note 管理画面 → http://${HOST}:${PORT}`);
  console.log(`[admin] ローカル専用（${HOST} バインド・デプロイなし）。Ctrl+C で終了`);
});

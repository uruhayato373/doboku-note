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
 *   /api/quality                        … コンテンツ品質集計 JSON（lib/quality.mjs）
 *   /api/actions                        … 実行可能アクション一覧（GET）
 *   /api/job/run   (POST, SSE)          … アクション実行 + ログストリーム（lib/jobs.mjs）
 *   /api/job/status (GET)               … 実行中ジョブ状態
 *
 * 127.0.0.1 バインドのみ（LAN 非公開）。POST は Origin=127.0.0.1 検査 +
 * X-Admin ヘッダ必須（他サイトからの drive-by POST を遮断）。書き込みは
 * 既存 CLI の child_process 実行に一本化（直接 fs 書き込みしない）。
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, resolve, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveMedia } from "./lib/media.mjs";
import { scanOgp, scanFigures, scanNoteImages, scanSnsPacks } from "./lib/scan.mjs";
import { snsBoard } from "./lib/sot.mjs";
import { ACTIONS, startJob, jobStatus } from "./lib/jobs.mjs";
import { articlesIndex, magazines, noteArticles } from "./lib/content.mjs";
import { salesSummary } from "./lib/sales.mjs";
import { qualitySummary } from "./lib/quality.mjs";

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
      case "/api/content/articles":
        return sendJson(res, 200, await cached("articles", articlesIndex, refresh));
      case "/api/content/magazines":
        return sendJson(res, 200, await cached("magazines", magazines, refresh));
      case "/api/content/note":
        return sendJson(res, 200, await cached("note-articles", noteArticles, refresh));
      case "/api/sales":
        return sendJson(res, 200, await cached("sales", salesSummary, refresh));
      case "/api/quality":
        return sendJson(res, 200, await cached("quality", qualitySummary, refresh));
      case "/api/actions":
        return sendJson(res, 200, {
          actions: Object.entries(ACTIONS).map(([id, a]) => ({
            id, label: a.label, needsBrowser: a.needsBrowser, supportsCommit: a.supportsCommit,
          })),
        });
      case "/api/job/status":
        return sendJson(res, 200, jobStatus());
      default:
        return sendJson(res, 404, { error: "not found" });
    }
  } catch (err) {
    console.error(`[admin] API error ${url.pathname}:`, err);
    return sendJson(res, 500, { error: String(err?.message || err) });
  }
}

// ─── POST（CSRF ガード + ジョブ実行）────────────────────────
// localhost への drive-by POST を防ぐ: Origin が admin 自身 + カスタムヘッダ必須。
function csrfOk(req) {
  const origin = req.headers["origin"];
  const okOrigin = !origin || origin === `http://${HOST}:${PORT}` || origin === `http://localhost:${PORT}`;
  const okHeader = req.headers["x-admin"] === "1";
  return okOrigin && okHeader;
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
      if (buf.length > limit) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

async function handlePost(req, res, url) {
  if (!csrfOk(req)) return sendJson(res, 403, { error: "CSRF guard: Origin/X-Admin 不正" });
  if (url.pathname !== "/api/job/run") return sendJson(res, 404, { error: "not found" });

  let payload;
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return sendJson(res, 400, { error: "invalid JSON" });
  }

  let job;
  try {
    job = startJob({ action: payload.action, mode: payload.mode || "dry", params: payload.params || {} });
  } catch (err) {
    return sendJson(res, 409, { error: String(err?.message || err) });
  }

  // SSE でログをストリーム
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  // 既に流れたバッファを再送してから購読
  for (const line of job.buffer) res.write(`data: ${JSON.stringify(line)}\n\n`);
  if (job.done) return res.end();
  job.subscribers.add(res);
  req.on("close", () => job.subscribers.delete(res));
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
  if (req.method === "POST") {
    try {
      return await handlePost(req, res, url);
    } catch (err) {
      console.error("[admin] POST error:", err);
      return sendJson(res, 500, { error: String(err?.message || err) });
    }
  }
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "method not allowed" });
  }
  if (serveMedia(req, res)) return;
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`[admin] doboku-note 管理画面 → http://${HOST}:${PORT}`);
  console.log(`[admin] ローカル専用（${HOST} バインド・デプロイなし）。Ctrl+C で終了`);
});

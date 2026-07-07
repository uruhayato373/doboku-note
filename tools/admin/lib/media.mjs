/**
 * media.mjs — /media/* をリポジトリ内 3 ルートへマッピングする static serve。
 *
 *   /media/posts/... → .local/r2/posts/...
 *   /media/sns/...   → docs/sns/...
 *   /media/note/...  → docs/note/...
 *
 * path.resolve 後に許可ルートの startsWith 検査（traversal ガード）。
 * ローカル専用サーバー（127.0.0.1）だが、他サイトからの drive-by 読み出しを
 * 想定して許可ルート外は一律 403。
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, resolve, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));

export const MEDIA_ROOTS = {
  posts: resolve(join(ROOT, ".local", "r2", "posts")),
  sns: resolve(join(ROOT, "docs", "sns")),
  note: resolve(join(ROOT, "docs", "note")),
};

const MIME = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

/** /media/{root}/{rel} を解決。許可ルート外・非対応拡張子は null を返す。 */
export function resolveMediaPath(urlPath) {
  const m = /^\/media\/(posts|sns|note)\/(.+)$/.exec(urlPath);
  if (!m) return null;
  const base = MEDIA_ROOTS[m[1]];
  const rel = decodeURIComponent(m[2]);
  const full = resolve(join(base, rel));
  if (full !== base && !full.startsWith(base + sep)) return null; // traversal
  const mime = MIME[extname(full).toLowerCase()];
  if (!mime) return null;
  return { full, mime };
}

/** /media/* リクエストを処理。担当外 URL なら false を返す。 */
export function serveMedia(req, res) {
  if (!req.url.startsWith("/media/")) return false;
  const hit = resolveMediaPath(req.url.split("?")[0]);
  if (!hit) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return true;
  }
  if (!existsSync(hit.full) || !statSync(hit.full).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return true;
  }
  res.writeHead(200, {
    "Content-Type": hit.mime,
    "Content-Length": statSync(hit.full).size,
    "Cache-Control": "no-cache",
  });
  createReadStream(hit.full).pipe(res);
  return true;
}

// 開発サーバー（npm run dev）が一緒に起動する手元の画像サーバー（ポート 3022）。next.config.mjs が /posts/* をここへ転送する。
// 手元の content/site/ に画像があればそれを返し、無ければ R2 の公開 URL から取って返す（2026-11-26。写真・OGP は git に無いので、
// 以前は手元で全部「ローカル画像がありません」になっていた）。R2 に届かない（会社のプロキシなど）・R2 にも無いときだけ代わりの絵。
// R2 を見に行かせたくないときは LOCAL_MEDIA_OFFLINE=1。取ってきた画像は書き戻さない（作業ツリーを汚さない）。
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { REPO_ROOT as repoRoot } from '../lib/repository-paths.mjs';
import { R2_PUBLIC_ORIGIN } from '../lib/site-identity.mjs';

const postsRoot = resolve(repoRoot, 'content', 'site');
const placeholder = resolve(repoRoot, 'public', 'images', 'local-media-missing.svg');
const port = Number(process.env.LOCAL_MEDIA_PORT || 3022);
const offline = process.env.LOCAL_MEDIA_OFFLINE === '1';
const R2_TIMEOUT_MS = 5000;

const MIME = new Map([
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
]);

function sendFile(req, res, file, contentType, fallback = false) {
  const stat = statSync(file);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': String(stat.size),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(fallback ? { 'X-Local-Media-Fallback': 'missing' } : {}),
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

/** R2 から取って返す。取れたら true（届かない・無いときは false で、呼び出し側が代わりの絵を返す） */
async function sendFromR2(req, res, pathname, contentType) {
  if (offline) return false;
  try {
    const upstream = await fetch(`${R2_PUBLIC_ORIGIN}${pathname}`, { signal: AbortSignal.timeout(R2_TIMEOUT_MS) });
    if (!upstream.ok) return false;
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, {
      'Content-Type': upstream.headers.get('content-type') || contentType,
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Local-Media-Source': 'r2',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  if (!pathname.startsWith('/posts/')) {
    res.writeHead(404);
    return res.end('Not Found');
  }

  const rel = pathname.slice('/posts/'.length).replaceAll('/', sep);
  const full = resolve(postsRoot, rel);
  const insideRoot = full.startsWith(postsRoot + sep);
  const contentType = MIME.get(extname(full).toLowerCase());

  if (insideRoot && contentType && existsSync(full) && statSync(full).isFile()) {
    return sendFile(req, res, full, contentType);
  }
  // ローカルに派生画像がまだなくても原本があれば利用する。
  const original = full.replace(/ogp-thumb-(248|336|640)\.webp$/, 'ogp.png');
  if (insideRoot && original !== full && existsSync(original)) {
    return sendFile(req, res, original, 'image/png');
  }
  if (insideRoot && contentType && (await sendFromR2(req, res, pathname, contentType))) return;
  return sendFile(req, res, placeholder, 'image/svg+xml; charset=utf-8', true);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[local-media] http://127.0.0.1:${port}/posts/* -> content/site/*${offline ? '' : ` (無ければ ${R2_PUBLIC_ORIGIN})`}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

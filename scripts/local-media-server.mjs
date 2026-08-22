import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const postsRoot = resolve(repoRoot, 'content', 'site');
const placeholder = resolve(repoRoot, 'public', 'images', 'local-media-missing.svg');
const port = Number(process.env.LOCAL_MEDIA_PORT || 3022);

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

const server = createServer((req, res) => {
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
  return sendFile(req, res, placeholder, 'image/svg+xml; charset=utf-8', true);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[local-media] http://127.0.0.1:${port}/posts/* -> content/site/*`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
